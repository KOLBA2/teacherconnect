// Additive migration: slots + bookings tables for the lesson booking system.
// Safe to run repeatedly (every statement is idempotent).
//   Usage: node scripts/migrate-booking.js
const pool = require('../config/db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS slots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      is_booked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (end_time > start_time)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_slots_teacher_id ON slots (teacher_id)`);
  console.log('✓ slots table ensured');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slot_id UUID NOT NULL UNIQUE REFERENCES slots(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON bookings (student_id)`);
  console.log('✓ bookings table ensured');
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
