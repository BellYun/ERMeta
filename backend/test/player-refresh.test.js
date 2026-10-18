const assert = require('node:assert/strict');
const test = require('node:test');
const { HttpException, NotFoundException } = require('@nestjs/common');
const { PlayerMatchesService } = require('../dist/modules/player-matches/player-matches.service');
const { PlayerSeasonStatsService } = require('../dist/modules/player-season-stats/player-season-stats.service');
const { PlayerRefreshService } = require('../dist/modules/player-refresh/player-refresh.service');

const body = { seasonId: 39, matchingMode: 3 };

test('explicit match refresh bypasses a fresh TTL and fails instead of serving stale data', async () => {
  const originalSyncedAt = new Date();
  let lookup = { id: '1', nickname: '테스터', matchesSyncedAt: originalSyncedAt };
  let calls = 0;
  let saves = 0;
  const bser = {
    findUserByNicknameDetailed: async () => {
      calls += 1;
      return { status: 'found', user: { nickname: '테스터', userId: 'uid' } };
    },
    fetchUserMatchesDetailed: async () => ({ status: 'found', games: [] }),
  };
  const service = new PlayerMatchesService({
    findByNicknameKey: async () => lookup,
    listMatches: async () => ({ matches: [], hasMore: false }),
    saveSnapshot: async (nickname, _key, _games, syncedAt) => {
      saves += 1;
      lookup = { ...lookup, nickname, matchesSyncedAt: syncedAt };
    },
  }, bser, { get: () => undefined });

  await service.getMatches('테스터');
  assert.equal(calls, 0);
  const updated = await service.refreshMatches(' 테스터 ');
  assert.equal(updated.nickname, '테스터');
  assert.equal(updated.lastSyncedAt, lookup.matchesSyncedAt.toISOString());
  assert.equal(calls, 1);
  assert.equal(saves, 1);

  const savedAt = lookup.matchesSyncedAt;
  bser.findUserByNicknameDetailed = async () => ({ status: 'unavailable', statusCode: 503 });
  await assert.rejects(service.refreshMatches('테스터'), (error) => {
    assert.equal(error.status, 502);
    assert.equal(error.getResponse().code, 'BSER_UNAVAILABLE');
    return true;
  });
  assert.equal(lookup.matchesSyncedAt, savedAt);
  assert.equal(saves, 1);
});

test('explicit season refresh bypasses a fresh TTL and preserves an old snapshot on failure', async () => {
  const old = { stats: { totalGames: 7 }, fetchedAt: new Date() };
  let snapshot = old;
  let calls = 0;
  let saves = 0;
  const bser = {
    findUserByNicknameDetailed: async () => ({ status: 'found', user: { nickname: '테스터', userId: 'uid' } }),
    fetchUserStatsDetailed: async () => {
      calls += 1;
      return { status: 'found', stats: {
        seasonId: 39, matchingMode: 3, matchingTeamMode: 3,
        totalGames: 10, totalWins: 2, averageRank: 2.4,
      } };
    },
  };
  const service = new PlayerSeasonStatsService({
    findByNicknameKey: async () => ({ id: '1', nickname: '테스터' }),
    findSnapshot: async () => snapshot,
    saveResult: async (_nickname, _key, _season, _mode, stats, fetchedAt) => {
      saves += 1;
      snapshot = { stats, fetchedAt };
    },
  }, bser, { get: () => undefined });

  await service.getStats('테스터', '39', '3');
  assert.equal(calls, 0);
  const updated = await service.refreshStats('테스터', '39', '3');
  assert.equal(updated.status, 'updated');
  assert.equal(updated.fetchedAt, snapshot.fetchedAt.toISOString());
  assert.equal(calls, 1);
  assert.equal(saves, 1);

  const saved = snapshot;
  bser.fetchUserStatsDetailed = async () => ({ status: 'unavailable', statusCode: 429 });
  await assert.rejects(service.refreshStats('테스터', '39', '3'), (error) => {
    assert.equal(error.status, 429);
    assert.equal(error.getResponse().code, 'BSER_RATE_LIMITED');
    return true;
  });
  assert.equal(snapshot, saved);
  assert.equal(saves, 1);
});

