const assert = require('node:assert/strict');
const test = require('node:test');
const { PlayerHistoryDatabaseService } = require('../dist/common/database/player-history-database.service');
const { PlayerMatchesRepository } = require('../dist/modules/player-matches/player-matches.repository');

test('PostgreSQL aggregates only the selected season and mode, handles upserts, and resets on UID changes',
  { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const database = new PlayerHistoryDatabaseService({
      get: (key) => key === 'DATABASE_URL' ? process.env.TEST_DATABASE_URL : undefined,
    });
    const repository = new PlayerMatchesRepository(database);
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const nickname = `집계테스트-${unique}`;
    const nicknameKey = nickname.toLocaleLowerCase('ko-KR');
    const baseId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const dates = [
      new Date('2026-10-10T00:00:00Z'),
      new Date('2026-10-11T00:00:00Z'),
      new Date('2026-10-12T00:00:00Z'),
    ];
    const game = (offset, seasonId, matchingMode, rank, kills, assists, startedAt = dates[0]) => ({
      gameId: baseId + offset, seasonId, matchingMode, matchingTeamMode: 3,
      startedAt, characterCode: 1, weaponCode: 2, rank, kills, assists,
    });
    const selected = [
      game(0, 39, 3, 1, 1, 2, dates[0]),
      game(1, 39, 3, 3, 3, 4, dates[1]),
      game(2, 39, 3, 4, 5, 6, dates[2]),
    ];
    let playerId;
    try {
      const player = await repository.saveSnapshot(nickname, nicknameKey, 'uid-one', [
        ...selected, game(3, 38, 3, 1, 99, 99), game(4, 39, 2, 1, 99, 99),
      ], new Date());
      playerId = player.id;
      await repository.saveSnapshot(nickname, nicknameKey, 'uid-one', selected, new Date());
      const aggregate = await repository.aggregateMatches(playerId, 39, 3);
      assert.equal(aggregate.sampleSize, 3);
      assert.equal(aggregate.wins, 1);
      assert.equal(aggregate.top3, 2);
      assert.ok(Math.abs(aggregate.averageRank - 8 / 3) < 0.000001);
      assert.equal(aggregate.averageKills, 3);
      assert.equal(aggregate.averageAssists, 4);
      assert.equal(aggregate.periodStart.toISOString(), dates[0].toISOString());
      assert.equal(aggregate.periodEnd.toISOString(), dates[2].toISOString());

      const empty = await repository.aggregateMatches(playerId, 37, 3);
      assert.equal(empty.sampleSize, 0);
      assert.equal(empty.averageRank, null);
      assert.equal(empty.periodStart, null);

      await repository.saveSnapshot(nickname, nicknameKey, 'uid-two', [
        game(5, 39, 3, 2, 7, 8, dates[2]),
      ], new Date());
      const replaced = await repository.aggregateMatches(playerId, 39, 3);
      assert.equal(replaced.sampleSize, 1);
      assert.equal(replaced.wins, 0);
      assert.equal(replaced.averageKills, 7);
    } finally {
      if (playerId) {
        await database.getPool().query('DELETE FROM player_history.player_match_records WHERE player_lookup_id = $1', [playerId]);
        await database.getPool().query('DELETE FROM player_history.player_lookups WHERE id = $1', [playerId]);
      }
      await database.getPool().query(
        'DELETE FROM player_history.matches WHERE game_id BETWEEN $1 AND $2', [baseId, baseId + 5],
      );
      await database.onModuleDestroy();
    }
  });
