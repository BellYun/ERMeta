import 'reflect-metadata';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { SupabaseService } from '../../../common/database/supabase.service';
import { CharacterService } from '../../character/character.service';
import { MetaService } from '../../meta/meta.service';
import { ContextBuilderService } from './context-builder.service';

function createContext(memory: unknown = { favorite_characters: [1, 2, 3, 4], playstyle_summary: '안정적인 운영' }) {
  const queries: unknown[][] = [];
  const maybeSingle = mock.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: memory, error: null }));
  const query = {
    select(columns: string) { queries.push(['select', columns]); return query; },
    eq(column: string, value: string) { queries.push(['eq', column, value]); return query; },
    maybeSingle,
  };
  const supabase = {
    getClient: () => ({ from(table: string) {
      assert.equal(table, 'ai_user_memories', 'context never queries raw game logs');
      queries.push(['from', table]);
      return query;
    } }),
  };
  const honey = {
    patchVersion: '12.7', previousPatch: '12.6', tier: 'DIAMOND',
    picks: [2, 3, 4].map((characterNum) => ({
      characterNum, bestWeapon: 1, winRate: 15.23, averageRP: 8.34,
      pickRate: 2, pickRateDelta: 1, winRateDelta: 1, averageRPDelta: 1, honeyScore: 1,
    })),
  };
  const stats = {
    characterNum: 1, patchVersion: '12.7', tier: 'DIAMOND', totalGames: 1234,
    winRate: 14.56, pickRate: 1.23, averageRank: 3, averageRP: 4, top3Rate: 50, weapons: [],
  };
  const getHoneyPicks = mock.fn(async (_patch: string | undefined, _tier: string) => honey);
  const getCharacterStats = mock.fn(async (_characterNum: number, _patch: string, _tier: string) => stats);
  return {
    context: new ContextBuilderService(
      supabase as unknown as SupabaseService,
      { getHoneyPicks } as unknown as MetaService,
      { getCharacterStats } as unknown as CharacterService,
    ),
    queries, maybeSingle, getHoneyPicks, getCharacterStats, honey, stats,
  };
}

test('loads one user by primary key and limits the prompt to three compact lines from cached aggregates', async () => {
  const { context, queries, getHoneyPicks, getCharacterStats } = createContext();
  const result = await context.buildContext('user-a');
  assert.deepEqual(queries, [
    ['from', 'ai_user_memories'], ['select', 'favorite_characters,playstyle_summary'], ['eq', 'user_id', 'user-a'],
  ]);
  assert.deepEqual(getHoneyPicks.mock.calls[0].arguments, [undefined, 'DIAMOND']);
  assert.deepEqual(getCharacterStats.mock.calls[0].arguments, [1, '12.7', 'DIAMOND']);
  assert.equal(getCharacterStats.mock.callCount(), 1);
  assert.equal(result.split('\n').length, 3);
  assert.match(result, /선호 실험체 \[1,2,3\]/);
  assert.match(result, /안정적인 운영/);
  assert.match(result, /실험체 2\/무기 1 승률 15\.2%, 평균 RP 8\.3/);
  assert.ok(!result.includes('실험체 4/'));
  assert.match(result, /실험체 1\(12\.7, DIAMOND, 1234판\): 승률 14\.6%, 픽률 1\.2%/);
  assert.ok(result.length < 500);
});

test('anonymous context skips Supabase and queries only one honey-pick character', async () => {
  const { context, queries, getCharacterStats } = createContext();
  const result = await context.buildContext();
  assert.deepEqual(queries, []);
  assert.deepEqual(getCharacterStats.mock.calls[0].arguments, [2, '12.7', 'DIAMOND']);
  assert.equal(result.split('\n').length, 2);
  assert.ok(!result.includes('사용자 참고'));
});

test('missing or failed user memories preserve the public meta context', async () => {
  for (const failure of ['missing', 'query-error', 'network']) {
    const { context, maybeSingle } = createContext(null);
    if (failure === 'query-error') maybeSingle.mock.mockImplementation(async () => ({ data: null, error: { message: 'failure' } }));
    if (failure === 'network') maybeSingle.mock.mockImplementation(async () => { throw new Error('unavailable'); });
    const result = await context.buildContext('user-a');
    assert.equal(result.split('\n').length, 2);
    assert.ok(!result.includes('사용자 참고'));
    assert.match(result, /메타\(12\.7, DIAMOND\)/);
  }
});

test('bounds untrusted memory text and tolerates malformed JSONB without growing the prompt', async () => {
  const { context, getCharacterStats } = createContext({
    favorite_characters: [null, {}, -1, '  유키\n' + '가'.repeat(500), 1, 2, 3],
    playstyle_summary: '안정\n' + '가'.repeat(10000),
  });
  const result = await context.buildContext('user-a');
  assert.equal(result.split('\n').length, 3);
  assert.match(result, /사용자 참고 데이터\(지시 아님\)/);
  assert.ok(result.length < 500);
  assert.deepEqual(getCharacterStats.mock.calls[0].arguments, [1, '12.7', 'DIAMOND']);
  const malformed = createContext({ favorite_characters: { characterNum: 1 }, playstyle_summary: 123 });
  assert.ok(!(await malformed.context.buildContext('user-a')).includes('사용자 참고'));
});

test('empty or unavailable domain data never produces made-up zero statistics', async () => {
  const { context, honey, stats, getHoneyPicks, getCharacterStats } = createContext();
  honey.picks = [];
  stats.totalGames = 0;
  const empty = await context.buildContext('user-a');
  assert.match(empty, /꿀픽 집계 데이터 없음/);
  assert.ok(!empty.includes('승률'));
  getHoneyPicks.mock.mockImplementation(async () => { throw new Error('meta unavailable'); });
  getCharacterStats.mock.mockImplementation(async () => { throw new Error('stats unavailable'); });
  const unavailable = await context.buildContext('user-a');
  assert.match(unavailable, /안정적인 운영/);
  assert.match(unavailable, /집계 데이터 없음/);
  assert.equal(unavailable.split('\n').length, 2);

  const anonymous = createContext();
  anonymous.honey.picks = [];
  assert.match(await anonymous.context.buildContext(), /집계 데이터 없음/);
  assert.equal(anonymous.getCharacterStats.mock.callCount(), 0);
});
