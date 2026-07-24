// Additive migration: location (city) + bump-up (last_bumped_at) on posts, and
// a senior-friendly audio intro on profiles. Idempotent.
//   Usage: node scripts/migrate-senior-taxonomy.js
const pool = require('../config/db');

async function migrate() {
  // Feature 2: physical city for in-person lessons ('online' or a city key).
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS city VARCHAR(64)`);
  // Feature 4: bump-up timestamp for "პოსტის ამოწევა".
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_bumped_at TIMESTAMPTZ`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_last_bumped ON posts (last_bumped_at)`);
  console.log('✓ posts.city + posts.last_bumped_at ensured');

  // Feature 5: senior-friendly voice greeting (link).
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS audio_intro_url VARCHAR(255)`);
  console.log('✓ users.audio_intro_url ensured');
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
