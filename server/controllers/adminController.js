const pool = require('../config/db');
const { sendDbError } = require('../utils/dbErrors');
const { UUID_REGEX } = require('../utils/validators');

const VALID_TARGET_STATUSES = new Set(['approved', 'rejected']);

function mapPendingTeacher(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
    teacherStatus: row.status,
    verificationPhotos: row.verification_photos,
    profileCreatedAt: row.profile_created_at,
  };
}

function mapTeacherProfile(row) {
  return {
    userId: row.user_id,
    status: row.status,
    verifiedAt: row.verified_at,
    rejectedReason: row.rejected_reason,
  };
}

async function getPendingTeachers(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.created_at,
         tp.status,
         tp.verification_photos,
         tp.created_at AS profile_created_at
       FROM users u
       JOIN teacher_profiles tp ON tp.user_id = u.id
       WHERE u.role = 'teacher' AND tp.status = 'pending'
       ORDER BY tp.created_at ASC`,
    );

    return res.status(200).json({ teachers: result.rows.map(mapPendingTeacher) });
  } catch (err) {
    console.error('Fetching pending teachers failed:', err);
    return sendDbError(res, err, 'მასწავლებლების სიის მიღება ვერ მოხერხდა');
  }
}

async function verifyTeacher(req, res) {
  const { id } = req.params;
  const { status, reject_reason: rejectReason } = req.body;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი მომხმარებლის ID' });
  }
  if (!VALID_TARGET_STATUSES.has(status)) {
    return res.status(400).json({ message: "სტატუსი უნდა იყოს 'approved' ან 'rejected'" });
  }
  if (status === 'rejected' && (!rejectReason || !rejectReason.trim())) {
    return res.status(400).json({ message: 'უარყოფის მიზეზი სავალდებულოა' });
  }

  try {
    const result =
      status === 'approved'
        ? await pool.query(
            `UPDATE teacher_profiles
             SET status = 'approved', verified_at = CURRENT_TIMESTAMP, rejected_reason = NULL
             WHERE user_id = $1
             RETURNING user_id, status, verified_at, rejected_reason`,
            [id],
          )
        : await pool.query(
            `UPDATE teacher_profiles
             SET status = 'rejected', rejected_reason = $2, verified_at = NULL
             WHERE user_id = $1
             RETURNING user_id, status, verified_at, rejected_reason`,
            [id, rejectReason.trim()],
          );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'მასწავლებლის პროფილი ვერ მოიძებნა' });
    }

    return res.status(200).json({
      message: status === 'approved' ? 'მასწავლებელი დამტკიცებულია' : 'მასწავლებელი უარყოფილია',
      teacherProfile: mapTeacherProfile(result.rows[0]),
    });
  } catch (err) {
    console.error('Verifying teacher failed:', err);
    return sendDbError(res, err, 'მასწავლებლის სტატუსის განახლება ვერ მოხერხდა');
  }
}

function mapReport(row) {
  return {
    id: row.id,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    postId: row.post_id,
    postTitle: row.post_title,
    postContent: row.post_content,
    authorId: row.author_id,
    authorName: row.author_name,
    authorBlocked: row.author_blocked,
    reporterName: row.reporter_name,
    reporterEmail: row.reporter_email,
  };
}

async function getReports(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         r.id, r.reason, r.status, r.created_at,
         p.id AS post_id, p.title AS post_title, p.content AS post_content,
         author.id AS author_id, author.name AS author_name, author.is_blocked AS author_blocked,
         reporter.name AS reporter_name, reporter.email AS reporter_email
       FROM reports r
       JOIN posts p ON p.id = r.post_id
       JOIN users author ON author.id = p.teacher_id
       JOIN users reporter ON reporter.id = r.reporter_id
       WHERE r.status = 'open'
       ORDER BY r.created_at DESC`,
    );

    return res.status(200).json({ reports: result.rows.map(mapReport) });
  } catch (err) {
    console.error('Fetching reports failed:', err);
    return sendDbError(res, err, 'შეტყობინებების ჩატვირთვა ვერ მოხერხდა');
  }
}

async function resolveReport(req, res) {
  const { id } = req.params;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი შეტყობინების ID' });
  }

  try {
    const result = await pool.query(
      `UPDATE reports SET status = 'resolved' WHERE id = $1 RETURNING id`,
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'შეტყობინება ვერ მოიძებნა' });
    }
    return res.status(200).json({ message: 'შეტყობინება მოინიშნა მოგვარებულად ✓' });
  } catch (err) {
    console.error('Resolving report failed:', err);
    return sendDbError(res, err, 'შეტყობინების განახლება ვერ მოხერხდა');
  }
}

async function deletePost(req, res) {
  const { id } = req.params;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი პოსტის ID' });
  }

  try {
    const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'პოსტი ვერ მოიძებნა' });
    }
    // Reports on this post disappear automatically via ON DELETE CASCADE.
    return res.status(200).json({ message: 'პოსტი წაიშალა' });
  } catch (err) {
    console.error('Admin deleting post failed:', err);
    return sendDbError(res, err, 'პოსტის წაშლა ვერ მოხერხდა');
  }
}

