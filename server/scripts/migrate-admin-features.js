// Additive migration: brings an existing database up to date with the
// admin/reports/blocking features without touching any existing data.
// Safe to run repeatedly (every statement is idempotent).
//   Usage: node scripts/migrate-admin-features.js
const pool = require('../config/db');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'gkolbaia2008@gmail.com';

async function migrate() {
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE`,
  );
  console.log('✓ users.is_blocked column ensured');

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE report_status AS ENUM ('open', 'resolved');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log('✓ report_status enum ensured');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status report_status NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (post_id, reporter_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status)`);

  // One OPEN report per user per post (re-reporting allowed after a report
  // is resolved) — replaces the stricter all-statuses UNIQUE constraint.
  await pool.query(
    `ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_post_id_reporter_id_key`,
  );
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_open
     ON reports (post_id, reporter_id) WHERE status = 'open'`,
  );
  console.log('✓ reports table ensured (one open report per user per post)');

  const promoted = await pool.query(
    `UPDATE users SET role = 'admin' WHERE LOWER(email) = LOWER($1) RETURNING email`,
    [ADMIN_EMAIL],
  );
  if (promoted.rows[0]) {
    console.log(`✓ ${promoted.rows[0].email} promoted to admin`);
  } else {
    console.log(
      `• ${ADMIN_EMAIL} is not registered yet — they will automatically become admin when they register`,
    );
  }
}

migrate()
  .then(() => {
    console.log('Migration complete.');
    return pool.end();
  })
  .catch((err) => {
    console.error('MIGRATION FAILED:', err.message);
    process.exit(1);
  });
