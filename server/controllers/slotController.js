const pool = require('../config/db');
const { sendDbError } = require('../utils/dbErrors');
const { UUID_REGEX } = require('../utils/validators');

function mapSlot(row) {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    startTime: row.start_time,
    endTime: row.end_time,
    isBooked: row.is_booked,
    ...(row.teacher_name !== undefined && { teacherName: row.teacher_name }),
    ...(row.student_name !== undefined && { studentName: row.student_name }),
    ...(row.booking_id !== undefined && { bookingId: row.booking_id }),
  };
}

async function requireApprovedTeacher(userId) {
  const result = await pool.query('SELECT status FROM teacher_profiles WHERE user_id = $1', [
    userId,
  ]);
  return result.rows[0]?.status === 'approved';
}

async function createSlot(req, res) {
  const startTime = new Date(req.body.startTime);
  const endTime = new Date(req.body.endTime);

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return res.status(400).json({ message: 'მიუთითეთ სწორი თარიღი და დრო' });
  }
  if (endTime <= startTime) {
    return res.status(400).json({ message: 'დასრულების დრო დაწყებაზე გვიან უნდა იყოს' });
  }
  if (startTime <= new Date()) {
    return res.status(400).json({ message: 'დრო მომავალში უნდა იყოს' });
  }

  try {
    if (!(await requireApprovedTeacher(req.user.id))) {
      return res.status(403).json({ message: 'განრიგის შექმნა შეუძლიათ მხოლოდ დამტკიცებულ მასწავლებლებს' });
    }

    const overlap = await pool.query(
      `SELECT id FROM slots
       WHERE teacher_id = $1 AND start_time < $3 AND end_time > $2`,
      [req.user.id, startTime.toISOString(), endTime.toISOString()],
    );
    if (overlap.rows[0]) {
      return res.status(409).json({ message: 'ამ დროს უკვე გაქვთ სხვა სლოტი' });
    }

    const result = await pool.query(
      `INSERT INTO slots (teacher_id, start_time, end_time)
       VALUES ($1, $2, $3)
       RETURNING id, teacher_id, start_time, end_time, is_booked`,
      [req.user.id, startTime.toISOString(), endTime.toISOString()],
    );
    return res.status(201).json({ message: 'სლოტი დაემატა ✓', slot: mapSlot(result.rows[0]) });
  } catch (err) {
    console.error('Creating slot failed:', err);
    return sendDbError(res, err, 'სლოტის დამატება ვერ მოხერხდა');
  }
}

async function getMySlots(req, res) {
  try {
    const result = await pool.query(
      `SELECT s.id, s.teacher_id, s.start_time, s.end_time, s.is_booked,
              b.id AS booking_id, st.name AS student_name
       FROM slots s
       LEFT JOIN bookings b ON b.slot_id = s.id
       LEFT JOIN users st ON st.id = b.student_id
       WHERE s.teacher_id = $1 AND s.end_time > NOW()
       ORDER BY s.start_time ASC`,
      [req.user.id],
    );
    return res.status(200).json({ slots: result.rows.map(mapSlot) });
  } catch (err) {
    console.error('Fetching my slots failed:', err);
    return sendDbError(res, err, 'განრიგის ჩატვირთვა ვერ მოხერხდა');
  }
}

async function deleteSlot(req, res) {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი სლოტის ID' });
  }
  try {
    const result = await pool.query(
      `DELETE FROM slots WHERE id = $1 AND teacher_id = $2 AND is_booked = FALSE RETURNING id`,
      [id, req.user.id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'სლოტი ვერ მოიძებნა, ან უკვე დაჯავშნილია' });
    }
    return res.status(200).json({ message: 'სლოტი წაიშალა' });
  } catch (err) {
    console.error('Deleting slot failed:', err);
    return sendDbError(res, err, 'სლოტის წაშლა ვერ მოხერხდა');
  }
}

async function getTeacherSlots(req, res) {
  const { teacherId } = req.params;
  if (!UUID_REGEX.test(teacherId)) {
    return res.status(400).json({ message: 'არასწორი მასწავლებლის ID' });
  }
  try {
    const teacher = await pool.query(
      `SELECT name FROM users WHERE id = $1 AND role = 'teacher'`,
      [teacherId],
    );
    if (!teacher.rows[0]) {
      return res.status(404).json({ message: 'მასწავლებელი ვერ მოიძებნა' });
    }
    const result = await pool.query(
      `SELECT id, teacher_id, start_time, end_time, is_booked
       FROM slots
       WHERE teacher_id = $1 AND is_booked = FALSE AND start_time > NOW()
       ORDER BY start_time ASC`,
      [teacherId],
    );
    return res.status(200).json({
      teacherName: teacher.rows[0].name,
      slots: result.rows.map(mapSlot),
    });
  } catch (err) {
    console.error('Fetching teacher slots failed:', err);
    return sendDbError(res, err, 'განრიგის ჩატვირთვა ვერ მოხერხდა');
  }
}

