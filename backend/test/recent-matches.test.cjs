const assert = require('node:assert/strict');
const { test } = require('node:test');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { BserApiService } = require('../dist/modules/collect/bser-api.service');
const {
  RecentMatchesQueryDto,
} = require('../dist/modules/multi-search/dto/recent-matches-query.dto');
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
    return new Response(
      JSON.stringify({
        code: 200,
        user: { uid: user.userId, nickname: user.nickname },
      }),
      { status: 200 },
    );
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
    return new Response(
      JSON.stringify({
        code: 200,
        userGames: [match(2, '2026-10-12T12:00:00Z')],
      }),
    );
  };
  assert.equal(
    (await api.fetchUserMatchesDetailed(user.userId)).status,
    'found',
  );

  api.fetchWithRetry = async () => new Response(JSON.stringify({ code: 200 }));
  assert.equal(
    (await api.fetchUserMatchesDetailed(user.userId)).status,
    'unavailable',
  );
});

function createService(matchesResult) {
  const bserApi = {
    findUserByNicknameDetailed: async () => ({ status: 'found', user }),
    fetchUserMatchesDetailed: async () => matchesResult,
  };
  const redis = {
    get: async () => null,
    set: async () => {},
    getOrSet: async (_key, _ttl, factory) => factory(),
  };
  const config = { get: (_key, fallback) => fallback };
  return new MultiSearchService(bserApi, redis, config);
}

test('recent matches are sorted, limited, and expose only the response contract', async () => {
  const service = createService({
    status: 'found',
    matches: [
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

test('empty matches and unavailable upstream have distinct states', async () => {
  assert.equal(
    (
      await createService({ status: 'found', matches: [] }).searchRecentMatches(
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

test('recent match query trims nickname and rejects an excessive limit', async () => {
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
  });
  assert.equal((await validate(invalid)).length, 2);
});
