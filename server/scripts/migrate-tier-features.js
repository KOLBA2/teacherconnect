// Additive migration: syllabus link (per post) + profile cover photo (per
// teacher). is_pinned / is_verified are NOT stored — they are computed from
// active-VIP+ status at read time so they can never drift out of sync with the
// tier. Idempotent — safe to run repeatedly.
//   Usage: node scripts/migrate-tier-features.js
const pool = require('../config/db');

async function migrate() {
  // Feature 1: PDF syllabus / program link (any teacher).
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS syllabus_url VARCHAR(255)`);
  console.log('✓ posts.syllabus_url ensured');

  // Feature 4: VIP+ hero cover photo (video already lives in video_intro_url).
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(255)`);
  console.log('✓ users.cover_image_url ensured');
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