async function bookSlot(req, res) {
  const id = req.body.slotId;
  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი სლოტის ID' });
  }

  let client;
  try {
    const slotResult = await pool.query('SELECT teacher_id, start_time FROM slots WHERE id = $1', [id]);
    const slot = slotResult.rows[0];
    if (!slot) {
      return res.status(404).json({ message: 'სლოტი ვერ მოიძებნა' });
    }
    if (slot.teacher_id === req.user.id) {
      return res.status(400).json({ message: 'საკუთარი სლოტის დაჯავშნა შეუძლებელია' });
    }
    if (new Date(slot.start_time) <= new Date()) {
      return res.status(400).json({ message: 'ეს დრო უკვე გავიდა' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Race-safe claim: only one concurrent booking can flip is_booked.
    const claimed = await client.query(
      `UPDATE slots SET is_booked = TRUE WHERE id = $1 AND is_booked = FALSE RETURNING id`,
      [id],
    );
    if (!claimed.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'ეს სლოტი უკვე დაჯავშნილია' });
    }

    const booking = await client.query(
      `INSERT INTO bookings (slot_id, student_id)
       VALUES ($1, $2)
       RETURNING id, payment_status, created_at`,
      [id, req.user.id],
    );

    await client.query('COMMIT');
    return res.status(201).json({
      message: 'გაკვეთილი დაჯავშნულია ✓',
      booking: {
        id: booking.rows[0].id,
        slotId: id,
        paymentStatus: booking.rows[0].payment_status,
      },
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Booking slot failed:', err);
    return sendDbError(res, err, 'დაჯავშნა ვერ მოხერხდა');
  } finally {
    if (client) client.release();
  }
}

async function getMyBookings(req, res) {
  try {
    const isTeacher = req.user.role === 'teacher';
    const result = await pool.query(
      isTeacher
        ? `SELECT b.id, b.payment_status, s.start_time, s.end_time,
                  other_u.name AS other_name
           FROM bookings b
           JOIN slots s ON s.id = b.slot_id
           JOIN users other_u ON other_u.id = b.student_id
           WHERE s.teacher_id = $1
           ORDER BY s.start_time ASC`
        : `SELECT b.id, b.payment_status, s.start_time, s.end_time,
                  other_u.name AS other_name
           FROM bookings b
           JOIN slots s ON s.id = b.slot_id
           JOIN users other_u ON other_u.id = s.teacher_id
           WHERE b.student_id = $1
           ORDER BY s.start_time ASC`,
      [req.user.id],
    );
    return res.status(200).json({
      bookings: result.rows.map((row) => ({
        id: row.id,
        paymentStatus: row.payment_status,
        startTime: row.start_time,
        endTime: row.end_time,
        otherName: row.other_name,
      })),
    });
  } catch (err) {
    console.error('Fetching bookings failed:', err);
    return sendDbError(res, err, 'ჯავშნების ჩატვირთვა ვერ მოხერხდა');
  }
}

async function cancelBooking(req, res) {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი ჯავშნის ID' });
  }

  let client;
  try {
    const existing = await pool.query(
      `SELECT b.slot_id, b.student_id, s.teacher_id
       FROM bookings b JOIN slots s ON s.id = b.slot_id
       WHERE b.id = $1`,
      [id],
    );
    const row = existing.rows[0];
    if (!row) {
      return res.status(404).json({ message: 'ჯავშანი ვერ მოიძებნა' });
    }
    if (row.student_id !== req.user.id && row.teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'ამ ჯავშნის გაუქმების უფლება არ გაქვთ' });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('DELETE FROM bookings WHERE id = $1', [id]);
    await client.query('UPDATE slots SET is_booked = FALSE WHERE id = $1', [row.slot_id]);
    await client.query('COMMIT');

    return res.status(200).json({ message: 'ჯავშანი გაუქმდა' });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Cancelling booking failed:', err);
    return sendDbError(res, err, 'ჯავშნის გაუქმება ვერ მოხერხდა');
  } finally {
    if (client) client.release();
  }
}

module.exports = {
  createSlot,
  getMySlots,
  deleteSlot,
  getTeacherSlots,
  bookSlot,
  getMyBookings,
  cancelBooking,
};
