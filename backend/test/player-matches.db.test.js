const assert = require('node:assert/strict');
const test = require('node:test');
const { PlayerHistoryDatabaseService } = require('../dist/common/database/player-history-database.service');
const { PlayerMatchesRepository } = require('../dist/modules/player-matches/player-matches.repository');

test('PostgreSQL prevents duplicates, pages deterministically and rolls back a failed snapshot',
  { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const database = new PlayerHistoryDatabaseService({
      get: (key) => key === 'DATABASE_URL' ? process.env.TEST_DATABASE_URL : undefined,
    });
    const repository = new PlayerMatchesRepository(database);
    const unique = String(Date.now());
    const nickname = `테스트-${unique}`;
    const firstId = Number(unique) * 1000;
    const date = new Date('2026-10-12T01:00:00.000Z');
    const makeGame = (gameId, rank = 1) => ({
      gameId, seasonId: 39, matchingMode: 3, matchingTeamMode: 3, startedAt: date,
      characterCode: 1, weaponCode: 2, rank, kills: 3, assists: 4,
    });
    const syncedAt = new Date('2026-10-13T00:00:00.000Z');
    try {
      const player = await repository.saveSnapshot(nickname, nickname, 'uid-one',
        [makeGame(firstId), makeGame(firstId + 1)], syncedAt);
      await repository.saveSnapshot(nickname, nickname, 'uid-one',
        [makeGame(firstId), makeGame(firstId + 1)], syncedAt);
      const page = await repository.listMatches(player.id, 1, null);
      assert.equal(page.matches[0].gameId, String(firstId + 1));
      assert.equal(page.hasMore, true);
      const next = await repository.listMatches(player.id, 1, {
        startedAt: page.matches[0].startedAt,
        gameId: page.matches[0].gameId,
      });
      assert.equal(next.matches[0].gameId, String(firstId));
      assert.equal(next.hasMore, false);
      const count = await database.getPool().query(
        'SELECT count(*)::int AS count FROM player_history.player_match_records WHERE player_lookup_id = $1',
        [player.id],
      );
      assert.equal(count.rows[0].count, 2);

      await assert.rejects(repository.saveSnapshot(nickname, nickname, 'uid-one',
        [makeGame(firstId + 2), makeGame(firstId + 3, 0)], new Date()));
      const after = await repository.findByNicknameKey(nickname);
      assert.equal(after.matchesSyncedAt.toISOString(), syncedAt.toISOString());
      const countAfter = await database.getPool().query(
        'SELECT count(*)::int AS count FROM player_history.player_match_records WHERE player_lookup_id = $1',
        [player.id],
      );
      assert.equal(countAfter.rows[0].count, 2);

      await repository.saveSnapshot(nickname, nickname, 'uid-two', [makeGame(firstId + 4)], new Date());
      const replaced = await repository.listMatches(player.id, 10, null);
      assert.deepEqual(replaced.matches.map((match) => match.gameId), [String(firstId + 4)]);
    } finally {
      await database.onModuleDestroy();
    }
  });
