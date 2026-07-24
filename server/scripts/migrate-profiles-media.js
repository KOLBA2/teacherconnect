// Additive migration: profile avatar + bio (per user) and a post image
// attachment. Idempotent.
//   Usage: node scripts/migrate-profiles-media.js
const pool = require('../config/db');

async function migrate() {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);
  console.log('✓ users.avatar_url + users.bio ensured');

  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url VARCHAR(255)`);
  console.log('✓ posts.image_url ensured');
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
