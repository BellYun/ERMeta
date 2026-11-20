const assert = require('node:assert/strict');
const test = require('node:test');
const { PlayerHistoryDatabaseService } = require('../dist/common/database/player-history-database.service');
const { PlayerMatchesRepository } = require('../dist/modules/player-matches/player-matches.repository');
const { PlayerSeasonStatsRepository } = require('../dist/modules/player-season-stats/player-season-stats.repository');
const { PlayerMatchesService } = require('../dist/modules/player-matches/player-matches.service');
const { PlayerSeasonStatsService } = require('../dist/modules/player-season-stats/player-season-stats.service');
const { PlayerRefreshService } = require('../dist/modules/player-refresh/player-refresh.service');

function stats(totalGames = 10, totalWins = 2) {
  return {
    seasonId: 39, matchingMode: 3, matchingTeamMode: 3,
    totalGames, totalWins, winRate: totalWins / totalGames * 100,
    averageRank: 2.4, mmr: 3000, rank: 100, rankSize: 1000,
    rankPercent: 0.1, top3Rate: 0.6, averageKills: 3.2, averageAssistants: 4.1,
    characterStats: [{ characterCode: 1, totalGames: 5, wins: 1, top3Rate: 0.6, averageRank: 2.2 }],
  };
}

test('season stats leases fence expired writes and retain provider backoff',
  { skip: !process.env.TEST_DATABASE_URL }, async (t) => {
    const config = { get: (key) => key === 'DATABASE_URL' ? process.env.TEST_DATABASE_URL : undefined };
    const database = new PlayerHistoryDatabaseService(config);
    const repository = new PlayerSeasonStatsRepository(database);
    const nickname = `StatsLease-${Date.now()}`;
    const scope = { nicknameKey: nickname.toLowerCase(), seasonId: 39, matchingMode: 3 };
    const pool = database.getPool();
    const expire = (column) => pool.query(
      `UPDATE player_history.season_stats_refresh_states SET ${column} = clock_timestamp()
       WHERE nickname_key = $1 AND season_id = $2 AND matching_mode = $3`,
      [scope.nicknameKey, scope.seasonId, scope.matchingMode],
    );
    t.after(async () => {
      await pool.query('DELETE FROM player_history.season_stats_refresh_states WHERE nickname_key = $1', [scope.nicknameKey]);
      await pool.query('DELETE FROM player_history.player_lookups WHERE nickname_key = $1', [scope.nicknameKey]);
      await database.onModuleDestroy();
    });

    const old = await repository.claimRefresh(scope);
    assert.equal(old.status, 'acquired');
    assert.equal((await repository.claimRefresh(scope)).status, 'busy');
    assert.equal((await repository.claimRefresh({ ...scope, matchingMode: 2 })).status, 'acquired');
    await expire('lease_until');
    const current = await repository.claimRefresh(scope);
    assert.equal(current.status, 'acquired');
    await assert.rejects(repository.saveResult(nickname, scope.nicknameKey, 39, 3, stats(), new Date(), old.token), /lease lost/);
    assert.equal(await repository.findByNicknameKey(scope.nicknameKey), null);
    assert.equal(await repository.recordRefreshFailure(scope, old.token, 'unavailable'), null);
    assert.equal(await repository.recordRefreshFailure(scope, current.token, 'rate_limited', 12), 12);
    const paused = await repository.claimRefresh(scope);
    assert.equal(paused.status, 'backoff');
    assert.equal(paused.failure, 'rate_limited');
    assert.ok(paused.retryAfter >= 11);

    await expire('retry_at');
    const retry = await repository.claimRefresh(scope);
    assert.equal(retry.status, 'acquired');
    assert.equal(await repository.recordRefreshFailure(scope, retry.token, 'unavailable'), 2);
    await expire('retry_at');
    const recovery = await repository.claimRefresh(scope);
    assert.equal(recovery.status, 'acquired');
    const player = await repository.saveResult(nickname, scope.nicknameKey, 39, 3, stats(), new Date(), recovery.token);
    assert.equal((await repository.findSnapshot(player.id, 39, 3)).stats.totalGames, 10);
    assert.equal((await repository.claimRefresh(scope)).status, 'acquired');
  });

