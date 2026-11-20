const assert = require('node:assert/strict');
const test = require('node:test');
const { PlayerSeasonStatsService } = require('../dist/modules/player-season-stats/player-season-stats.service');
const refreshLease = require('./helpers/season-stats-refresh.cjs');

function sampleStats(overrides = {}) {
  return {
    seasonId: 39, matchingMode: 3, matchingTeamMode: 3,
    totalGames: 10, totalWins: 2, averageRank: 2.4,
    mmr: 3200, rank: 100, rankSize: 1000, rankPercent: 0.1,
    top3: 0.6, averageKills: 3.2, averageAssistants: 4.1,
    characterStats: [{ characterCode: 1, totalGames: 5, wins: 1, top3Rate: 0.6, averageRank: 2.2 }],
    ...overrides,
  };
}

function fixture(initialSnapshot = null) {
  let lookup = initialSnapshot ? { id: '1', nickname: '테스터' } : null;
  let snapshot = initialSnapshot;
  let saveCount = 0;
  let userCalls = 0;
  let statsCalls = 0;
  const repository = {
    ...refreshLease,
    findByNicknameKey: async () => lookup,
    findSnapshot: async () => snapshot,
    findLatestRankedSnapshot: async () => snapshot?.stats ? snapshot : null,
    saveResult: async (nickname, _key, _season, _mode, stats, fetchedAt) => {
      saveCount += 1;
      lookup = { id: '1', nickname };
      snapshot = { stats, fetchedAt };
    },
  };
  const bser = {
    findUserByNicknameDetailed: async () => {
      userCalls += 1;
      return { status: 'found', user: { nickname: '테스터', userId: 'uid-one' } };
    },
    fetchUserStatsDetailed: async () => {
      statsCalls += 1;
      return { status: 'found', stats: sampleStats() };
    },
  };
  const config = { get: () => undefined };
  return {
    service: new PlayerSeasonStatsService(repository, bser, config),
    bser, repository,
    get saveCount() { return saveCount; },
    get userCalls() { return userCalls; },
    get statsCalls() { return statsCalls; },
  };
}

test('official season stats are normalized, saved, and reused while fresh', async () => {
  const f = fixture();
  const first = await f.service.getStats(' 테스터 ', '39', '3');
  assert.equal(first.source, 'bser_official');
  assert.equal(first.stats.winRate, 20);
  assert.equal(first.stats.top3Rate, 0.6);
  assert.equal(first.stats.characterStats[0].characterCode, 1);
  assert.equal(first.isStale, false);
  assert.ok(first.fetchedAt);
  const second = await f.service.getStats('테스터', '39', '3');
  assert.deepEqual(second, first);
  assert.equal(f.saveCount, 1);
  assert.equal(f.statsCalls, 1);
});

test('nickname-only context reads fresh or stale ranked snapshots without any BSER calls', async () => {
  for (const isStale of [false, true]) {
    const cached = {
      stats: { ...sampleStats(), winRate: 20 },
      fetchedAt: new Date(Date.now() - (isStale ? 700_000 : 1000)),
    };
    const f = fixture(cached);
    f.repository.findByNicknameKey = async (key) => {
      assert.equal(key, 'tester');
      return { id: '1', nickname: 'Tester' };
    };
    f.repository.findLatestRankedSnapshot = async (playerId) => {
      assert.equal(playerId, '1');
      return cached;
    };
    const result = await f.service.getStats('  TESTER  ');
    assert.equal(result.nickname, 'Tester');
    assert.equal(result.seasonId, 39);
    assert.equal(result.matchingMode, 3);
    assert.equal(result.isStale, isStale);
    assert.equal(result.fetchedAt, cached.fetchedAt.toISOString());
    assert.deepEqual(result.stats, cached.stats);
    assert.equal(f.userCalls, 0);
    assert.equal(f.statsCalls, 0);
    assert.equal(f.saveCount, 0);
  }
});

test('nickname-only cache misses never trigger a refresh and partial filters stay invalid', async () => {
  for (const hasLookup of [false, true]) {
    const f = fixture();
    if (hasLookup) f.repository.findByNicknameKey = async () => ({ id: '1', nickname: '테스터' });
    await assert.rejects(f.service.getStats('테스터'), (error) => error.status === 404);
    assert.equal(f.userCalls, 0);
    assert.equal(f.statsCalls, 0);
    assert.equal(f.saveCount, 0);
  }
  const f = fixture();
  await assert.rejects(f.service.getStats('테스터', '39'), (error) => error.status === 400);
  await assert.rejects(f.service.getStats('테스터', undefined, '3'), (error) => error.status === 400);
});