test('explicit season refresh treats confirmed empty stats as success', async () => {
  const service = new PlayerSeasonStatsService({ saveResult: async () => {} }, {
    findUserByNicknameDetailed: async () => ({ status: 'found', user: { nickname: '테스터', userId: 'uid' } }),
    fetchUserStatsDetailed: async () => ({ status: 'not_found' }),
  }, { get: () => undefined });
  assert.deepEqual(await service.refreshStats('테스터', '39', '3'), {
    nickname: '테스터', status: 'no_stats', fetchedAt: null,
  });
});

test('simultaneous explicit refreshes share each service upstream request', async () => {
  let matchCalls = 0;
  let statsCalls = 0;
  let lookup = null;
  const user = { status: 'found', user: { nickname: '테스터', userId: 'uid' } };
  const matches = new PlayerMatchesService({
    findByNicknameKey: async () => lookup,
    saveSnapshot: async (nickname, _key, _games, syncedAt) => {
      lookup = { id: '1', nickname, matchesSyncedAt: syncedAt };
    },
  }, {
    findUserByNicknameDetailed: async () => {
      matchCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return user;
    },
    fetchUserMatchesDetailed: async () => ({ status: 'found', games: [] }),
  }, { get: () => undefined });
  const stats = new PlayerSeasonStatsService({ saveResult: async () => {} }, {
    findUserByNicknameDetailed: async () => user,
    fetchUserStatsDetailed: async () => {
      statsCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { status: 'not_found' };
    },
  }, { get: () => undefined });
  const service = new PlayerRefreshService(matches, stats);
  const [first, second] = await Promise.all([
    service.refresh('테스터', body), service.refresh('테스터', body),
  ]);
  assert.deepEqual(first, second);
  assert.equal(matchCalls, 1);
  assert.equal(statsCalls, 1);
});

test('refresh response separates successful, empty, and failed sections', async () => {
  const service = new PlayerRefreshService({
    refreshMatches: async () => ({ nickname: '테스터', lastSyncedAt: '2026-10-15T00:00:00.000Z' }),
  }, {
    refreshStats: async () => ({ nickname: '테스터', status: 'no_stats', fetchedAt: null }),
  });
  assert.deepEqual(await service.refresh(' 테스터 ', body), {
    nickname: '테스터', seasonId: 39, matchingMode: 3, refreshStatus: 'updated',
    matches: { status: 'updated', lastSyncedAt: '2026-10-15T00:00:00.000Z' },
    seasonStats: { status: 'no_stats', fetchedAt: null },
  });
});

test('partial refresh returns a failure HTTP status and preserves which section succeeded', async () => {
  const service = new PlayerRefreshService({
    refreshMatches: async () => ({ nickname: '테스터', lastSyncedAt: '2026-10-15T00:00:00.000Z' }),
  }, {
    refreshStats: async () => { throw new HttpException({ code: 'BSER_RATE_LIMITED' }, 429); },
  });
  await assert.rejects(service.refresh('테스터', body), (error) => {
    assert.equal(error.status, 429);
    assert.deepEqual(error.getResponse(), {
      code: 'PLAYER_REFRESH_PARTIAL', message: '일부 데이터를 갱신하지 못했습니다.',
      nickname: '테스터', seasonId: 39, matchingMode: 3, refreshStatus: 'partial',
      matches: { status: 'updated', lastSyncedAt: '2026-10-15T00:00:00.000Z' },
      seasonStats: { status: 'failed', code: 'BSER_RATE_LIMITED' },
      retryAfter: 1,
    });
    return true;
  });
});

