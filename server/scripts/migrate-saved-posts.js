// Additive migration: saved_posts table for the bookmark feature.
// Safe to run repeatedly (every statement is idempotent).
//   Usage: node scripts/migrate-saved-posts.js
const pool = require('../config/db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, post_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts (user_id)`);
  console.log('✓ saved_posts table ensured');
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
