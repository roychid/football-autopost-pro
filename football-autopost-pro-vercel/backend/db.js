const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        platform TEXT NOT NULL CHECK(platform IN ('telegram', 'whatsapp')),
        chat_id TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        post_goals INTEGER NOT NULL DEFAULT 1,
        post_cards INTEGER NOT NULL DEFAULT 1,
        post_lineups INTEGER NOT NULL DEFAULT 1,
        post_fulltime INTEGER NOT NULL DEFAULT 1,
        post_subs INTEGER NOT NULL DEFAULT 0,
        affiliate_link TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS leagues (
        id SERIAL PRIMARY KEY,
        league_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        country TEXT,
        active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        event_type TEXT NOT NULL,
        match_id TEXT,
        status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent', 'failed', 'scheduled')),
        scheduled_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tracked_events (
        id SERIAL PRIMARY KEY,
        match_id TEXT NOT NULL,
        event_key TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Database schema ready');
  } finally {
    client.release();
  }
}

// Run a query, return all rows
async function query(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  const { rows } = await pool.query(pgSql, params);
  return rows;
}

// Return a single row
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// INSERT / UPDATE / DELETE — returns { lastInsertRowid }
async function run(sql, params = []) {
  let i = 0;
  let pgSql = sql.replace(/\?/g, () => `$${++i}`);
  if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
    pgSql += ' RETURNING id';
  }
  const { rows } = await pool.query(pgSql, params);
  return { lastInsertRowid: rows[0]?.id };
}

module.exports = { query, queryOne, run, initDb, pool };

if (require.main === module) {
  initDb().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
