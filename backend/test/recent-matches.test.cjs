const assert = require('node:assert/strict');
const { test } = require('node:test');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { BserApiService } = require('../dist/modules/collect/bser-api.service');
const {
  RecentMatchesQueryDto,
} = require('../dist/modules/multi-search/dto/recent-matches-query.dto');
const {
  MultiSearchController,
} = require('../dist/modules/multi-search/multi-search.controller');
const {
  MultiSearchService,
} = require('../dist/modules/multi-search/multi-search.service');

const user = { nickname: '테스트', userId: 'temporary-uid' };
const match = (gameId, startDtm) => ({
  gameId,
  matchingMode: 3,
  matchingTeamMode: 3,
  seasonId: 39,
  characterNum: 10,
  gameRank: 2,
  playerKill: 4,
  playerAssistant: 7,
  startDtm,
  equipment: { 0: 12345 },
});

test('official nickname UID is normalized for both season stats and recent matches', async () => {
  const api = new BserApiService({
    get: (name, fallback) => (name === 'BSER_API_KEY' ? 'test-key' : fallback),
  });
  api.fetchWithRetry = async (url, options) => {
    assert.equal(new URL(url).searchParams.get('query'), '테스트');
    assert.equal(options.headers['x-api-key'], 'test-key');
    return {
      response: new Response(null, { status: 200 }),
      body: { code: 200, user: { uid: user.userId, nickname: user.nickname } },
    };
  };

  assert.deepEqual(await api.findUserByNicknameDetailed('테스트'), {
    status: 'found',
    user,
  });
});

test('recent matches use the UID endpoint and reject malformed upstream success', async () => {
  const api = new BserApiService({
    get: (name, fallback) => (name === 'BSER_API_KEY' ? 'test-key' : fallback),
  });
  api.fetchWithRetry = async (url) => {
    assert.equal(
      url,
      'https://open-api.bser.io/v1/user/games/uid/temporary-uid',
    );
    return {
      response: new Response(null, { status: 200 }),
      body: {
        code: 200,
        userGames: [match(2, '2026-10-12T12:00:00Z')],
      },
    };
  };
  assert.equal(
    (await api.fetchUserMatchesDetailed(user.userId)).status,
    'found',
  );

  api.fetchWithRetry = async () => ({ response: new Response(null), body: { code: 200 } });
  assert.equal(
    (await api.fetchUserMatchesDetailed(user.userId)).status,
    'unavailable',
  );
});

test('BSER match pages send the next parameter and ignore invalid continuations', async () => {
  const api = new BserApiService({
    get: (name, fallback) => (name === 'BSER_API_KEY' ? 'test-key' : fallback),
  });
  let next = 456;
  api.fetchWithRetry = async (url) => {
    assert.equal(new URL(url).searchParams.get('next'), '123');
    return {
      response: new Response(null, { status: 200 }),
      body: { code: 200, userGames: [], next },
    };
  };

  assert.deepEqual(await api.fetchUserMatchesDetailed(user.userId, 123), {
    status: 'found', games: [], next: 456,
  });
  for (next of [undefined, null, 0, 123, 1.5, '456', Number.MAX_SAFE_INTEGER + 1]) {
    assert.deepEqual(await api.fetchUserMatchesDetailed(user.userId, 123), {
      status: 'found', games: [],
    });
  }
});

function createService(matchesResult, cache = new Map()) {
  const bserApi = {
    findUserByNicknameDetailed: async (nickname) => ({
      status: 'found',
      user: nickname === user.nickname ? user : { nickname, userId: 'other-uid' },
    }),
    fetchUserMatchesDetailed: typeof matchesResult === 'function'
      ? matchesResult
      : async () => matchesResult,
  };
  const redis = {
    get: async () => null,
    set: async () => {},
    getOrSet: async (key, _ttl, factory) => {
      if (!cache.has(key)) cache.set(key, await factory());
      return cache.get(key);
    },
  };
  const config = { get: (_key, fallback) => fallback };
  return new MultiSearchService(bserApi, redis, config);
}

test('recent matches are sorted, limited, and expose only the response contract', async () => {
  const service = createService({
    status: 'found',
    games: [
      match(1, '2026-10-11T12:00:00Z'),
      match(2, '2026-10-12T12:00:00Z'),
      match(3, 'invalid-date'),
    ],
  });
  const result = await service.searchRecentMatches(' 테스트 ', 1);

  assert.equal(result.status, 'ok');
  assert.deepEqual(
    result.matches.map(({ gameId }) => gameId),
    [2],
  );
  assert.equal('equipment' in result.matches[0], false);
  assert.equal(result.input, '테스트');
});

test('recent match cursors consume the cached page before requesting an older one', async () => {
  const requestedPages = [];
  const controller = new MultiSearchController(createService(async (_userId, page) => {
    requestedPages.push(page);
    const startDtm = '2026-10-12T12:00:00Z';
    if (page === 456) {
      return { status: 'found', games: [match(1, startDtm)] };
    }
    return {
      status: 'found',
      games: [match(3, startDtm), ...Array.from({ length: 22 }, (_, index) => match(index + 2, startDtm))],
      next: 456,
    };
  }));
  const request = (limit, cursor) => controller.getRecentMatches(
    plainToInstance(RecentMatchesQueryDto, { nickname: user.nickname, limit, cursor }),
  );

  const first = await request('20');
  const remaining = await request('5', first.nextCursor);
  assert.equal(first.matches.length, 20);
  assert.deepEqual(remaining.matches.map(({ gameId }) => gameId), [3, 2]);
  assert.deepEqual(requestedPages, [undefined]);

  const older = await request('5', remaining.nextCursor);
  assert.deepEqual(older.matches.map(({ gameId }) => gameId), [1]);
  assert.equal(older.nextCursor, null);
  assert.deepEqual(requestedPages, [undefined, 456]);
  assert.deepEqual(await request('5', remaining.nextCursor), older);
  assert.deepEqual(requestedPages, [undefined, 456]);
});