test('concurrent identical requests share the upstream refresh', async () => {
  const f = fixture();
  const original = f.bser.fetchUserStatsDetailed;
  f.bser.fetchUserStatsDetailed = async (...args) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return original(...args);
  };
  const [first, second] = await Promise.all([
    f.service.getStats('테스터', '39', '3'),
    f.service.getStats('테스터', '39', '3'),
  ]);
  assert.deepEqual(first, second);
  assert.equal(f.userCalls, 1);
  assert.equal(f.statsCalls, 1);
  assert.equal(f.saveCount, 1);
});

test('empty stats, unknown player, and invalid filters have distinct results', async () => {
  const f = fixture();
  f.bser.fetchUserStatsDetailed = async () => ({ status: 'not_found' });
  const empty = await f.service.getStats('테스터', '39', '3');
  assert.equal(empty.stats, null);
  assert.equal(empty.fetchedAt, null);
  assert.equal(empty.isStale, false);
  assert.equal(f.saveCount, 1);

  await assert.rejects(f.service.getStats('테스터', '0', '3'), (error) => error.status === 400);
  await assert.rejects(f.service.getStats('테스터', '39', '1'), (error) => error.status === 400);
  const missing = fixture();
  missing.bser.findUserByNicknameDetailed = async () => ({ status: 'not_found' });
  await assert.rejects(missing.service.getStats('없는유저', '39', '3'), (error) => error.status === 404);
});

test('confirmed empty stats are reused until an explicit refresh finds new stats', async () => {
  const f = fixture();
  const fetchStats = f.bser.fetchUserStatsDetailed;
  f.bser.fetchUserStatsDetailed = async () => ({ status: 'not_found' });
  const first = await f.service.getStats('테스터', '39', '3');
  assert.equal(first.stats, null);
  assert.equal(first.fetchedAt, null);
  assert.deepEqual(await f.service.getStats('테스터', '39', '3'), first);
  assert.equal(f.userCalls, 1);
  assert.equal(f.saveCount, 1);

  f.bser.fetchUserStatsDetailed = fetchStats;
  const refresh = await f.service.refreshStats('테스터', '39', '3');
  assert.equal(refresh.status, 'updated');
  assert.equal((await f.service.getStats('테스터', '39', '3')).stats.totalGames, 10);
  assert.equal(f.userCalls, 2);
  assert.equal(f.statsCalls, 1);
});

test('expired empty stats are refreshed and cannot mask an upstream error', async () => {
  const f = fixture({ stats: null, fetchedAt: new Date(Date.now() - 700_000) });
  const fetchStats = f.bser.fetchUserStatsDetailed;
  f.bser.fetchUserStatsDetailed = async () => ({ status: 'unavailable', statusCode: 503 });
  await assert.rejects(f.service.getStats('테스터', '39', '3'), { status: 502 });
  assert.equal(f.saveCount, 0);

  f.bser.fetchUserStatsDetailed = fetchStats;
  const refreshed = await f.service.getStats('테스터', '39', '3');
  assert.equal(refreshed.stats.totalGames, 10);
  assert.equal(f.saveCount, 1);
});

test('upstream failure serves an old snapshot and fails when none exists', async () => {
  const old = { stats: sampleStats(), fetchedAt: new Date(Date.now() - 700_000) };
  const f = fixture(old);
  f.bser.fetchUserStatsDetailed = async () => ({ status: 'unavailable', statusCode: 503 });
  const stale = await f.service.getStats('테스터', '39', '3');
  assert.equal(stale.isStale, true);
  assert.equal(stale.fetchedAt, old.fetchedAt.toISOString());
  assert.deepEqual(stale.stats, old.stats);

  const missing = fixture();
  missing.bser.fetchUserStatsDetailed = async () => ({ status: 'unavailable', statusCode: 429 });
  await assert.rejects(missing.service.getStats('테스터', '39', '3'), (error) => error.status === 429);
});

test('mismatched or malformed official data never replaces a stored snapshot', async () => {
  const old = { stats: sampleStats(), fetchedAt: new Date(Date.now() - 700_000) };
  const f = fixture(old);
  f.bser.fetchUserStatsDetailed = async () => ({ status: 'found', stats: sampleStats({ seasonId: 38 }) });
  const result = await f.service.getStats('테스터', '39', '3');
  assert.equal(result.isStale, true);
  assert.equal(f.saveCount, 0);
});
