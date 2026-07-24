// Additive migration: ratings + comments tables for the social features.
// Safe to run repeatedly (every statement is idempotent).
//   Usage: node scripts/migrate-social-features.js
const pool = require('../config/db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ratings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (post_id, user_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ratings_post_id ON ratings (post_id)`);
  console.log('✓ ratings table ensured');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments (post_id)`);
  console.log('✓ comments table ensured');
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