test('both missing-player failures return 404, while upstream failures return 502', async () => {
  const missing = new PlayerRefreshService({
    refreshMatches: async () => { throw new NotFoundException({ code: 'PLAYER_NOT_FOUND' }); },
  }, {
    refreshStats: async () => { throw new NotFoundException({ code: 'PLAYER_NOT_FOUND' }); },
  });
  await assert.rejects(missing.refresh('없는유저', body), (error) => {
    assert.equal(error.status, 404);
    assert.equal(error.getResponse().refreshStatus, 'failed');
    assert.equal(error.getResponse().matches.code, 'PLAYER_NOT_FOUND');
    return true;
  });

  const unavailable = new PlayerRefreshService({
    refreshMatches: async () => { throw new HttpException({ code: 'BSER_UNAVAILABLE' }, 502); },
  }, {
    refreshStats: async () => { throw new HttpException({ code: 'BSER_UNAVAILABLE' }, 502); },
  });
  await assert.rejects(unavailable.refresh('테스터', body), (error) => {
    assert.equal(error.status, 502);
    assert.equal(error.getResponse().code, 'PLAYER_REFRESH_FAILED');
    return true;
  });
});

test('invalid refresh input is rejected before either upstream operation', async () => {
  let calls = 0;
  const service = new PlayerRefreshService({ refreshMatches: async () => { calls += 1; } }, {
    refreshStats: async () => { calls += 1; },
  });
  for (const [nickname, request] of [
    ['', body], ['bad\nname', body], ['테스터', null], ['테스터', { ...body, seasonId: '39' }],
    ['테스터', { ...body, seasonId: 0 }], ['테스터', { ...body, matchingMode: 1 }],
  ]) {
    await assert.rejects(service.refresh(nickname, request), (error) => error.status === 400);
  }
  assert.equal(calls, 0);
});

test('NestJS exposes POST /v1/players/:nickname/refresh', async () => {
  require('reflect-metadata');
  const { Module } = require('@nestjs/common');
  const { NestFactory } = require('@nestjs/core');
  const { PlayerRefreshController } = require('../dist/modules/player-refresh/player-refresh.controller');
  const { PlayerRefreshRateLimitGuard } = require('../dist/modules/player-refresh/player-refresh-rate-limit.guard');
  const calls = [];
  const service = { refresh: async (nickname, request) => {
    calls.push([nickname, request]);
    return { nickname, refreshStatus: 'updated' };
  } };
  class TestModule {}
  Module({ controllers: [PlayerRefreshController], providers: [
    { provide: PlayerRefreshService, useValue: service }, PlayerRefreshRateLimitGuard,
  ] })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  try {
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address();
    const response = await fetch(`http://127.0.0.1:${port}/v1/players/%ED%85%8C%EC%8A%A4%ED%84%B0/refresh`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).refreshStatus, 'updated');
    assert.deepEqual(calls, [['테스터', body]]);
    assert.deepEqual(Reflect.getMetadata('rate_limit', PlayerRefreshController.prototype.refresh), {
      maxRequests: 5, windowSeconds: 60,
    });

    service.refresh = async () => {
      throw new HttpException({
        code: 'PLAYER_REFRESH_PARTIAL', refreshStatus: 'partial',
        matches: { status: 'updated', lastSyncedAt: '2026-10-15T00:00:00.000Z' },
        seasonStats: { status: 'failed', code: 'BSER_UNAVAILABLE' },
      }, 502);
    };
    const partial = await fetch(`http://127.0.0.1:${port}/v1/players/%ED%85%8C%EC%8A%A4%ED%84%B0/refresh`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal(partial.status, 502);
    assert.equal((await partial.json()).seasonStats.code, 'BSER_UNAVAILABLE');
  } finally {
    await app.close();
  }
});

test('the refresh rate limit works independently of Redis', async () => {
  const { PlayerRefreshRateLimitGuard } = require('../dist/modules/player-refresh/player-refresh-rate-limit.guard');
  const guard = new PlayerRefreshRateLimitGuard();
  const headers = {};
  let spoofed = 0;
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ ip: '127.0.0.1', headers: { 'x-forwarded-for': `${++spoofed}.example` } }),
      getResponse: () => ({ setHeader: (name, value) => { headers[name] = value; } }),
    }),
  };
  for (let index = 0; index < 5; index += 1) assert.equal(guard.canActivate(context), true);
  assert.throws(() => guard.canActivate(context), (error) => {
    assert.equal(error.status, 429);
    assert.equal(error.getResponse().code, 'RATE_LIMITED');
    return true;
  });
  assert.equal(headers['X-RateLimit-Remaining'], 0);
});
