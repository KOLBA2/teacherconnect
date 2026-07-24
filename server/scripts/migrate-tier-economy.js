// Additive migration: user-level VIP+ tier + VIP+ profile extras (video intro,
// custom banner). Idempotent — safe to run repeatedly.
//   Usage: node scripts/migrate-tier-economy.js
const pool = require('../config/db');

async function migrate() {
  // User-level tier windows. vip_until already exists (referral/VIP purchases);
  // vip_plus_until is the new Ultimate-tier window bought from the pricing page.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_plus_until TIMESTAMPTZ`);
  // VIP+ profile extras.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS video_intro_url VARCHAR(255)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_banner VARCHAR(255)`);
  console.log('✓ users vip_plus_until / video_intro_url / profile_banner ensured');
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
