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
      await repository.saveResult(nickname, nicknameKey, 39, 3, null, new Date());
      assert.equal(await repository.findSnapshot(playerId, 39, 3), null);
      assert.equal((await matches.listMatches(playerId, 10, null)).matches.length, 1);
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
