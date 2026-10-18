const assert = require('node:assert/strict');
const test = require('node:test');
const { BserApiService } = require('../dist/modules/collect/bser-api.service');
const { PlayerMatchesService } = require('../dist/modules/player-matches/player-matches.service');
const { PlayerSeasonStatsService } = require('../dist/modules/player-season-stats/player-season-stats.service');
const { PlayerCompareService } = require('../dist/modules/player-compare/player-compare.service');

function config(overrides = {}) {
  return {
    get: (key, fallback) => key === 'BSER_API_KEY' ? 'test-key' : overrides[key] ?? fallback,
  };
}

function ok(body) {
  return { status: 200, ok: true, json: async () => body };
}

function stats() {
  return { seasonId: 41, matchingMode: 3, matchingTeamMode: 3, totalGames: 1, totalWins: 0, averageRank: 2 };
}

test('recent matches and season stats share a simultaneous nickname lookup', async () => {
  const originalFetch = global.fetch;
  let nicknameCalls = 0;
  let matchCalls = 0;
  let statsCalls = 0;
  global.fetch = async (input) => {
    const url = new URL(input);
    if (url.pathname === '/v1/user/nickname') {
      nicknameCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return ok({ code: 200, user: { nickname: 'Alpha', uid: 'temporary-uid' } });
    }
    if (url.pathname.startsWith('/v1/user/games/uid/')) {
      matchCalls += 1;
      return ok({ code: 200, userGames: [] });
    }
    statsCalls += 1;
    return ok({ code: 200, userStats: [stats()] });
  };
  const bser = new BserApiService(config({ BSER_API_RATE_LIMIT_RPS: 0 }));
  let matchLookup = null;
  let statsLookup = null;
  const matches = new PlayerMatchesService({
    findByNicknameKey: async () => matchLookup,
    saveSnapshot: async (nickname, _key, _games, matchesSyncedAt) => {
      matchLookup = { id: '1', nickname, matchesSyncedAt };
    },
    listMatches: async () => ({ matches: [], hasMore: false }),
  }, bser, config());
  const seasonStats = new PlayerSeasonStatsService({
    findByNicknameKey: async () => statsLookup,
    findSnapshot: async () => null,
    saveResult: async (nickname) => { statsLookup = { id: '1', nickname }; },
  }, bser, config());

  try {
    const [recent, season] = await Promise.all([
      matches.getMatches('Alpha'), seasonStats.getStats('alpha', '41', '3'),
    ]);
    assert.equal(recent.nickname, 'Alpha');
    assert.equal(season.stats.totalGames, 1);
    assert.equal(nicknameCalls, 1);
    assert.equal(matchCalls, 1);
    assert.equal(statsCalls, 1);
    await bser.findUserByNicknameDetailed('ALPHA');
    assert.equal(nicknameCalls, 2, 'completed lookups are not cached forever');
  } finally {
    bser.onModuleDestroy();
    global.fetch = originalFetch;
  }
});

test('full and expired BSER queue entries return 429 without dispatching more calls', async () => {
  const originalFetch = global.fetch;
  let fetchCount = 0;
  global.fetch = async (input) => {
    fetchCount += 1;
    return ok({ code: 200, user: { nickname: new URL(input).searchParams.get('query'), uid: 'uid' } });
  };
  const bser = new BserApiService(config({
    BSER_API_RATE_LIMIT_RPS: 1,
    BSER_API_RATE_LIMIT_BURST: 1,
    BSER_API_RATE_LIMIT_QUEUE_MAX: 1,
    BSER_API_RATE_LIMIT_MAX_WAIT_MS: 25,
    BSER_API_RETRIES: 0,
  }));

  try {
    const [first, waiting, full] = await Promise.all([
      bser.findUserByNicknameDetailed('first'),
      bser.findUserByNicknameDetailed('waiting'),
      bser.findUserByNicknameDetailed('full'),
    ]);
    assert.equal(first.status, 'found');
    assert.equal(waiting.statusCode, 429);
    assert.match(waiting.message, /timeout/);
    assert.equal(full.statusCode, 429);
    assert.match(full.message, /full/);
    assert.ok(full.retryAfter >= 1);
    assert.equal(fetchCount, 1);
  } finally {
    bser.onModuleDestroy();
    global.fetch = originalFetch;
  }
});

