const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { Pool } = require('pg');
const { playerHistoryPoolOptions } = require('../dist/common/database/player-history-pool-options');

async function main() {
  const pool = new Pool(playerHistoryPoolOptions((name) => process.env[name]));
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(300001)');
    await client.query('CREATE SCHEMA IF NOT EXISTS player_history');
    await client.query(`
      CREATE TABLE IF NOT EXISTS player_history.schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const migrationDirectory = join(__dirname, '../migrations/player_history');
    const names = readdirSync(migrationDirectory)
      .filter((name) => /^\d{3}_[\w-]+\.sql$/.test(name))
      .sort();
    for (const name of names) {
      const existing = await client.query(
        'SELECT 1 FROM player_history.schema_migrations WHERE name = $1',
        [name],
      );
      if (existing.rowCount === 0) {
        const sql = readFileSync(join(migrationDirectory, name), 'utf8');
        await client.query(sql);
        await client.query(
          'INSERT INTO player_history.schema_migrations (name) VALUES ($1)',
          [name],
        );
        console.log(`Applied ${name}`);
      } else {
        console.log(`Already applied ${name}`);
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
