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
  const lookup = createBserLookup('test-key', 1, 0, {
    request: async (url) => new Response(fixtures.get(Number(url.split('/').at(-1)))),
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

test('collects only the configured ranked season and revisits ambiguous season metadata', async () => {
  const ranked = rawMatch(100, 3, { seasonId: 43 });
  const fixtures = new Map([
    [100, ranked],
    [101, rawMatch(101, 3, { seasonId: 42 })],
    [102, rawMatch(102, 3)],
    [103, JSON.stringify({
      code: 200,
      userGames: [
        { gameId: 103, matchingMode: 3, seasonId: 43 },
        { gameId: 103, matchingMode: 3, seasonId: 42 },
      ],
    })],
    [104, rawMatch(104, 2, { seasonId: 43 })],
    [105, rawMatch(105, 3, { seasonId: 42, startDtm: new Date().toISOString() })],
  ]);
  const lookup = createBserLookup('test-key', 1, 3_600_000, {
    targetSeasonId: 43,
    request: async (url) => new Response(fixtures.get(Number(url.split('/').at(-1)))),
  });
  const signal = new AbortController().signal;
  const result = await lookup(100, signal);
  assert.equal(result.status, 'ranked');
  assert.equal(result.seasonId, 43);
  assert.deepEqual(gunzipSync(result.payload), ranked);
  assert.equal((await lookup(101, signal)).status, 'skipped');
  assert.equal((await lookup(102, signal)).status, 'deferred');
  assert.equal((await lookup(103, signal)).status, 'deferred');
  assert.equal((await lookup(104, signal)).status, 'skipped');
  assert.equal((await lookup(105, signal)).status, 'deferred');
});

test('skips only a JSON code of 404 and defers recently started games in both modes', async () => {
  const fixtures = new Map([
    [100, Response.json({ code: 404 })],
    [101, new Response(null, { status: 429, headers: { 'Retry-After': '42' } })],
    [102, new Response(rawMatch(999, 3))],
    [103, new Response(rawMatch(103, 3, { startDtm: new Date().toISOString() }))],
    [104, Response.json({ message: 'not found' }, { status: 404 })],
    [105, Response.json({ code: 404 }, { status: 404 })],
    [106, new Response(rawMatch(106, 2, { startDtm: new Date().toISOString() }))],
    [107, new Response(null, { status: 404 })],
    [108, Response.json({ code: 200, userGames: [] })],
  ]);
  const lookup = createBserLookup('test-key', 1, 3_600_000, {
    request: async (url) => fixtures.get(Number(url.split('/').at(-1))),
  });
  const signal = new AbortController().signal;
  assert.equal((await lookup(100, signal)).status, 'skipped');
  await assert.rejects(lookup(101, signal), { message: /HTTP 429/, retryMs: 42_000 });
  await assert.rejects(lookup(102, signal), /game ID or matching mode is inconsistent/);
  assert.equal((await lookup(103, signal)).status, 'deferred');
  await assert.rejects(lookup(104, signal), /HTTP 404 without code=404/);
  assert.equal((await lookup(105, signal)).status, 'skipped');
  assert.equal((await lookup(106, signal)).status, 'deferred');
  await assert.rejects(lookup(107, signal), /invalid JSON/);
  assert.equal((await lookup(108, signal)).status, 'deferred');
});

const testDatabase = process.env.TEST_MATCH_COLLECTION_DATABASE_URL;
test('PostgreSQL skips body 404s, resumes at a recent game and rolls back failed saves', { skip: !testDatabase }, async () => {
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

    const ranked = rawMatch(100, 3, { seasonId: 43 });
    const laterRanked = rawMatch(125, 3, { seasonId: 43 });
    const fixtures = new Map([
      [100, ranked],
      [124, rawMatch(124, 3, { seasonId: 42 })],
      [125, 404],
      [127, rawMatch(127, 2, { startDtm: new Date().toISOString() })],
      [128, rawMatch(128, 3, { seasonId: 42, startDtm: new Date().toISOString() })],
    ]);
    const requests = [];
    const lookup = createBserLookup('test-key', 1, 3_600_000, {
      targetSeasonId: 43,
      request: async (url) => {
        const gameId = Number(url.split('/').at(-1));
        requests.push(gameId);
        const fixture = fixtures.get(gameId);
        if (fixture === 404) return Response.json({ message: 'not found' }, { status: 404 });
        return fixture ? new Response(fixture) : Response.json({ code: 404 });
      },
    });
    const config = { startGameId: '100', once: true, signal: new AbortController().signal };
    const cursor = async () => (await client.query('SELECT next_game_id FROM match_collection.cursor')).rows[0].next_game_id;
    const collected = async () => (await client.query(
      'SELECT game_id, payload_gzip FROM match_collection.raw_matches ORDER BY game_id',
    )).rows;

    await assert.rejects(run(client, lookup, config), /HTTP 404 without code=404/);
    assert.deepEqual(requests, Array.from({ length: 26 }, (_, index) => 100 + index));
    assert.equal(await cursor(), '125');
    assert.deepEqual((await collected()).map((r) => r.game_id), ['100']);
    assert.deepEqual(gunzipSync((await collected())[0].payload_gzip), ranked);
    const { rows: [pending] } = await client.query("SELECT to_regclass('match_collection.pending_games') AS name");
    assert.equal(pending.name, null);

    await client.end();
    client = await connect();
    fixtures.set(101, rawMatch(101, 3, { seasonId: 43 }));
    fixtures.set(125, laterRanked);
    // Force a failure after the raw insert to verify that the insert and cursor roll back together.
    await client.query(`
      ALTER TABLE match_collection.cursor ADD CONSTRAINT simulate_failure CHECK (next_game_id <= 125)
    `);
    const resumed = { ...config, startGameId: undefined };
    requests.length = 0;
    await assert.rejects(run(client, lookup, resumed), /simulate_failure/);
    assert.deepEqual(requests, [125]);
    assert.equal(await cursor(), '125');
    assert.deepEqual((await collected()).map((r) => r.game_id), ['100']);

    await client.query('ALTER TABLE match_collection.cursor DROP CONSTRAINT simulate_failure');
    requests.length = 0;
    await run(client, lookup, resumed);
    assert.deepEqual(requests, [125, 126, 127]);
    assert.equal(await cursor(), '127', 'stop at the recent normal game after skipping 126');
    assert.deepEqual((await collected()).map((r) => gunzipSync(r.payload_gzip)), [ranked, laterRanked]);

    fixtures.set(127, rawMatch(127, 2, { startDtm: new Date(Date.now() - 3_600_000).toISOString() }));
    requests.length = 0;
    await run(client, lookup, resumed);
    assert.deepEqual(requests, [127, 128]);
    assert.equal(await cursor(), '128');

    await client.query('UPDATE match_collection.cursor SET next_game_id = 125');
    await run(client, lookup, resumed);
    assert.equal(await cursor(), '128');
    assert.deepEqual((await collected()).map((r) => r.game_id), ['100', '125']);
  } finally {
    await client.end();
  }
});