test('separate instances reuse a committed season result and share failure backoff',
  { skip: !process.env.TEST_DATABASE_URL, timeout: 5000 }, async (t) => {
    const config = { get: (key) => key === 'DATABASE_URL' ? process.env.TEST_DATABASE_URL : undefined };
    const databases = [new PlayerHistoryDatabaseService(config), new PlayerHistoryDatabaseService(config)];
    const repositories = databases.map((database) => new PlayerSeasonStatsRepository(database));
    const pool = databases[0].getPool();
    const nickname = `StatsShared-${Date.now()}`;
    const nicknameKey = nickname.toLowerCase();
    const started = Promise.withResolvers();
    const continueRefresh = Promise.withResolvers();
    let activeResult = { status: 'found', stats: stats() };
    let upstreamCalls = 0;
    const bser = {
      findUserByNicknameDetailed: async () => ({ status: 'found', user: { nickname, userId: 'fixture-uid' } }),
      async fetchUserStatsDetailed() {
        upstreamCalls += 1;
        started.resolve();
        await continueRefresh.promise;
        return activeResult;
      },
    };
    const [first, second] = repositories.map((repo) => new PlayerSeasonStatsService(repo, bser, config));
    t.after(async () => {
      continueRefresh.resolve();
      await pool.query('DELETE FROM player_history.season_stats_refresh_states WHERE nickname_key = $1', [nicknameKey]);
      await pool.query('DELETE FROM player_history.player_lookups WHERE nickname_key = $1', [nicknameKey]);
      await Promise.all(databases.map((database) => database.onModuleDestroy()));
    });

    const leader = first.getStats(nickname, '39', '3');
    await started.promise;
    await assert.rejects(second.refreshStats(nickname, '39', '3'), (error) =>
      error.getStatus() === 429 && error.getResponse().reason === 'refresh_busy');
    const followerClaim = Promise.withResolvers();
    const claim = repositories[1].claimRefresh.bind(repositories[1]);
    t.mock.method(repositories[1], 'claimRefresh', async (scope) => {
      const result = await claim(scope);
      followerClaim.resolve(result.status);
      return result;
    });
    const follower = second.getStats(nickname.toUpperCase(), '39', '3');
    const claimStatus = await followerClaim.promise;
    continueRefresh.resolve();
    const [firstResult, secondResult] = await Promise.all([leader, follower]);
    assert.equal(claimStatus, 'busy');
    assert.deepEqual(secondResult, firstResult);
    assert.equal(upstreamCalls, 1);

    const player = await repositories[0].findByNicknameKey(nicknameKey);
    await pool.query(`UPDATE player_history.player_season_stats SET fetched_at = clock_timestamp() - interval '1 hour'
                      WHERE player_lookup_id = $1`, [player.id]);
    activeResult = { status: 'unavailable', statusCode: 429, retryAfter: 12 };
    assert.equal((await first.getStats(nickname, '39', '3')).isStale, true);
    assert.equal((await second.getStats(nickname, '39', '3')).isStale, true);
    await assert.rejects(second.refreshStats(nickname, '39', '3'), (error) => {
      const response = error.getResponse();
      return error.getStatus() === 429 && response.code === 'BSER_RATE_LIMITED' && response.retryAfter >= 11;
    });
    assert.equal(upstreamCalls, 2);

    await pool.query(`UPDATE player_history.season_stats_refresh_states SET retry_at = clock_timestamp()
                      WHERE nickname_key = $1`, [nicknameKey]);
    activeResult = { status: 'not_found' };
    assert.equal((await second.refreshStats(nickname, '39', '3')).status, 'no_stats');
    activeResult = { status: 'unavailable', statusCode: 503 };
    await assert.rejects(first.refreshStats(nickname, '39', '3'), { status: 502 });
    const empty = await second.getStats(nickname, '39', '3');
    assert.equal(empty.stats, null);
    assert.equal(empty.fetchedAt, null);
    assert.equal(empty.isStale, false);
    assert.equal(upstreamCalls, 4);
  });

