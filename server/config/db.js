const { Pool } = require('pg');
require('dotenv').config();

// Verified working live on 2026-07-16: this project runs on Supabase's
// aws-1 pooler cluster in eu-west-2 (London) — confirmed against AWS's
// published IP ranges and a successful SELECT NOW(). The full connection
// string (with credentials) lives in server/.env as DATABASE_URL; earlier
// failures were caused by strings pointing at aws-0 clusters and/or the
// wrong region (eu-central-1), never by this file.
if (!process.env.DATABASE_URL) {
  console.error(
    '✗ DATABASE_URL is not set. Copy server/.env.example to server/.env and ' +
      'fill in the Supabase connection string (Dashboard -> Project Settings ' +
      '-> Database -> Connection string -> Transaction pooler).',
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
  // Pool hygiene: cap concurrent connections (Supabase's pooler has limits) and
  // let idle ones close so a dev-server restart storm can't exhaust the pooler.
  // keepAlive avoids idle TCP drops on the long-lived pooler link.
  max: 10,
  idleTimeoutMillis: 30000,
  keepAlive: true,
});

// A transient error on an idle pooled connection (e.g. the DB restarting,
// a brief network blip) must not take the whole API server down with it —
// pg automatically discards the broken client and opens a fresh one on the
// next query, so this only needs to log, not exit the process.
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

// One-time startup check: proves definitively, right in the console, whether
// the connection actually reaches Supabase — independent of any HTTP
// request or frontend behavior.
pool
  .query('SELECT NOW()')
  .then((result) => {
    console.log('🎉 SUCCESS! Connected to Supabase:', result.rows[0].now);
  })
  .catch((err) => {
    console.error('❌ Supabase connection FAILED at startup:', err.message);
  });

module.exports = pool;
