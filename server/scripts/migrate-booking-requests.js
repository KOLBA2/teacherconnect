// Additive migration: booking_requests — student-initiated requests against a
// teacher's WEEKLY availability grid (day_of_week 0=Mon..6=Sun, hour 0-23).
// Distinct from the concrete-date `slots`/`bookings` system. Idempotent.
//   Usage: node scripts/migrate-booking-requests.js
const pool = require('../config/db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id UUID REFERENCES users(id) ON DELETE SET NULL,
      student_name TEXT NOT NULL,
      student_phone TEXT NOT NULL,
      subject TEXT,
      note TEXT,
      day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      hour SMALLINT NOT NULL CHECK (hour BETWEEN 0 AND 23),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_booking_requests_teacher ON booking_requests (teacher_id, status)`,
  );
  console.log('✓ booking_requests table ensured');
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