test('PostgreSQL upserts stats, rolls back invalid data, and preserves matches',
  { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const database = new PlayerHistoryDatabaseService({
      get: (key) => key === 'DATABASE_URL' ? process.env.TEST_DATABASE_URL : undefined,
    });
    const repository = new PlayerSeasonStatsRepository(database);
    const matches = new PlayerMatchesRepository(database);
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const nickname = `통계테스트-${unique}`;
    const nicknameKey = nickname.toLocaleLowerCase('ko-KR');
    const gameId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const firstAt = new Date('2026-10-13T00:00:00.000Z');
    const secondAt = new Date('2026-10-14T00:00:00.000Z');
    let playerId;
    try {
      const player = await repository.saveResult(nickname, nicknameKey, 39, 3, stats(), firstAt);
      playerId = player.id;
      await repository.saveResult(nickname, nicknameKey, 39, 3, stats(11, 3), secondAt);
      const updated = await repository.findSnapshot(playerId, 39, 3);
      assert.equal(updated.stats.totalGames, 11);
      assert.equal(updated.fetchedAt.toISOString(), secondAt.toISOString());
      const count = await database.getPool().query(
        'SELECT count(*)::int AS count FROM player_history.player_season_stats WHERE player_lookup_id = $1',
        [playerId],
      );
      assert.equal(count.rows[0].count, 1);

      await assert.rejects(repository.saveResult(nickname, nicknameKey, 39, 3, stats(2, 3), new Date()));
      const afterFailure = await repository.findSnapshot(playerId, 39, 3);
      assert.equal(afterFailure.stats.totalGames, 11);
      assert.equal(afterFailure.fetchedAt.toISOString(), secondAt.toISOString());

      await matches.saveSnapshot(nickname, nicknameKey, [{
        gameId, seasonId: 39, matchingMode: 3, matchingTeamMode: 3,
        startedAt: secondAt, characterCode: 1, weaponCode: 2, rank: 1, kills: 3, assists: 4,
      }], secondAt);
      await repository.saveResult(nickname, nicknameKey, 39, 3, stats(), new Date());
      const storedMatches = await matches.listMatches(playerId, 10, null);
      assert.equal(storedMatches.matches.length, 1);
      const changed = await matches.findByNicknameKey(nicknameKey);
      assert.equal(changed.matchesSyncedAt.toISOString(), secondAt.toISOString());
      assert.equal((await repository.findSnapshot(playerId, 39, 3)).stats.totalGames, 10);

      await Promise.all([
        matches.saveSnapshot(nickname, nicknameKey, [], new Date()),
        repository.saveResult(nickname, nicknameKey, 39, 3, stats(12, 3), new Date()),
      ]);
      assert.equal((await matches.listMatches(playerId, 10, null)).matches.length, 1);
      assert.equal((await repository.findSnapshot(playerId, 39, 3)).stats.totalGames, 12);
      const absentAt = new Date(Date.now() + 1_000);
      await repository.saveResult(nickname, nicknameKey, 39, 3, null, absentAt);
      await repository.saveResult(nickname, nicknameKey, 39, 3, stats(), secondAt);
      assert.deepEqual(await repository.findSnapshot(playerId, 39, 3), { stats: null, fetchedAt: absentAt });
      assert.equal(await repository.findSnapshot(playerId, 39, 2), null);
      assert.equal((await matches.listMatches(playerId, 10, null)).matches.length, 1);
      assert.equal(await repository.findLatestRankedSnapshot(playerId), null);

      // 최신 일반 시즌/조회 시각보다 가장 높은 랭크 시즌을 우선합니다.
      await repository.saveResult(nickname, nicknameKey, 42, 3, { ...stats(), seasonId: 42 }, firstAt);
      await repository.saveResult(nickname, nicknameKey, 41, 3, { ...stats(), seasonId: 41 }, secondAt);
      await repository.saveResult(nickname, nicknameKey, 43, 2, { ...stats(), seasonId: 43, matchingMode: 2 }, secondAt);
      const latestRanked = await repository.findLatestRankedSnapshot(playerId);
      assert.equal(latestRanked.stats.seasonId, 42);
      assert.equal(latestRanked.stats.matchingMode, 3);
      assert.equal(latestRanked.fetchedAt.toISOString(), firstAt.toISOString());

      const recoveredAt = new Date(absentAt.getTime() + 1_000);
      await repository.saveResult(nickname, nicknameKey, 39, 3, stats(), recoveredAt);
      await repository.saveResult(nickname, nicknameKey, 39, 3, null, absentAt);
      assert.deepEqual(await repository.findSnapshot(playerId, 39, 3), { stats: stats(), fetchedAt: recoveredAt });
      const absences = await database.getPool().query(
        'SELECT 1 FROM player_history.player_season_stats_absences WHERE player_lookup_id = $1', [playerId],
      );
      assert.equal(absences.rowCount, 0);
    } finally {
      if (playerId) {
        await database.getPool().query('DELETE FROM player_history.player_match_records WHERE player_lookup_id = $1', [playerId]);
        await database.getPool().query('DELETE FROM player_history.player_season_stats WHERE player_lookup_id = $1', [playerId]);
        await database.getPool().query('DELETE FROM player_history.player_lookups WHERE id = $1', [playerId]);
      }
      await database.getPool().query('DELETE FROM player_history.matches WHERE game_id = $1', [gameId]);
      await database.onModuleDestroy();
    }
  });

