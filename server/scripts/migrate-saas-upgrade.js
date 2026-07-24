// Additive migration: tiered limits paywall (phone), matching-engine fields
// (price/format/subject), grade-level value migration, and the weekly
// availability matrix. Idempotent — safe to run repeatedly.
//   Usage: node scripts/migrate-saas-upgrade.js
const pool = require('../config/db');

async function migrate() {
  // ── Item 2: phone contact channel (per teacher) ──
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_num VARCHAR(32)`);
  console.log('✓ users.phone_num ensured');

  // ── Item 3: matching-engine fields ──
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS price INTEGER`);
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS format VARCHAR(16)`);
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS subject VARCHAR(64)`);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE posts ADD CONSTRAINT posts_format_check
        CHECK (format IS NULL OR format IN ('online', 'in_person', 'both'));
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_subject ON posts (subject)`);
  console.log('✓ posts price/format/subject ensured');

  // Migrate legacy target_audience values → grade levels (Elementary / High
  // School / Exam Prep). Maps + de-dups in place; only touches affected rows.
  await pool.query(`
    UPDATE posts SET target_audience = (
      SELECT array_agg(DISTINCT mapped)
      FROM unnest(target_audience) AS old
      CROSS JOIN LATERAL (
        SELECT CASE old
          WHEN 'school_students'     THEN 'high_school'
          WHEN 'university_entrants' THEN 'exam_prep'
          WHEN 'certification_prep'  THEN 'exam_prep'
          ELSE old
        END AS mapped
      ) x
    )
    WHERE target_audience && ARRAY['school_students','university_entrants','certification_prep']
  `);
  console.log('✓ target_audience migrated to grade levels');

  // ── Item 4: weekly availability matrix ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS weekly_availability (
      teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      hour SMALLINT NOT NULL CHECK (hour BETWEEN 0 AND 23),
      PRIMARY KEY (teacher_id, day_of_week, hour)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_weekly_availability_teacher ON weekly_availability (teacher_id)`);
  console.log('✓ weekly_availability table ensured');
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
