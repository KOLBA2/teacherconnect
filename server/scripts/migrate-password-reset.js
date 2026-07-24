// Additive migration: password-reset support on the users table. Idempotent.
//   Usage: node scripts/migrate-password-reset.js
//
// We store only a bcrypt HASH of the 6-digit code (never the code itself),
// an expiry timestamp (15-minute window), and a failed-attempt counter so a
// leaked/guessable code can't be brute-forced.
const pool = require('../config/db');

async function migrate() {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_hash VARCHAR(255)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expires TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_attempts SMALLINT NOT NULL DEFAULT 0`);
  console.log('✓ users.reset_code_hash + reset_code_expires + reset_code_attempts ensured');
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
