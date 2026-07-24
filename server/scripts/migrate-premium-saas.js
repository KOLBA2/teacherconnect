// Additive migration: premium SaaS ecosystem — contact channels, analytics,
// audience tags, and promos. Safe to run repeatedly (every statement is
// idempotent).
//   Usage: node scripts/migrate-premium-saas.js
const pool = require('../config/db');

async function migrate() {
  // ── Module 1: contact channels (per teacher) ──
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_num VARCHAR(32)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(64)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS messenger_url VARCHAR(255)`);
  console.log('✓ users contact columns ensured');

  // ── Module 3 + 4: audience tags + promo (per post) ──
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS target_audience TEXT[] NOT NULL DEFAULT '{}'`);
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS promo_tag VARCHAR(120)`);
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS promo_expires_at TIMESTAMPTZ`);
  // GIN index makes "posts targeting audience X" filtering fast if we ever move
  // it server-side; harmless for the current client-side filter.
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_target_audience ON posts USING GIN (target_audience)`);
  console.log('✓ posts audience/promo columns ensured');

  // ── Module 2: featured review ──
  await pool.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE`);
  // At most one featured comment per post.
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_one_featured ON comments (post_id) WHERE is_featured`,
  );
  console.log('✓ comments is_featured ensured');

  // ── Module 2: traffic + conversion log ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_views (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      viewer_session_id VARCHAR(64),
      clicked_contact VARCHAR(32),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views (post_id)`);
  // A plain view (clicked_contact IS NULL) is counted once per session per post;
  // contact clicks (clicked_contact set) are logged as separate rows and may
  // repeat, so they are excluded from this uniqueness guard.
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_post_views_unique_view
      ON post_views (post_id, viewer_session_id) WHERE clicked_contact IS NULL
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_post_views_clicks
      ON post_views (post_id, clicked_contact) WHERE clicked_contact IS NOT NULL
  `);
  console.log('✓ post_views table ensured');
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
