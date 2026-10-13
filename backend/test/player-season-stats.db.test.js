const assert = require('node:assert/strict');
const test = require('node:test');
const { PlayerHistoryDatabaseService } = require('../dist/common/database/player-history-database.service');
const { PlayerMatchesRepository } = require('../dist/modules/player-matches/player-matches.repository');
const { PlayerSeasonStatsRepository } = require('../dist/modules/player-season-stats/player-season-stats.repository');

function stats(totalGames = 10, totalWins = 2) {
  return {
    seasonId: 39, matchingMode: 3, matchingTeamMode: 3,
    totalGames, totalWins, winRate: totalWins / totalGames * 100,
    averageRank: 2.4, mmr: 3000, rank: 100, rankSize: 1000,
    rankPercent: 0.1, top3Rate: 0.6, averageKills: 3.2, averageAssistants: 4.1,
    characterStats: [{ characterCode: 1, totalGames: 5, wins: 1, top3Rate: 0.6, averageRank: 2.2 }],
  };
}

test('PostgreSQL upserts stats, rolls back invalid data, and clears records on UID changes',
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
      const player = await repository.saveResult(nickname, nicknameKey, 'uid-one', 39, 3, stats(), firstAt);
      playerId = player.id;
      await repository.saveResult(nickname, nicknameKey, 'uid-one', 39, 3, stats(11, 3), secondAt);
      const updated = await repository.findSnapshot(playerId, 39, 3);
      assert.equal(updated.stats.totalGames, 11);
      assert.equal(updated.fetchedAt.toISOString(), secondAt.toISOString());
      const count = await database.getPool().query(
        'SELECT count(*)::int AS count FROM player_history.player_season_stats WHERE player_lookup_id = $1',
        [playerId],
      );
      assert.equal(count.rows[0].count, 1);

      await assert.rejects(repository.saveResult(nickname, nicknameKey, 'uid-one', 39, 3, stats(2, 3), new Date()));
      const afterFailure = await repository.findSnapshot(playerId, 39, 3);
      assert.equal(afterFailure.stats.totalGames, 11);
      assert.equal(afterFailure.fetchedAt.toISOString(), secondAt.toISOString());

      await matches.saveSnapshot(nickname, nicknameKey, 'uid-one', [{
        gameId, seasonId: 39, matchingMode: 3, matchingTeamMode: 3,
        startedAt: secondAt, characterCode: 1, weaponCode: 2, rank: 1, kills: 3, assists: 4,
      }], secondAt);
      await repository.saveResult(nickname, nicknameKey, 'uid-two', 39, 3, stats(), new Date());
      const noMatches = await matches.listMatches(playerId, 10, null);
      assert.deepEqual(noMatches.matches, []);
      const changed = await matches.findByNicknameKey(nicknameKey);
      assert.equal(changed.matchesSyncedAt, null);
      assert.equal((await repository.findSnapshot(playerId, 39, 3)).stats.totalGames, 10);

      await matches.saveSnapshot(nickname, nicknameKey, 'uid-three', [], new Date());
      assert.equal(await repository.findSnapshot(playerId, 39, 3), null);
      await repository.saveResult(nickname, nicknameKey, 'uid-three', 39, 3, stats(), new Date());
      await repository.saveResult(nickname, nicknameKey, 'uid-three', 39, 3, null, new Date());
      assert.equal(await repository.findSnapshot(playerId, 39, 3), null);
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