test('rotating BSER UIDs still leave both nickname-scoped results after sequential and parallel refreshes',
  { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const database = new PlayerHistoryDatabaseService({
      get: (key) => key === 'DATABASE_URL' ? process.env.TEST_DATABASE_URL : undefined,
    });
    const matchesRepository = new PlayerMatchesRepository(database);
    const statsRepository = new PlayerSeasonStatsRepository(database);
    const nickname = `교차-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nicknameKey = nickname.toLocaleLowerCase('ko-KR');
    const gameId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    let nextUid = 0;
    const seenUids = [];
    const bser = {
      findUserByNicknameDetailed: async () => ({
        status: 'found', user: { nickname, userId: `temporary-${++nextUid}` },
      }),
      fetchUserMatchesDetailed: async (uid) => {
        seenUids.push(uid);
        return { status: 'found', games: [{
          gameId, seasonId: 39, matchingMode: 3, matchingTeamMode: 3,
          startDtm: '2026-10-13T09:00:00+0900', characterNum: 1, bestWeapon: 2,
          gameRank: 1, playerKill: 3, playerAssistant: 4,
        }] };
      },
      fetchUserStatsDetailed: async (uid) => {
        seenUids.push(uid);
        return { status: 'found', stats: {
          seasonId: 39, matchingMode: 3, matchingTeamMode: 3,
          totalGames: 10, totalWins: 2, averageRank: 2.4,
        } };
      },
    };
    const config = { get: () => undefined };
    const matches = new PlayerMatchesService(matchesRepository, bser, config);
    const seasonStats = new PlayerSeasonStatsService(statsRepository, bser, config);
    try {
      assert.equal((await matches.getMatches(nickname)).matches.length, 1);
      assert.equal((await seasonStats.getStats(nickname, '39', '3')).stats.totalGames, 10);
      assert.notEqual(seenUids[0], seenUids[1]);

      const refresh = new PlayerRefreshService(matches, seasonStats);
      assert.equal((await refresh.refresh(nickname, { seasonId: 39, matchingMode: 3 })).refreshStatus, 'updated');
      assert.equal(new Set(seenUids).size, 4);

      const lookup = await matchesRepository.findByNicknameKey(nicknameKey);
      assert.equal((await matchesRepository.listMatches(lookup.id, 10, null)).matches.length, 1);
      assert.equal((await statsRepository.findSnapshot(lookup.id, 39, 3)).stats.totalGames, 10);
      assert.ok(lookup.matchesSyncedAt);
    } finally {
      const lookup = await matchesRepository.findByNicknameKey(nicknameKey);
      if (lookup) {
        await database.getPool().query('DELETE FROM player_history.player_match_records WHERE player_lookup_id = $1', [lookup.id]);
        await database.getPool().query('DELETE FROM player_history.player_season_stats WHERE player_lookup_id = $1', [lookup.id]);
        await database.getPool().query('DELETE FROM player_history.player_lookups WHERE id = $1', [lookup.id]);
      }
      await database.getPool().query('DELETE FROM player_history.matches WHERE game_id = $1', [gameId]);
      await database.onModuleDestroy();
    }
  });
