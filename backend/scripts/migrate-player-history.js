const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
    const name = '001_initial.sql';
    const existing = await client.query(
      'SELECT 1 FROM player_history.schema_migrations WHERE name = $1',
      [name],
    );
    if (existing.rowCount === 0) {
      const sql = readFileSync(join(__dirname, '../migrations/player_history', name), 'utf8');
      await client.query(sql);
      await client.query(
        'INSERT INTO player_history.schema_migrations (name) VALUES ($1)',
        [name],
      );
      console.log(`Applied ${name}`);
    } else {
      console.log(`Already applied ${name}`);
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
