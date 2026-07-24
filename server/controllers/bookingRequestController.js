const pool = require('../config/db');
const { sendDbError } = require('../utils/dbErrors');
const { UUID_REGEX } = require('../utils/validators');

function cleanPhone(v) {
  return (v || '').toString().trim().replace(/[^\d+]/g, '').slice(0, 32);
}

// POST /api/booking-requests — PUBLIC. A student requests one of a teacher's
// weekly availability slots, providing name + phone (+ optional subject/note).
async function createBookingRequest(req, res) {
  const teacherId = (req.body.teacherId || '').toString();
  const dayOfWeek = Number(req.body.dayOfWeek);
  const hour = Number(req.body.hour);
  const studentName = (req.body.studentName || '').toString().trim().slice(0, 120);
  const studentPhone = cleanPhone(req.body.studentPhone);
  const subject = (req.body.subject || '').toString().trim().slice(0, 120) || null;
  const note = (req.body.note || '').toString().trim().slice(0, 500) || null;

  if (!UUID_REGEX.test(teacherId)) return res.status(400).json({ message: 'არასწორი მასწავლებლის ID' });
  if (!studentName) return res.status(400).json({ message: 'გთხოვთ მიუთითოთ სახელი' });
  if (studentPhone.replace(/\D/g, '').length < 9) {
    return res.status(400).json({ message: 'გთხოვთ მიუთითოთ სწორი ტელეფონის ნომერი' });
  }
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({ message: 'არასწორი დღე' });
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return res.status(400).json({ message: 'არასწორი საათი' });
  }

  try {
    const teacher = await pool.query(`SELECT id FROM users WHERE id=$1 AND role='teacher'`, [teacherId]);
    if (!teacher.rows[0]) return res.status(404).json({ message: 'მასწავლებელი ვერ მოიძებნა' });

    // The requested slot must actually be in the teacher's weekly availability.
    const slot = await pool.query(
      `SELECT 1 FROM weekly_availability WHERE teacher_id=$1 AND day_of_week=$2 AND hour=$3`,
      [teacherId, dayOfWeek, hour],
    );
    if (!slot.rows[0]) return res.status(409).json({ message: 'ეს დრო აღარ არის ხელმისაწვდომი' });

    const studentId = req.user?.id || null;
    const r = await pool.query(
      `INSERT INTO booking_requests
         (teacher_id, student_id, student_name, student_phone, subject, note, day_of_week, hour)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [teacherId, studentId, studentName, studentPhone, subject, note, dayOfWeek, hour],
    );
    return res.status(201).json({ message: 'ჯავშნის მოთხოვნა გაიგზავნა ✓', id: r.rows[0].id });
  } catch (err) {
    console.error('Create booking request failed:', err);
    return sendDbError(res, err, 'ჯავშნის გაგზავნა ვერ მოხერხდა');
  }
}

// GET /api/booking-requests/teacher — the logged-in teacher's incoming requests.
async function getTeacherBookingRequests(req, res) {
  try {
    const r = await pool.query(
      `SELECT id, student_name, student_phone, subject, note, day_of_week, hour, status, created_at
         FROM booking_requests WHERE teacher_id=$1
        ORDER BY (status='pending') DESC, created_at DESC`,
      [req.user.id],
    );
    return res.status(200).json({
      bookings: r.rows.map((b) => ({
        id: b.id,
        studentName: b.student_name,
        studentPhone: b.student_phone,
        subject: b.subject,
        note: b.note,
        dayOfWeek: b.day_of_week,
        hour: b.hour,
        status: b.status,
        createdAt: b.created_at,
      })),
    });
  } catch (err) {
    console.error('Fetching booking requests failed:', err);
    return sendDbError(res, err, 'ჯავშნების ჩატვირთვა ვერ მოხერხდა');
  }
}

// PUT /api/booking-requests/:id/confirm — teacher confirms a request they own.
async function confirmBookingRequest(req, res) {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return res.status(400).json({ message: 'არასწორი ID' });
  try {
    const r = await pool.query(
      `UPDATE booking_requests SET status='confirmed' WHERE id=$1 AND teacher_id=$2 RETURNING id`,
      [id, req.user.id],
    );
    if (!r.rows[0]) return res.status(404).json({ message: 'ჯავშანი ვერ მოიძებნა' });
    return res.status(200).json({ message: 'ჯავშანი დადასტურდა ✓' });
  } catch (err) {
    console.error('Confirm booking failed:', err);
    return sendDbError(res, err, 'დადასტურება ვერ მოხერხდა');
  }
}

// DELETE /api/booking-requests/:id — teacher declines/removes a request they own.
async function deleteBookingRequest(req, res) {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return res.status(400).json({ message: 'არასწორი ID' });
  try {
    const r = await pool.query(
      `DELETE FROM booking_requests WHERE id=$1 AND teacher_id=$2 RETURNING id`,
      [id, req.user.id],
    );
    if (!r.rows[0]) return res.status(404).json({ message: 'ჯავშანი ვერ მოიძებნა' });
    return res.status(200).json({ message: 'ჯავშანი წაიშალა' });
  } catch (err) {
    console.error('Delete booking failed:', err);
    return sendDbError(res, err, 'წაშლა ვერ მოხერხდა');
  }
}

module.exports = {
  createBookingRequest,
  getTeacherBookingRequests,
  confirmBookingRequest,
  deleteBookingRequest,
};
