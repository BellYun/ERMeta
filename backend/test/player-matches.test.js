const assert = require('node:assert/strict');
const test = require('node:test');
const { PlayerMatchesService } = require('../dist/modules/player-matches/player-matches.service');
const { PlayerMatchesRepository } = require('../dist/modules/player-matches/player-matches.repository');
const { BserApiService } = require('../dist/modules/collect/bser-api.service');

function sampleGame(gameId = 10, startDtm = '2026-10-12T10:00:00+09:00') {
  return {
    gameId, seasonId: 39, matchingMode: 3, matchingTeamMode: 3,
    startDtm, characterNum: 1, bestWeapon: 2,
    gameRank: 1, playerKill: 3, playerAssistant: 4,
  };
}

function fixture(initialLookup = null, games = [sampleGame()]) {
  let lookup = initialLookup;
  let saved = [];
  let saveCount = 0;
  let externalCalls = 0;
  const repository = {
    findByNicknameKey: async () => lookup,
    saveSnapshot: async (nickname, _key, providerUid, matches, syncedAt) => {
      saveCount += 1;
      saved = matches;
      lookup = { id: '1', nickname, providerUid, matchesSyncedAt: syncedAt };
    },
    listMatches: async (_id, limit, cursor) => {
      const filtered = cursor
        ? saved.filter((match) => match.startedAt < cursor.startedAt ||
          (match.startedAt.getTime() === cursor.startedAt.getTime() && String(match.gameId) < cursor.gameId))
        : saved;
      return {
        matches: filtered.slice(0, limit).map((match) => ({ ...match, gameId: String(match.gameId) })),
        hasMore: filtered.length > limit,
      };
    },
  };
  const bser = {
    findUserByNicknameDetailed: async () => {
      externalCalls += 1;
      return { status: 'found', user: { nickname: '테스터', userId: 'temporary-uid' } };
    },
    fetchUserMatchesDetailed: async () => ({ status: 'found', games }),
  };
  const config = { get: () => undefined };
  return {
    service: new PlayerMatchesService(repository, bser, config),
    repository, bser,
    get saveCount() { return saveCount; },
    get externalCalls() { return externalCalls; },
  };
}

test('recent games are validated, sorted, paged, and reused while fresh', async () => {
  const f = fixture(null, [sampleGame(10), sampleGame(11), sampleGame(12, '2026-10-11T10:00:00+09:00')]);
  const first = await f.service.getMatches(' 테스터 ', '1');
  assert.equal(first.matches[0].gameId, '11');
  assert.equal(first.matches[0].startedAt, '2026-10-12T01:00:00.000Z');
  assert.ok(first.nextCursor);
  const second = await f.service.getMatches('테스터', '1', first.nextCursor);
  assert.equal(second.matches[0].gameId, '10');
  assert.equal(f.saveCount, 1);
  assert.equal(f.externalCalls, 1);
});

test('upstream outage returns stale saved data and fails without it', async () => {
  const old = new Date(Date.now() - 600_000);
  const f = fixture({ id: '1', nickname: '테스터', providerUid: 'uid', matchesSyncedAt: old });
  f.bser.findUserByNicknameDetailed = async () => ({ status: 'unavailable', statusCode: 503 });
  const response = await f.service.getMatches('테스터');
  assert.equal(response.isStale, true);
  assert.equal(response.lastSyncedAt, old.toISOString());

  const missing = fixture();
  missing.bser.findUserByNicknameDetailed = async () => ({ status: 'unavailable', statusCode: 503 });
  await assert.rejects(missing.service.getMatches('테스터'), (error) => error.status === 502);
});

test('unknown player, empty history and invalid query have distinct results', async () => {
  const f = fixture(null, []);
  const empty = await f.service.getMatches('테스터');
  assert.deepEqual(empty.matches, []);
  assert.equal(empty.isStale, false);
  assert.equal(empty.lastSyncedAt.length > 0, true);
  await assert.rejects(f.service.getMatches('테스터', '0'), (error) => error.status === 400);
  await assert.rejects(f.service.getMatches('테스터', '20', 'broken'), (error) => error.status === 400);

  const unknown = fixture();
  unknown.bser.findUserByNicknameDetailed = async () => ({ status: 'not_found' });
  await assert.rejects(unknown.service.getMatches('없는유저'), (error) => error.status === 404);
});

test('concurrent requests for the same nickname share one refresh', async () => {
  const f = fixture();
  const original = f.bser.findUserByNicknameDetailed;
  f.bser.findUserByNicknameDetailed = async (...args) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return original(...args);
  };
  const [first, second] = await Promise.all([
    f.service.getMatches('테스터'),
    f.service.getMatches('테스터'),
  ]);
  assert.equal(first.matches.length, 1);
  assert.equal(second.matches.length, 1);
  assert.equal(f.externalCalls, 1);
  assert.equal(f.saveCount, 1);
});

test('repository rolls back when a record insert fails', async () => {
  const queries = [];
  let released = false;
  const client = {
    query: async (sql) => {
      queries.push(sql);
      if (sql.startsWith('SELECT id, provider_uid')) return { rows: [] };
      if (sql.includes('INSERT INTO player_history.player_lookups')) return { rows: [{ id: '1' }] };
      if (sql.includes('INSERT INTO player_history.player_match_records')) throw new Error('constraint failed');
      return { rows: [] };
    },
    release: () => { released = true; },
  };
  const repository = new PlayerMatchesRepository({ getPool: () => ({ connect: async () => client }) });
  const game = {
    gameId: 10, seasonId: 39, matchingMode: 3, matchingTeamMode: 3,
    startedAt: new Date(), characterCode: 1, weaponCode: 2, rank: 1, kills: 0, assists: 0,
  };
  await assert.rejects(repository.saveSnapshot('테스터', '테스터', 'uid', [game], new Date()));
  assert.ok(queries.includes('ROLLBACK'));
  assert.equal(queries.some((sql) => sql.includes('SET matches_synced_at')), false);
  assert.equal(released, true);
});

test('official UID field is accepted by the shared BSER client', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    status: 200, ok: true,
    json: async () => ({ code: 200, user: { uid: 'temporary-uid', nickname: '테스터' } }),
  });
  try {
    const config = { get: (key, fallback) => key === 'BSER_API_KEY' ? 'test-key' : key === 'BSER_API_RATE_LIMIT_RPS' ? 0 : fallback };
    const bser = new BserApiService(config);
    const result = await bser.findUserByNicknameDetailed('테스터');
    assert.equal(result.user.userId, 'temporary-uid');
  } finally {
    global.fetch = originalFetch;
  }
});
