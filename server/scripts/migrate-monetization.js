// Additive migration: monetization, referral, and premium-packaging columns.
// Safe to run repeatedly (every statement is idempotent).
//   Usage: node scripts/migrate-monetization.js
const pool = require('../config/db');
const { generateUniqueReferralCode } = require('../utils/referral');

async function migrate() {
  // ── users: referral + VIP columns ──
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(12)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_until TIMESTAMPTZ`);
  // Multiple NULLs are allowed under a UNIQUE index, so students (no code) are fine.
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users (referral_code)`,
  );
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users (referred_by)`);
  console.log('✓ users referral/vip columns ensured');

  // ── posts: package + active window columns ──
  await pool.query(
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS package_type VARCHAR(16) NOT NULL DEFAULT 'standard'`,
  );
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS active_until TIMESTAMPTZ`);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE posts ADD CONSTRAINT posts_package_type_check
        CHECK (package_type IN ('standard', 'vip', 'vip_plus'));
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  // Sorting the feed reads package_type + active_until on every load.
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_posts_package ON posts (package_type, active_until)`,
  );
  console.log('✓ posts package columns ensured');

  // ── backfill: give every existing teacher a referral code ──
  const teachers = await pool.query(
    `SELECT id FROM users WHERE role = 'teacher' AND (referral_code IS NULL OR referral_code = '')`,
  );
  for (const teacher of teachers.rows) {
    const code = await generateUniqueReferralCode(pool);
    await pool.query('UPDATE users SET referral_code = $1 WHERE id = $2', [code, teacher.id]);
    console.log(`  · backfilled referral code ${code} for teacher ${teacher.id}`);
  }
  console.log(`✓ backfilled ${teachers.rows.length} teacher referral code(s)`);
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