test('recent match cursors reject invalid and other-player tokens before fetching a page', async () => {
  let fetchCount = 0;
  const service = createService(async () => {
    fetchCount += 1;
    return {
      status: 'found',
      games: [match(2, '2026-10-12T12:00:00Z'), match(1, '2026-10-11T12:00:00Z')],
    };
  });
  const invalidCursor = (error) => error.getStatus() === 400
    && error.getResponse().code === 'INVALID_CURSOR';

  await assert.rejects(service.searchRecentMatches(user.nickname, 1, 'invalid'), invalidCursor);
  assert.equal(fetchCount, 0);
  const first = await service.searchRecentMatches(user.nickname, 1);
  await assert.rejects(service.searchRecentMatches('다른플레이어', 1, first.nextCursor), invalidCursor);
  assert.equal(fetchCount, 1);
});

test('a refreshed first page resumes after the last returned game', async () => {
  const cache = new Map();
  let games = [match(2, '2026-10-12T12:00:00Z'), match(1, '2026-10-11T12:00:00Z')];
  const service = createService(async () => ({ status: 'found', games }), cache);
  const first = await service.searchRecentMatches(user.nickname, 1);

  cache.clear();
  games = [match(3, '2026-10-13T12:00:00Z'), ...games];
  const next = await service.searchRecentMatches(user.nickname, 1, first.nextCursor);
  assert.deepEqual(next.matches.map(({ gameId }) => gameId), [1]);
  assert.equal(next.nextCursor, null);

  cache.clear();
  games = [games[0]];
  await assert.rejects(service.searchRecentMatches(user.nickname, 1, first.nextCursor), {
    response: { code: 'INVALID_CURSOR', message: '전적을 처음부터 다시 조회해 주세요.' },
    status: 400,
  });
});

test('recent matches expose equipment and recorded RP in the nested summary', async () => {
  const service = createService({
    status: 'found',
    games: [
      {
        ...match(8, '2026-10-12T12:00:00Z'),
        damageToPlayer: 9140,
        mmrBefore: 6_100,
        mmrAfter: 6_065,
        mmrGain: -35,
        duration: 1032,
        routeIdOfStart: 417,
        privateField: 'ignored',
      },
      { ...match(7, '2026-10-11T12:00:00Z'), equipment: undefined },
    ],
  });
  const result = await service.searchRecentMatches('테스트');
  assert.deepEqual(result.matches[0].summary, {
    equipment: { 0: 12345 },
    damageToPlayer: 9140,
    mmrBefore: 6_100,
    mmrAfter: 6_065,
    mmrGain: -35,
    duration: 1032,
    routeIdOfStart: 417,
  });
  assert.equal('privateField' in result.matches[0], false);
  assert.deepEqual(JSON.parse(JSON.stringify(result.matches[1].summary)), {
    equipment: {},
  });
});

test('recent match dates with the live BSER +0900 offset are normalized', async () => {
  const service = createService({
    status: 'found',
    games: [match(7, '2026-10-12T20:16:08.008+0900')],
  });
  const result = await service.searchRecentMatches('테스트');
  assert.equal(result.matches[0].startDtm, '2026-10-12T11:16:08.008Z');
});

test('empty matches and unavailable upstream have distinct states', async () => {
  assert.equal(
    (
      await createService({ status: 'found', games: [] }).searchRecentMatches(
        '테스트',
      )
    ).status,
    'no_matches',
  );
  const unavailable = await createService({
    status: 'unavailable',
  }).searchRecentMatches('테스트');
  assert.equal(unavailable.status, 'error');
  assert.equal(unavailable.reason, 'bser_api_unavailable');
});

test('recent match query trims nickname and rejects an excessive limit or cursor', async () => {
  const valid = plainToInstance(RecentMatchesQueryDto, {
    nickname: ' 테스트 ',
    limit: '10',
  });
  assert.deepEqual(await validate(valid), []);
  assert.equal(valid.nickname, '테스트');
  assert.equal(valid.limit, 10);

  const invalid = plainToInstance(RecentMatchesQueryDto, {
    nickname: ' ',
    limit: '21',
    cursor: 'a'.repeat(78),
  });
  assert.deepEqual((await validate(invalid)).map(({ property }) => property), ['nickname', 'limit', 'cursor']);
});

test('multi-search uses the current season by default and still accepts a historical season', async () => {
  const requests = [];
  const service = new MultiSearchService({
    findUserByNicknameDetailed: async () => ({ status: 'found', user }),
    fetchUserStatsDetailed: async (_userId, seasonId, matchingMode) => {
      requests.push([seasonId, matchingMode]);
      return { status: 'not_found' };
    },
  }, {
    get: async () => null,
    set: async () => {},
    getOrSet: async (_key, _ttl, factory) => factory(),
  }, { get: (_key, fallback) => fallback });

  const current = await service.searchPlayers(['테스트']);
  const historical = await service.searchPlayers(['테스트'], 39, 3);

  assert.deepEqual(requests, [[41, 3], [39, 3]]);
  assert.equal(current.seasonId, 41);
  assert.equal(historical.seasonId, 39);
});
