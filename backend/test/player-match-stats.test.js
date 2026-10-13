const assert = require('node:assert/strict');
const test = require('node:test');
const { PlayerMatchesService } = require('../dist/modules/player-matches/player-matches.service');

function fixture(aggregate, initialLookup = null) {
  let lookup = initialLookup;
  let upstreamCalls = 0;
  const repository = {
    findByNicknameKey: async () => lookup,
    saveSnapshot: async (nickname, _key, providerUid, _matches, syncedAt) => {
      lookup = { id: '1', nickname, providerUid, matchesSyncedAt: syncedAt };
    },
    aggregateMatches: async (_id, seasonId, matchingMode) => {
      assert.equal(seasonId, 39);
      assert.equal(matchingMode, 3);
      return aggregate;
    },
    listMatches: async () => ({ matches: [], hasMore: false }),
  };
  const bser = {
    findUserByNicknameDetailed: async () => {
      upstreamCalls += 1;
      return { status: 'found', user: { nickname: '테스터', userId: 'temporary-uid' } };
    },
    fetchUserMatchesDetailed: async () => ({ status: 'found', games: [] }),
  };
  return {
    service: new PlayerMatchesService(repository, bser, { get: () => undefined }),
    bser,
    get upstreamCalls() { return upstreamCalls; },
  };
}

test('stored-match stats disclose the sample, period, source, and rate units', async () => {
  const f = fixture({
    sampleSize: 3, wins: 1, top3: 2, averageRank: 8 / 3,
    averageKills: 3, averageAssists: 4.555,
    periodStart: new Date('2026-10-10T00:00:00Z'),
    periodEnd: new Date('2026-10-12T00:00:00Z'),
  });
  const result = await f.service.getMatchStats(' 테스터 ', '39', '3');
  assert.equal(result.source, 'stored_matches');
  assert.equal(result.sampleSize, 3);
  assert.deepEqual(result.period, {
    from: '2026-10-10T00:00:00.000Z', to: '2026-10-12T00:00:00.000Z',
  });
  assert.equal(result.stats.winRate, 33.33);
  assert.equal(result.stats.top3Rate, 0.6667);
  assert.equal(result.stats.averageRank, 2.67);
  assert.equal(result.stats.averageAssists, 4.56);
  assert.equal(result.isStale, false);
  assert.ok(result.lastSyncedAt);
  await f.service.getMatchStats('테스터', '39', '3');
  assert.equal(f.upstreamCalls, 1);
});

test('empty filtered sample is a valid result and does not invent averages or a period', async () => {
  const f = fixture({
    sampleSize: 0, wins: 0, top3: 0, averageRank: null,
    averageKills: null, averageAssists: null, periodStart: null, periodEnd: null,
  });
  const result = await f.service.getMatchStats('테스터', '39', '3');
  assert.equal(result.sampleSize, 0);
  assert.equal(result.period, null);
  assert.deepEqual(result.stats, {
    totalGames: 0, wins: 0, top3: 0, winRate: 0, top3Rate: 0,
    averageRank: null, averageKills: null, averageAssists: null,
  });
});

test('invalid filters fail before BSER calls; missing players and outages keep existing semantics', async () => {
  const f = fixture({});
  await assert.rejects(f.service.getMatchStats('테스터', '0', '3'), (error) => error.status === 400);
  await assert.rejects(f.service.getMatchStats('테스터', '39', '1'), (error) => error.status === 400);
  assert.equal(f.upstreamCalls, 0);

  f.bser.findUserByNicknameDetailed = async () => ({ status: 'not_found' });
  await assert.rejects(f.service.getMatchStats('없는유저', '39', '3'), (error) => error.status === 404);

  const missing = fixture({});
  missing.bser.findUserByNicknameDetailed = async () => ({ status: 'unavailable', statusCode: 429 });
  await assert.rejects(missing.service.getMatchStats('테스터', '39', '3'), (error) => error.status === 429);
});

test('stale stored data remains available when an upstream refresh fails', async () => {
  const lastSyncedAt = new Date(Date.now() - 600_000);
  const f = fixture({
    sampleSize: 1, wins: 1, top3: 1, averageRank: 1,
    averageKills: 2, averageAssists: 3,
    periodStart: new Date('2026-10-10T00:00:00Z'),
    periodEnd: new Date('2026-10-10T00:00:00Z'),
  }, { id: '1', nickname: '테스터', providerUid: 'uid', matchesSyncedAt: lastSyncedAt });
  f.bser.findUserByNicknameDetailed = async () => ({ status: 'unavailable', statusCode: 503 });
  const result = await f.service.getMatchStats('테스터', '39', '3');
  assert.equal(result.isStale, true);
  assert.equal(result.lastSyncedAt, lastSyncedAt.toISOString());
  assert.equal(result.stats.wins, 1);
});
