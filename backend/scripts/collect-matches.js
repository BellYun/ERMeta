const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');
const { gzipSync } = require('node:zlib');
const { Client } = require('pg');

const LOCK_ID = 372001;
const BATCH_SIZE = 50;
const PENDING_BATCH_SIZE = 5;
const POLL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;

class RetryableBserError extends Error {
  constructor(message, retryMs = 0) {
    super(message);
    this.retryMs = retryMs;
  }
}

function readInteger(value, name, min, max) {
  const number = Number(value);
  if (!/^\d+$/.test(value ?? '') || !Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return number;
}

function retryDelay(header) {
  if (!header) return 0;
  const delay = /^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - Date.now();
  // Node timers cannot represent larger delays.
  return Number.isFinite(delay) ? Math.min(2_147_483_647, Math.max(0, delay)) : 0;
}

function createBserLookup(apiKey, intervalMs, settleMs, request = fetch) {
  let nextRequestAt = 0;
  return async (gameId, signal) => {
    await sleep(Math.max(0, nextRequestAt - Date.now()), undefined, { signal });
    nextRequestAt = Date.now() + intervalMs;
    const fetchedAt = new Date();
    const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
    let response;
    let bytes;
    try {
      response = await request(`https://open-api.bser.io/v1/games/${gameId}`, {
        headers: { accept: 'application/json', 'x-api-key': apiKey },
        redirect: 'error',
        signal: requestSignal,
      });
      if (response.ok) bytes = Buffer.from(await response.arrayBuffer());
      else await response.body?.cancel();
    } catch (error) {
      signal.throwIfAborted();
      throw new RetryableBserError(`BSER request failed for game ${gameId}: ${error.message}`);
    }

    if (response.status === 404) return { status: 'missing' };
    const retryAfter = response.headers.get('Retry-After');
    if (response.status === 429 || response.status === 408 || response.status >= 500 ||
        (response.status === 403 && retryAfter)) {
      throw new RetryableBserError(`BSER HTTP ${response.status} for game ${gameId}`, retryDelay(retryAfter));
    }
    if (!response.ok) throw new Error(`BSER HTTP ${response.status} for game ${gameId}`);

    let result;
    try {
      result = JSON.parse(bytes);
    } catch {
      throw new RetryableBserError(`BSER returned invalid JSON for game ${gameId}`);
    }
    if (result?.code === 404) return { status: 'missing' };
    if (result?.code === 429 || result?.code === 408 || result?.code >= 500) {
      throw new RetryableBserError(`BSER code ${result.code} for game ${gameId}`, retryDelay(retryAfter));
    }
    if (result?.code !== 200 || !Array.isArray(result.userGames)) {
      throw new Error(`Unexpected BSER response for game ${gameId}`);
    }
    if (result.userGames.length === 0) return { status: 'missing' };

    const first = result.userGames[0];
    if (!Number.isInteger(first?.matchingMode) || !result.userGames.every(
      (row) => row?.gameId === gameId && row.matchingMode === first.matchingMode,
    )) {
      throw new Error(`BSER game ID or matching mode is inconsistent for game ${gameId}`);
    }
    if (first.matchingMode !== 3) return { status: 'skipped' };

    const startedAt = Date.parse(first.startDtm);
    if (settleMs > 0 && Number.isFinite(startedAt) && fetchedAt.getTime() - startedAt < settleMs) {
      return { status: 'deferred' };
    }

    const version = [first.versionSeason, first.versionMajor, first.versionMinor];
    const seasonId = Number.isInteger(first.seasonId) && first.seasonId >= 0 && first.seasonId <= 2_147_483_647
      ? first.seasonId : null;
    return {
      status: 'ranked',
      seasonId,
      patchVersion: version.every((part) => Number.isSafeInteger(part) && part >= 0) ? version.join('.') : null,
      fetchedAt,
      payload: gzipSync(bytes),
    };
  };
}

async function saveResult(client, gameId, result, nextGameId, gaps = []) {
  await client.query('BEGIN');
  try {
    if (result.status === 'ranked') {
      await client.query(
        `INSERT INTO match_collection.raw_matches
          (game_id, matching_mode, season_id, patch_version, fetched_at, payload_gzip)
         VALUES ($1, 3, $2, $3, $4, $5) ON CONFLICT (game_id) DO NOTHING`,
        [gameId, result.seasonId, result.patchVersion, result.fetchedAt, result.payload],
      );
    }
    await client.query('DELETE FROM match_collection.pending_games WHERE game_id = $1', [gameId]);

    if (nextGameId !== undefined) {
      if (gaps.length) {
        await client.query(
          `INSERT INTO match_collection.pending_games (game_id)
           SELECT unnest($1::bigint[]) ON CONFLICT (game_id) DO NOTHING`,
          [gaps],
        );
      }
      await client.query('UPDATE match_collection.cursor SET next_game_id = $1', [nextGameId]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function collectBatch(client, lookup, lookahead, signal) {
  const { rows: pending } = await client.query(
    `SELECT game_id FROM match_collection.pending_games
     WHERE retry_at <= now() ORDER BY retry_at, game_id LIMIT $1`,
    [PENDING_BATCH_SIZE],
  );
  for (const row of pending) {
    signal.throwIfAborted();
    const gameId = Number(row.game_id);
    const result = await lookup(gameId, signal);
    if (result.status === 'missing' || result.status === 'deferred') {
      await client.query(
        `UPDATE match_collection.pending_games
         SET attempts = LEAST(attempts + 1, 8),
             retry_at = now() + LEAST(21600, 300 * (1 << LEAST(attempts, 7))) * interval '1 second'
         WHERE game_id = $1`,
        [gameId],
      );
    } else {
      await saveResult(client, gameId, result);
    }
  }

  const { rows: [cursor] } = await client.query('SELECT next_game_id FROM match_collection.cursor');
  let gameId = Number(cursor.next_game_id);
  const gaps = [];
  for (let scanned = 0; scanned < BATCH_SIZE || gaps.length > 0; scanned += 1, gameId += 1) {
    signal.throwIfAborted();
    const result = await lookup(gameId, signal);
    if (result.status === 'deferred') return false;
    if (result.status === 'missing') {
      gaps.push(gameId);
      // A trailing run of 404s may be the live edge. Advance only after a later game is confirmed.
      if (gaps.length >= lookahead) return false;
      continue;
    }
    await saveResult(client, gameId, result, gameId + 1, gaps);
    gaps.length = 0;
  }
  return true;
}

async function run(client, lookup, { startGameId, lookahead, once, signal }) {
  const { rows: [lock] } = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [LOCK_ID]);
  if (!lock.acquired) throw new Error('A match collector is already running on this database');

  try {
    const cursor = await client.query('SELECT next_game_id FROM match_collection.cursor');
    if (!cursor.rowCount) {
      const initialId = readInteger(startGameId, 'MATCH_COLLECTION_START_GAME_ID', 1, Number.MAX_SAFE_INTEGER - 1);
      await client.query('INSERT INTO match_collection.cursor (next_game_id) VALUES ($1)', [initialId]);
    }

    while (!signal.aborted) {
      try {
        const more = await collectBatch(client, lookup, lookahead, signal);
        if (once) return;
        if (!more) await sleep(POLL_MS, undefined, { signal });
      } catch (error) {
        if (signal.aborted) return;
        if (once || !(error instanceof RetryableBserError)) throw error;
        console.warn(error.message);
        await sleep(Math.max(POLL_MS, error.retryMs), undefined, { signal });
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
  }
}

async function main() {
  const [command, ...extra] = process.argv.slice(2);
  if (extra.length || (command && !['--once', '--migrate'].includes(command))) {
    throw new Error('Usage: collect-matches.js [--once | --migrate]');
  }
  const connectionString = process.env.MATCH_COLLECTION_DATABASE_URL?.trim();
  if (!connectionString) throw new Error('MATCH_COLLECTION_DATABASE_URL is required');

  const shutdown = new AbortController();
  const stop = () => shutdown.abort();
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000, application_name: 'ermeta-match-collector' });
  let connectionError;
  client.on('error', (error) => {
    connectionError = error;
    stop();
  });
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    await client.connect();
    if (command === '--migrate') {
      const sql = await readFile(join(__dirname, '../migrations/match_collection/001_initial.sql'), 'utf8');
      await client.query(sql);
      console.log('Match collection schema is ready');
      return;
    }

    const key = process.env.BSER_API_KEY?.trim();
    if (!key) throw new Error('BSER_API_KEY is required');
    const intervalMs = readInteger(process.env.MATCH_COLLECTION_REQUEST_INTERVAL_MS ?? '1000', 'MATCH_COLLECTION_REQUEST_INTERVAL_MS', 1, 60_000);
    const settleSeconds = readInteger(process.env.MATCH_COLLECTION_SETTLE_SECONDS ?? '3600', 'MATCH_COLLECTION_SETTLE_SECONDS', 0, 86_400);
    const lookahead = readInteger(process.env.MATCH_COLLECTION_404_LOOKAHEAD ?? '20', 'MATCH_COLLECTION_404_LOOKAHEAD', 1, 1000);
    const lookup = createBserLookup(key, intervalMs, settleSeconds * 1000);
    console.log('Starting ranked match collection');
    await run(client, lookup, {
      startGameId: process.env.MATCH_COLLECTION_START_GAME_ID,
      lookahead,
      once: command === '--once',
      signal: shutdown.signal,
    });
    if (command === '--once') {
      const { rows: [cursor] } = await client.query('SELECT next_game_id FROM match_collection.cursor');
      console.log(`Next game ID: ${cursor.next_game_id}`);
    }
  } catch (error) {
    if (connectionError) throw connectionError;
    if (!shutdown.signal.aborted || error.name !== 'AbortError') throw error;
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    await client.end();
  }
  if (connectionError) throw connectionError;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { createBserLookup, run };
