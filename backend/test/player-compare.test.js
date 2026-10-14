const assert = require('node:assert/strict');
const test = require('node:test');
const { BadRequestException, HttpException, NotFoundException } = require('@nestjs/common');
const { PlayerCompareService } = require('../dist/modules/player-compare/player-compare.service');

const request = (nicknames) => ({ nicknames, seasonId: 39, matchingMode: 3 });
const stats = (nickname, value = { totalGames: 10 }) => ({
  nickname, seasonId: 39, matchingMode: 3, source: 'bser_official',
  stats: value, fetchedAt: value ? '2026-10-14T00:00:00.000Z' : null, isStale: false,
});

test('compares three users concurrently while preserving input order', async () => {
  const pending = new Map();
  const service = new PlayerCompareService({
    getStats: (nickname, season, mode) => {
      assert.equal(season, '39');
      assert.equal(mode, '3');
      return new Promise((resolve) => pending.set(nickname, resolve));
    },
  });
  const responsePromise = service.compare(request([' 첫째 ', '둘째', '셋째']));
  assert.equal(pending.size, 3);
  pending.get('셋째')(stats('셋째'));
  pending.get('둘째')(stats('둘째', null));
  pending.get('첫째')(stats('첫째'));
  const response = await responsePromise;
  assert.deepEqual(response.results.map(({ input, status }) => [input, status]), [
    ['첫째', 'ok'], ['둘째', 'no_stats'], ['셋째', 'ok'],
  ]);
  assert.deepEqual(response.summary, { requested: 3, ok: 2, failed: 1 });
  assert.equal(response.results[0].source, 'bser_official');
  assert.equal(response.results[1].stats, null);
});

test('one missing player or upstream failure does not discard successful results', async () => {
  const service = new PlayerCompareService({
    getStats: async (nickname) => {
      if (nickname === '없음') throw new NotFoundException({ code: 'PLAYER_NOT_FOUND' });
      if (nickname === '제한') throw new HttpException({ code: 'BSER_RATE_LIMITED' }, 429);
      return stats(nickname);
    },
  });
  const response = await service.compare(request(['정상', '없음', '제한']));
  assert.deepEqual(response.results.map(({ status, code }) => [status, code]), [
    ['ok', undefined], ['not_found', 'PLAYER_NOT_FOUND'], ['error', 'BSER_RATE_LIMITED'],
  ]);
  assert.deepEqual(response.summary, { requested: 3, ok: 1, failed: 2 });
});

test('case-insensitive duplicates are searched once, preserving the first spelling', async () => {
  const calls = [];
  const service = new PlayerCompareService({
    getStats: async (nickname) => {
      calls.push(nickname);
      return stats(nickname);
    },
  });
  const response = await service.compare(request([' Alpha ', 'alpha', 'BETA']));
  assert.deepEqual(calls, ['Alpha', 'BETA']);
  assert.deepEqual(response.results.map(({ input }) => input), ['Alpha', 'BETA']);
  assert.equal(response.summary.requested, 2);
});

test('invalid request is rejected before any player lookup', async () => {
  let calls = 0;
  const service = new PlayerCompareService({ getStats: async () => { calls += 1; } });
  for (const body of [
    null, request([]), request(['a', 'b', 'c', 'd']), request(['  ']),
    request(['valid', 1]), request(['bad\nname']),
    { ...request(['one']), seasonId: 0 },
    { ...request(['one']), seasonId: '39' },
    { ...request(['one']), matchingMode: 1 },
  ]) {
    await assert.rejects(service.compare(body), (error) => error instanceof BadRequestException);
  }
  assert.equal(calls, 0);
});

test('simultaneous comparisons reuse the single-player service upstream refresh', async () => {
  const { PlayerSeasonStatsService } = require('../dist/modules/player-season-stats/player-season-stats.service');
  let userCalls = 0;
  let statsCalls = 0;
  let lookup = null;
  let snapshot = null;
  const single = new PlayerSeasonStatsService({
    findByNicknameKey: async () => lookup,
    findSnapshot: async () => snapshot,
    saveResult: async (nickname, _key, providerUid, _season, _mode, result, fetchedAt) => {
      lookup = { id: '1', nickname, providerUid };
      snapshot = { stats: result, fetchedAt };
    },
  }, {
    findUserByNicknameDetailed: async () => {
      userCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { status: 'found', user: { nickname: '테스터', userId: 'uid' } };
    },
    fetchUserStatsDetailed: async () => {
      statsCalls += 1;
      return { status: 'found', stats: {
        seasonId: 39, matchingMode: 3, matchingTeamMode: 3,
        totalGames: 10, totalWins: 2, averageRank: 2.4,
      } };
    },
  }, { get: () => undefined });
  const service = new PlayerCompareService(single);
  const [first, second] = await Promise.all([
    service.compare(request(['테스터'])),
    service.compare(request(['테스터'])),
  ]);
  assert.equal(first.results[0].status, 'ok');
  assert.deepEqual(second, first);
  assert.equal(userCalls, 1);
  assert.equal(statsCalls, 1);
});

test('three uncached players make at most one lookup and one stats call each', async () => {
  const { PlayerSeasonStatsService } = require('../dist/modules/player-season-stats/player-season-stats.service');
  const lookups = [];
  const statsCalls = [];
  const single = new PlayerSeasonStatsService({
    findByNicknameKey: async () => null,
    findSnapshot: async () => null,
    saveResult: async () => {},
  }, {
    findUserByNicknameDetailed: async (nickname) => {
      lookups.push(nickname);
      return { status: 'found', user: { nickname, userId: nickname } };
    },
    fetchUserStatsDetailed: async (userId) => {
      statsCalls.push(userId);
      return { status: 'found', stats: {
        seasonId: 39, matchingMode: 3, matchingTeamMode: 3,
        totalGames: 10, totalWins: 2, averageRank: 2.4,
      } };
    },
  }, { get: () => undefined });
  const response = await new PlayerCompareService(single).compare(request(['A', 'B', 'C']));
  assert.deepEqual(response.summary, { requested: 3, ok: 3, failed: 0 });
  assert.deepEqual(lookups, ['A', 'B', 'C']);
  assert.deepEqual(statsCalls, ['A', 'B', 'C']);
});

test('NestJS exposes POST /v1/players/compare and validates request body', async () => {
  require('reflect-metadata');
  const { Module } = require('@nestjs/common');
  const { NestFactory } = require('@nestjs/core');
  const { PlayerCompareController } = require('../dist/modules/player-compare/player-compare.controller');
  const calls = [];
  const service = new PlayerCompareService({
    getStats: async (...args) => {
      calls.push(args);
      return stats('테스터');
    },
  });
  class TestModule {}
  Module({
    controllers: [PlayerCompareController],
    providers: [{ provide: PlayerCompareService, useValue: service }],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  try {
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address();
    const response = await fetch(`http://127.0.0.1:${port}/v1/players/compare`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request(['테스터'])),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).seasonId, 39);
    assert.deepEqual(calls, [['테스터', '39', '3']]);
    const invalid = await fetch(`http://127.0.0.1:${port}/v1/players/compare`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request([])),
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).code, 'INVALID_NICKNAMES');
    assert.equal(calls.length, 1);
  } finally {
    await app.close();
  }
});
