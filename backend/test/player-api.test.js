const assert = require('node:assert/strict');
const test = require('node:test');
require('reflect-metadata');

const { playerHistoryPoolOptions } = require('../dist/common/database/player-history-pool-options');

test('local URL and Cloud SQL socket select the expected PostgreSQL connection', () => {
  const local = playerHistoryPoolOptions((name) => ({ DATABASE_URL: 'postgres://user:pass@localhost:5432/ermeta' })[name]);
  assert.equal(local.connectionString, 'postgres://user:pass@localhost:5432/ermeta');
  assert.equal(local.max, 10);

  const cloud = playerHistoryPoolOptions((name) => ({
    DATABASE_URL: 'postgres://ignored', INSTANCE_UNIX_SOCKET: '/cloudsql/project:region:instance',
    DB_USER: 'player', DB_PASS: 'secret', DB_NAME: 'ermeta',
  })[name]);
  assert.equal(cloud.host, '/cloudsql/project:region:instance');
  assert.equal(cloud.user, 'player');
  assert.equal(cloud.database, 'ermeta');
  assert.equal(cloud.max, 5);
  assert.equal(cloud.connectionString, undefined);
  assert.throws(() => playerHistoryPoolOptions(() => undefined), /DATABASE_URL/);
  assert.throws(() => playerHistoryPoolOptions((name) => ({ INSTANCE_UNIX_SOCKET: '/cloudsql/test' })[name]), /DB_USER/);
});

test('player-only app boots without Supabase or Redis and exposes health routes', async () => {
  const { NestFactory } = require('@nestjs/core');
  const { PlayerApiModule } = require('../dist/player-api/player-api.module');
  const names = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'REDIS_HOST', 'DATABASE_URL', 'INSTANCE_UNIX_SOCKET', 'BSER_API_KEY'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  for (const name of names) delete process.env[name];
  const app = await NestFactory.create(PlayerApiModule, { logger: false });
  try {
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address();
    const base = `http://127.0.0.1:${port}`;
    const live = await fetch(`${base}/health/live`);
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { status: 'ok' });
    const ready = await fetch(`${base}/health/ready`);
    assert.equal(ready.status, 503);
    assert.equal((await ready.json()).code, 'BSER_API_KEY_NOT_CONFIGURED');
    process.env.BSER_API_KEY = 'test-key';
    const dbReady = await fetch(`${base}/health/ready`);
    assert.equal(dbReady.status, 503);
    assert.equal((await dbReady.json()).code, 'PLAYER_DATABASE_NOT_READY');

    const invalid = await fetch(`${base}/v1/players/compare`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nicknames: [] }),
    });
    assert.equal(invalid.status, 400);
    const invalidRefresh = await fetch(`${base}/v1/players/test/refresh`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    });
    assert.equal(invalidRefresh.status, 400);
    const invalidDetail = await fetch(`${base}/v1/players/test/matches/9223372036854775808`);
    assert.equal(invalidDetail.status, 400);
    assert.equal((await invalidDetail.json()).code, 'INVALID_GAME_ID');
    const unknown = await fetch(`${base}/multi-search/players`, { method: 'POST' });
    assert.equal(unknown.status, 404);
  } finally {
    await app.close();
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});

test('player match detail serves indexed stored records without refreshing them',
  { skip: !process.env.TEST_DATABASE_URL }, async (t) => {
    const { NestFactory } = require('@nestjs/core');
    const { ConfigService } = require('@nestjs/config');
    const { Pool } = require('pg');
    const { PlayerApiModule } = require('../dist/player-api/player-api.module');
    const { PlayerHistoryDatabaseService } = require('../dist/common/database/player-history-database.service');
    const { PlayerMatchesRepository } = require('../dist/modules/player-matches/player-matches.repository');
    const { BserApiService } = require('../dist/modules/collect/bser-api.service');
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const app = await NestFactory.create(PlayerApiModule, { logger: false });
    try {
      t.mock.method(app.get(PlayerHistoryDatabaseService), 'getPool', () => pool);
      app.get(ConfigService).set('BSER_API_KEY', 'test-key');
      const bser = app.get(BserApiService);
      const rejectRefresh = () => { throw new Error('Unexpected BSER request'); };
      const lookup = t.mock.method(bser, 'findUserByNicknameDetailed', rejectRefresh);
      const recent = t.mock.method(bser, 'fetchUserMatchesDetailed', rejectRefresh);
      const detail = t.mock.method(bser, 'fetchGame', rejectRefresh);
      const repository = app.get(PlayerMatchesRepository);
      const gameId = Date.now() * 1000 + 100;
      const nickname = `Detail-${gameId}`;
      const startedAt = new Date('2026-10-12T01:00:00.000Z');
      const summary = {
        gameId, seasonId: 39, matchingMode: 3, matchingTeamMode: 3, startedAt,
        characterCode: 1, weaponCode: 2, rank: 1, kills: 3, assists: 4,
      };
      const details = { equipment: { 0: 12345 }, damageToPlayer: 3010, mmrGain: -20 };
      await repository.saveSnapshot(nickname, nickname.toLowerCase(), [
        { ...summary, details }, { ...summary, gameId: gameId + 1 },
      ], startedAt);
      await repository.saveSnapshot('Other', `other-${gameId}`, [{ ...summary, gameId: gameId + 1 }], startedAt);

      await app.listen(0, '127.0.0.1');
      const { port } = app.getHttpServer().address();
      const base = `http://127.0.0.1:${port}`;
      assert.equal((await fetch(`${base}/health/ready`)).status, 200);
      const request = (name, id) => fetch(`${base}/v1/players/${encodeURIComponent(name)}/matches/${id}`);
      const current = await request(` ${nickname.toUpperCase()} `, gameId);
      assert.equal(current.status, 200);
      assert.deepEqual(await current.json(), {
        nickname, match: { ...summary, gameId: String(gameId), startedAt: startedAt.toISOString() }, details,
      });

      const legacy = await request(nickname, gameId + 1);
      assert.equal(legacy.status, 200);
      assert.equal((await legacy.json()).details, null);
      const missing = await request(`other-${gameId}`, gameId);
      assert.equal(missing.status, 404);
      assert.equal((await missing.json()).code, 'MATCH_NOT_FOUND');
      for (const method of [lookup, recent, detail]) assert.equal(method.mock.callCount(), 0);
    } finally {
      await app.close();
      await pool.end();
    }
  });

test('player-only app enforces route rate limits without Redis', async () => {
  const { NestFactory } = require('@nestjs/core');
  const { PlayerApiModule } = require('../dist/player-api/player-api.module');
  const app = await NestFactory.create(PlayerApiModule, { logger: false });
  try {
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address();
    const url = `http://127.0.0.1:${port}/v1/players/compare`;
    let response;
    for (let index = 0; index < 31; index += 1) {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.30' },
        body: JSON.stringify({ nicknames: [] }),
      });
    }
    assert.equal(response.status, 429);
    assert.equal((await response.json()).code, 'RATE_LIMITED');
    assert.ok(Number(response.headers.get('retry-after')) > 0);
  } finally {
    await app.close();
  }
});
