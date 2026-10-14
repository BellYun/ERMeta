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
