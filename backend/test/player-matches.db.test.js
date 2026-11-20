const assert = require('node:assert/strict');
const test = require('node:test');
const { PlayerHistoryDatabaseService } = require('../dist/common/database/player-history-database.service');
const { PlayerMatchesRepository } = require('../dist/modules/player-matches/player-matches.repository');
const { PlayerMatchesService } = require('../dist/modules/player-matches/player-matches.service');

test('a replaced refresh lease cannot save a snapshot or release the new owner',
  { skip: !process.env.TEST_DATABASE_URL }, async (t) => {
    const config = { get: (key) => key === 'DATABASE_URL' ? process.env.TEST_DATABASE_URL : undefined };
    const databases = [new PlayerHistoryDatabaseService(config), new PlayerHistoryDatabaseService(config)];
    const [first, second] = databases.map((database) => new PlayerMatchesRepository(database));
    const pool = databases[0].getPool();
    const nickname = `Lease-${Date.now()}`;
    const nicknameKey = nickname.toLowerCase();
    t.after(async () => {
      await pool.query('DELETE FROM player_history.match_refresh_leases WHERE nickname_key = $1', [nicknameKey]);
      await pool.query('DELETE FROM player_history.player_lookups WHERE nickname_key = $1', [nicknameKey]);
      await Promise.all(databases.map((database) => database.onModuleDestroy()));
    });

    const old = await first.claimRefresh(nicknameKey);
    assert.ok(old);
    assert.equal(await second.claimRefresh(nicknameKey), null);
    await pool.query(`UPDATE player_history.match_refresh_leases SET lease_until = clock_timestamp()
                      WHERE nickname_key = $1`, [nicknameKey]);
    const current = await second.claimRefresh(nicknameKey);
    assert.ok(current);
    assert.notEqual(current, old);

    await first.releaseRefresh(nicknameKey, old);
    assert.equal(await first.claimRefresh(nicknameKey), null);
    await assert.rejects(first.saveSnapshot(nickname, nicknameKey, [], new Date(), old), /lease lost/);
    assert.equal(await first.findByNicknameKey(nicknameKey), null);

    const saved = await second.saveSnapshot(nickname, nicknameKey, [], new Date(), current);
    assert.ok(saved.matchesSyncedAt);
    assert.ok(await first.claimRefresh(nicknameKey));
  });

test('independent instances share a cold match refresh and can retry after a failure',
  { skip: !process.env.TEST_DATABASE_URL, timeout: 5000 }, async (t) => {
    const config = { get: (key) => key === 'DATABASE_URL' ? process.env.TEST_DATABASE_URL : undefined };
    const databases = [new PlayerHistoryDatabaseService(config), new PlayerHistoryDatabaseService(config)];
    const repositories = databases.map((database) => new PlayerMatchesRepository(database));
    const pool = databases[0].getPool();
    const nickname = `SharedRefresh-${Date.now()}`;
    const nicknameKey = nickname.toLowerCase();
    const started = Promise.withResolvers();
    const continueRefresh = Promise.withResolvers();
    let lookups = 0;
    let fetches = 0;
    let fail = false;
    const bser = {
      async findUserByNicknameDetailed() {
        lookups += 1;
        started.resolve();
        await continueRefresh.promise;
        return fail ? { status: 'unavailable', statusCode: 503 }
          : { status: 'found', user: { nickname, userId: 'fixture-uid' } };
      },
      async fetchUserMatchesDetailed() {
        fetches += 1;
        return { status: 'found', games: [] };
      },
    };
    const [first, second] = repositories.map((repo) => new PlayerMatchesService(repo, bser, config));
    t.after(async () => {
      continueRefresh.resolve();
      await pool.query('DELETE FROM player_history.match_refresh_leases WHERE nickname_key = $1', [nicknameKey]);
      await pool.query('DELETE FROM player_history.player_lookups WHERE nickname_key = $1', [nicknameKey]);
      await Promise.all(databases.map((database) => database.onModuleDestroy()));
    });

    const leader = first.getMatches(nickname);
    await started.promise;
    await assert.rejects(second.refreshMatches(nickname), (error) => {
      return error.getStatus() === 429 && error.getResponse().reason === 'refresh_busy';
    });
    const claimFinished = Promise.withResolvers();
    const claim = repositories[1].claimRefresh.bind(repositories[1]);
    t.mock.method(repositories[1], 'claimRefresh', async (key) => {
      const token = await claim(key);
      claimFinished.resolve(token);
      return token;
    });
    const follower = second.getMatches(nickname.toUpperCase());
    const token = await claimFinished.promise;
    continueRefresh.resolve();
    const [firstResult, secondResult] = await Promise.all([leader, follower]);
    assert.equal(token, null);
    assert.deepEqual(secondResult, firstResult);
    assert.equal(lookups, 1);
    assert.equal(fetches, 1);

    fail = true;
    await assert.rejects(first.refreshMatches(nickname), { status: 502 });
    fail = false;
    const retried = await second.refreshMatches(nickname);
    assert.ok(retried.lastSyncedAt);
    assert.equal(lookups, 3);
    assert.equal(fetches, 2);
  });

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
      const player = await repository.saveSnapshot(nickname, nickname,
        [{ ...makeGame(firstId), details: { equipment: { 0: 12345 }, mmrGain: -20 } },
          makeGame(firstId + 1)], syncedAt);
      await repository.saveSnapshot(nickname, nickname,
        [makeGame(firstId), makeGame(firstId + 1)], syncedAt);
      await repository.saveSnapshot(nickname, nickname,
        [{ ...makeGame(firstId), details: { mmrAfter: 5200 } }], syncedAt);
      const stored = await database.getPool().query(
        `SELECT details FROM player_history.player_match_records
         WHERE player_lookup_id = $1 ORDER BY game_id`, [player.id],
      );
      assert.deepEqual(stored.rows, [
        { details: { equipment: { 0: 12345 }, mmrAfter: 5200, mmrGain: -20 } },
        { details: null },
      ]);
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

      await assert.rejects(repository.saveSnapshot(nickname, nickname,
        [makeGame(firstId + 2), makeGame(firstId + 3, 0)], new Date()));
      const after = await repository.findByNicknameKey(nickname);
      assert.equal(after.matchesSyncedAt.toISOString(), syncedAt.toISOString());
      const countAfter = await database.getPool().query(
        'SELECT count(*)::int AS count FROM player_history.player_match_records WHERE player_lookup_id = $1',
        [player.id],
      );
      assert.equal(countAfter.rows[0].count, 2);

      await repository.saveSnapshot(nickname, nickname, [makeGame(firstId + 4)], new Date());
      const accumulated = await repository.listMatches(player.id, 10, null);
      assert.deepEqual(accumulated.matches.map((match) => match.gameId),
        [String(firstId + 4), String(firstId + 1), String(firstId)]);
    } finally {
      await database.onModuleDestroy();
    }
  });
