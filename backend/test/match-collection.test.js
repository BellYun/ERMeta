const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { test } = require('node:test');
const { gunzipSync } = require('node:zlib');
const { Client } = require('pg');
const { createBserLookup, run } = require('../scripts/collect-matches');

function rawMatch(gameId, matchingMode, extra = {}) {
  return Buffer.from(JSON.stringify({
    code: 200,
    userGames: [{ gameId, matchingMode, versionSeason: 13, versionMajor: 0, versionMinor: 0, ...extra }],
  }, null, 2));
}

test('keeps exact ranked JSON bytes and skips both non-ranked modes', async () => {
  const ranked = rawMatch(100, 3, { timeSpentInBriefingRoom: 92 });
  const fixtures = new Map([[100, ranked], [101, rawMatch(101, 2)], [102, rawMatch(102, 6)]]);
  const lookup = createBserLookup('test-key', 1, 0, async (url) => {
    return new Response(fixtures.get(Number(url.split('/').at(-1))));
  });
  const signal = new AbortController().signal;
  const result = await lookup(100, signal);
  assert.equal(result.status, 'ranked');
  assert.equal(result.patchVersion, '13.0.0');
  assert.equal(result.seasonId, null);
  assert.deepEqual(gunzipSync(result.payload), ranked);
  assert.equal((await lookup(101, signal)).status, 'skipped');
  assert.equal((await lookup(102, signal)).status, 'skipped');
});

test('distinguishes 404, throttling, inconsistent rows and a recently started ranked game', async () => {
  const fixtures = new Map([
    [100, new Response(null, { status: 404 })],
    [101, new Response(null, { status: 429, headers: { 'Retry-After': '42' } })],
    [102, new Response(rawMatch(999, 3))],
    [103, new Response(rawMatch(103, 3, { startDtm: new Date().toISOString() }))],
  ]);
  const lookup = createBserLookup('test-key', 1, 3_600_000, async (url) => {
    return fixtures.get(Number(url.split('/').at(-1)));
  });
  const signal = new AbortController().signal;
  assert.equal((await lookup(100, signal)).status, 'missing');
  await assert.rejects(lookup(101, signal), { message: /HTTP 429/, retryMs: 42_000 });
  await assert.rejects(lookup(102, signal), /game ID or matching mode is inconsistent/);
  assert.equal((await lookup(103, signal)).status, 'deferred');
});

const testDatabase = process.env.TEST_MATCH_COLLECTION_DATABASE_URL;
test('PostgreSQL preserves progress, retries gaps and rolls back an interrupted save', { skip: !testDatabase }, async () => {
  const connect = async () => {
    const client = new Client({ connectionString: testDatabase });
    await client.connect();
    return client;
  };

  let client = await connect();
  try {
    const { rows: [schema] } = await client.query("SELECT to_regnamespace('match_collection') AS name");
    assert.equal(schema.name, null, 'Use an empty test database');
    const sql = await readFile(join(__dirname, '../migrations/match_collection/001_initial.sql'), 'utf8');
    await client.query(sql);
    await client.query(sql);

    const ranked = rawMatch(100, 3);
    const delayedRanked = rawMatch(101, 3);
    const laterRanked = rawMatch(103, 3);
    const fixtures = new Map([[100, ranked], [102, rawMatch(102, 2)], [103, 503]]);
    const requests = [];
    const lookup = createBserLookup('test-key', 1, 0, async (url) => {
      const gameId = Number(url.split('/').at(-1));
      requests.push(gameId);
      const fixture = fixtures.get(gameId) ?? 404;
      return typeof fixture === 'number' ? new Response(null, { status: fixture }) : new Response(fixture);
    });
    const config = { startGameId: '100', lookahead: 3, once: true, signal: new AbortController().signal };
    const cursor = async () => (await client.query('SELECT next_game_id FROM match_collection.cursor')).rows[0].next_game_id;
    const collected = async () => (await client.query(
      'SELECT game_id, payload_gzip FROM match_collection.raw_matches ORDER BY game_id',
    )).rows;

    await assert.rejects(run(client, lookup, config), /HTTP 503/);
    assert.deepEqual(requests, [100, 101, 102, 103]);
    assert.equal(await cursor(), '103');
    assert.deepEqual((await collected()).map((r) => r.game_id), ['100']);
    assert.deepEqual(gunzipSync((await collected())[0].payload_gzip), ranked);
    assert.equal((await client.query('SELECT game_id FROM match_collection.pending_games')).rows[0].game_id, '101');

    await client.end();
    client = await connect();
    await client.query('UPDATE match_collection.pending_games SET retry_at = now()');
    fixtures.set(101, delayedRanked);
    fixtures.set(103, laterRanked);
    // Force a failure after the raw insert to verify that the insert and cursor roll back together.
    await client.query(`
      ALTER TABLE match_collection.cursor ADD CONSTRAINT simulate_failure CHECK (next_game_id <= 103)
    `);
    const resumed = { ...config, startGameId: undefined };
    requests.length = 0;
    await assert.rejects(run(client, lookup, resumed), /simulate_failure/);
    assert.deepEqual(requests, [101, 103]);
    assert.equal(await cursor(), '103');
    assert.deepEqual((await collected()).map((r) => r.game_id), ['100', '101']);

    await client.query('ALTER TABLE match_collection.cursor DROP CONSTRAINT simulate_failure');
    requests.length = 0;
    await run(client, lookup, resumed);
    assert.deepEqual(requests, [103, 104, 105, 106]);
    assert.equal(await cursor(), '104', 'live edge 404s remain ahead of the cursor');
    assert.equal((await client.query('SELECT game_id FROM match_collection.pending_games')).rowCount, 0);
    assert.deepEqual((await collected()).map((r) => gunzipSync(r.payload_gzip)), [ranked, delayedRanked, laterRanked]);

    await client.query('UPDATE match_collection.cursor SET next_game_id = 100');
    await run(client, lookup, resumed);
    assert.equal(await cursor(), '104');
    assert.deepEqual((await collected()).map((r) => r.game_id), ['100', '101', '103']);
  } finally {
    await client.end();
  }
});