test('season stats report queue timeout as 429 with retry guidance', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ok({ code: 200, user: { nickname: 'first', uid: 'uid' } });
  const bser = new BserApiService(config({
    BSER_API_RATE_LIMIT_RPS: 1,
    BSER_API_RATE_LIMIT_BURST: 1,
    BSER_API_RATE_LIMIT_MAX_WAIT_MS: 25,
    BSER_API_RETRIES: 0,
  }));
  const seasonStats = new PlayerSeasonStatsService({
    findByNicknameKey: async () => null,
    findSnapshot: async () => null,
    saveResult: async () => { throw new Error('unexpected save'); },
  }, {
    findUserByNicknameDetailed: async () => ({ status: 'found', user: { nickname: 'test', userId: 'uid' } }),
    fetchUserStatsDetailed: bser.fetchUserStatsDetailed.bind(bser),
  }, config());

  try {
    await bser.findUserByNicknameDetailed('first');
    await assert.rejects(seasonStats.getStats('test', '41', '3'), (error) => {
      assert.equal(error.status, 429);
      assert.equal(error.getResponse().code, 'BSER_RATE_LIMITED');
      assert.ok(error.getResponse().retryAfter >= 1);
      return true;
    });
  } finally {
    bser.onModuleDestroy();
    global.fetch = originalFetch;
  }
});

test('provider 429 is not retried immediately and preserves Retry-After', async () => {
  const originalFetch = global.fetch;
  let fetchCount = 0;
  global.fetch = async () => {
    fetchCount += 1;
    return { status: 429, ok: false, statusText: 'Too Many Requests', headers: new Headers({ 'Retry-After': '7' }) };
  };
  const bser = new BserApiService(config({ BSER_API_RATE_LIMIT_RPS: 0, BSER_API_RETRIES: 1 }));
  try {
    const result = await bser.findUserByNicknameDetailed('test');
    assert.equal(result.statusCode, 429);
    assert.equal(result.retryAfter, 7);
    assert.equal(fetchCount, 1);
  } finally {
    bser.onModuleDestroy();
    global.fetch = originalFetch;
  }
});

test('concurrent cold comparisons keep order and surface bounded-queue failures per player', async () => {
  const originalFetch = global.fetch;
  let fetchCount = 0;
  global.fetch = async (input) => {
    fetchCount += 1;
    const url = new URL(input);
    if (url.pathname === '/v1/user/nickname') {
      const nickname = url.searchParams.get('query');
      return ok({ code: 200, user: { nickname, uid: nickname } });
    }
    return ok({ code: 200, userStats: [stats()] });
  };
  const bser = new BserApiService(config({
    BSER_API_RATE_LIMIT_RPS: 1,
    BSER_API_RATE_LIMIT_BURST: 4,
    BSER_API_RATE_LIMIT_QUEUE_MAX: 3,
    BSER_API_RATE_LIMIT_MAX_WAIT_MS: 40,
    BSER_API_RETRIES: 0,
  }));
  const seasonStats = new PlayerSeasonStatsService({
    findByNicknameKey: async () => null,
    findSnapshot: async () => null,
    saveResult: async () => {},
  }, bser, config());

  try {
    const requests = Array.from({ length: 8 }, (_, index) => ({
      nicknames: [`P${index}A`, `P${index}B`, `P${index}C`], seasonId: 41, matchingMode: 3,
    }));
    const responses = await Promise.all(requests.map((body) => new PlayerCompareService(seasonStats).compare(body)));
    responses.forEach((response, index) => {
      assert.deepEqual(response.results.map((result) => result.input), requests[index].nicknames);
      assert.deepEqual(response.summary, { requested: 3, ok: 0, failed: 3 });
      response.results.forEach((result) => {
        assert.equal(result.status, 'error');
        assert.equal(result.code, 'BSER_RATE_LIMITED');
        assert.ok(result.retryAfter >= 1);
      });
    });
    assert.equal(fetchCount, 4, 'the limiter dispatches only its initial burst');
  } finally {
    bser.onModuleDestroy();
    global.fetch = originalFetch;
  }
});

test('player API sends Retry-After on upstream 429 responses', async () => {
  require('reflect-metadata');
  const { HttpException, Module } = require('@nestjs/common');
  const { APP_INTERCEPTOR, NestFactory } = require('@nestjs/core');
  const { PlayerSeasonStatsController } = require('../dist/modules/player-season-stats/player-season-stats.controller');
  const { PlayerRetryAfterInterceptor } = require('../dist/player-api/player-retry-after.interceptor');
  class TestModule {}
  Module({
    controllers: [PlayerSeasonStatsController],
    providers: [
      { provide: PlayerSeasonStatsService, useValue: {
        getStats: async () => { throw new HttpException({ code: 'BSER_RATE_LIMITED', retryAfter: 3 }, 429); },
      } },
      { provide: APP_INTERCEPTOR, useClass: PlayerRetryAfterInterceptor },
    ],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  try {
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    const response = await fetch(`http://127.0.0.1:${address.port}/v1/players/test/stats?seasonId=41&matchingMode=3`);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '3');
  } finally {
    await app.close();
  }
});