async function blockUser(req, res) {
  const { id } = req.params;
  const blocked = req.body.blocked !== false; // default: block

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი მომხმარებლის ID' });
  }
  if (id === req.user.id) {
    return res.status(400).json({ message: 'საკუთარი ანგარიშის დაბლოკვა შეუძლებელია' });
  }

  try {
    const target = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (!target.rows[0]) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }
    if (target.rows[0].role === 'admin') {
      return res.status(400).json({ message: 'ადმინისტრატორის დაბლოკვა შეუძლებელია' });
    }

    const result = await pool.query(
      `UPDATE users SET is_blocked = $2 WHERE id = $1
       RETURNING id, name, email, role, is_blocked`,
      [id, blocked],
    );

    const u = result.rows[0];
    return res.status(200).json({
      message: blocked ? 'მომხმარებელი დაიბლოკა' : 'მომხმარებელი განიბლოკა',
      user: { id: u.id, name: u.name, email: u.email, role: u.role, isBlocked: u.is_blocked },
    });
  } catch (err) {
    console.error('Blocking user failed:', err);
    return sendDbError(res, err, 'მომხმარებლის სტატუსის შეცვლა ვერ მოხერხდა');
  }
}

// GET /api/admin/teachers — all APPROVED teachers with their VIP status, for the
// teacher-management table (Grant VIP). is_vip is derived from vip_until.
async function getAllTeachers(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.vip_until, u.vip_plus_until, u.created_at
         FROM users u
         JOIN teacher_profiles tp ON tp.user_id = u.id
        WHERE u.role = 'teacher' AND tp.status = 'approved'
        ORDER BY (u.vip_plus_until IS NOT NULL AND u.vip_plus_until > NOW()) DESC,
                 (u.vip_until IS NOT NULL AND u.vip_until > NOW()) DESC,
                 u.name ASC`,
    );
    const now = Date.now();
    return res.status(200).json({
      teachers: result.rows.map((r) => {
        const vipActive = r.vip_until ? new Date(r.vip_until).getTime() > now : false;
        const vipPlusActive = r.vip_plus_until ? new Date(r.vip_plus_until).getTime() > now : false;
        // Highest active tier wins for the status label.
        const vipStatus = vipPlusActive ? 'VIP_PLUS' : vipActive ? 'VIP' : 'NONE';
        return {
          id: r.id,
          name: r.name,
          email: r.email,
          vipUntil: r.vip_until || null,
          vipPlusUntil: r.vip_plus_until || null,
          vipStatus,
          // Backwards-compatible flag: true when ANY premium window is active.
          isVip: vipActive || vipPlusActive,
        };
      }),
    });
  } catch (err) {
    console.error('Fetching all teachers failed:', err);
    return sendDbError(res, err, 'მასწავლებლების სიის მიღება ვერ მოხერხდა');
  }
}

// PUT /api/admin/teachers/:id/grant-vip — grant free VIP or VIP+ for a custom
// number of days (1–365). vip_until / vip_plus_until ARE the expiry timestamps;
// GREATEST extends an active window instead of shrinking it.
async function grantVip(req, res) {
  const { id } = req.params;
  const tier = req.body.tier === 'vip_plus' ? 'vip_plus' : 'vip';
  const days = Math.floor(Number(req.body.days));

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი მომხმარებლის ID' });
  }
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    return res.status(400).json({ message: 'ხანგრძლივობა უნდა იყოს 1-დან 365 დღემდე' });
  }

  const tierLabel = tier === 'vip_plus' ? 'VIP+' : 'VIP';

  // GREATEST(COALESCE(col, NOW()), NOW()) STACKS onto an already-active window
  // (extends from its future timestamp) and RESTARTS from now if lapsed/NULL —
  // guaranteeing exactly `days` are added, never lost or doubled. The SET clause
  // is built from whitelisted literals only (no user input interpolated).
  // A VIP+ grant also extends vip_until: VIP+ implies at least VIP coverage, so
  // every VIP-gated check (contact unlock, limits, admin list) stays consistent.
  const setClause =
    tier === 'vip_plus'
      ? `vip_plus_until = GREATEST(COALESCE(vip_plus_until, NOW()), NOW()) + make_interval(days => $2::int),
         vip_until      = GREATEST(COALESCE(vip_until, NOW()), NOW()) + make_interval(days => $2::int)`
      : `vip_until = GREATEST(COALESCE(vip_until, NOW()), NOW()) + make_interval(days => $2::int)`;

  try {
    const target = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (!target.rows[0]) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }
    if (target.rows[0].role !== 'teacher') {
      return res.status(400).json({ message: `${tierLabel} მხოლოდ მასწავლებლებს ენიჭებათ` });
    }

    const result = await pool.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING vip_until, vip_plus_until`,
      [id, days],
    );

    return res.status(200).json({
      message: `${tierLabel} მინიჭებულია ${days} დღით ✓`,
      tier,
      vipUntil: result.rows[0].vip_until,
      vipPlusUntil: result.rows[0].vip_plus_until,
      isVip: true,
    });
  } catch (err) {
    console.error('Granting VIP failed:', err);
    return sendDbError(res, err, 'VIP-ის მინიჭება ვერ მოხერხდა');
  }
}

module.exports = {
  getPendingTeachers,
  verifyTeacher,
  getReports,
  resolveReport,
  deletePost,
  blockUser,
  getAllTeachers,
  grantVip,
};
