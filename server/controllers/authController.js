const fs = require('fs/promises');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendDbError } = require('../utils/dbErrors');
const { sendPasswordResetEmail } = require('../utils/mailer');
const {
  generateUniqueReferralCode,
  REFERRAL_REWARD_THRESHOLD,
  REFERRAL_REWARD_DAYS,
} = require('../utils/referral');
const { getTeacherTier } = require('../utils/tiers');

const SALT_ROUNDS = 10;
const VALID_PUBLIC_ROLES = new Set(['student', 'teacher']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERSONAL_ID_REGEX = /^\d{11}$/;
const RESET_CODE_TTL_MIN = 15; // reset code lifetime
const RESET_MAX_ATTEMPTS = 5; // wrong-code attempts before the code is burned

// Precomputed once so failed-login timing doesn't reveal whether the email exists.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing-safety', SALT_ROUNDS);

async function removeUploadedFiles(files) {
  if (!files || files.length === 0) return;
  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Automatic VIP expiration: vip_until / vip_plus_until ARE the expiry timestamps
// (there is no separate is_vip boolean — "is VIP" = vip_until is in the future).
// When a window has lapsed we NULL the column here so the account cleanly reverts
// to free. Called on session init (/auth/me) and login. Mutates `user` in place.
async function sweepExpiredVip(user) {
  const now = Date.now();
  const vipExpired = user.vip_until && new Date(user.vip_until).getTime() <= now;
  const vipPlusExpired = user.vip_plus_until && new Date(user.vip_plus_until).getTime() <= now;
  if (!vipExpired && !vipPlusExpired) return;
  await pool.query(
    `UPDATE users SET
       vip_until = CASE WHEN vip_until <= NOW() THEN NULL ELSE vip_until END,
       vip_plus_until = CASE WHEN vip_plus_until <= NOW() THEN NULL ELSE vip_plus_until END
     WHERE id = $1`,
    [user.id],
  );
  if (vipExpired) user.vip_until = null;
  if (vipPlusExpired) user.vip_plus_until = null;
}

function sanitizeUser(user, teacherProfile) {
  const result = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  if (user.created_at) {
    result.createdAt = user.created_at;
  }
  if (user.avatar_url !== undefined) {
    result.avatarUrl = user.avatar_url || null;
  }
  if (user.bio !== undefined) {
    result.bio = user.bio || null;
  }
  // Referral/VIP fields exist only for teachers; expose them when present so
  // the client can render the dashboard and any VIP badge without an extra call.
  if (user.referral_code !== undefined) {
    result.referralCode = user.referral_code || null;
  }
  if (user.referred_by !== undefined) {
    result.referredBy = user.referred_by || null;
  }
  if (user.vip_until !== undefined) {
    result.vipUntil = user.vip_until || null;
  }
  if (user.vip_plus_until !== undefined) {
    result.vipPlusUntil = user.vip_plus_until || null;
  }
  if (user.video_intro_url !== undefined) {
    result.videoIntroUrl = user.video_intro_url || null;
  }
  if (user.profile_banner !== undefined) {
    result.profileBanner = user.profile_banner || null;
  }
  if (user.cover_image_url !== undefined) {
    result.coverImageUrl = user.cover_image_url || null;
  }
  if (user.whatsapp_num !== undefined) {
    result.contact = {
      phone: user.phone_num || null,
      whatsapp: user.whatsapp_num || null,
      telegram: user.telegram_username || null,
      messenger: user.messenger_url || null,
      audioIntroUrl: user.audio_intro_url || null,
    };
  }
  if (teacherProfile) {
    result.teacherStatus = teacherProfile.status;
    result.rejectedReason = teacherProfile.rejected_reason || null;
    if (teacherProfile.verification_photos) {
      result.verificationPhotos = teacherProfile.verification_photos;
    }
  }
  return result;
}

async function register(req, res) {
  const { name, email, password, role, personalId } = req.body;
  // Optional promo code, teacher registrations only. Normalized to match the
  // uppercase, whitespace-free form codes are generated and stored in.
  const referralCodeInput = (req.body.referralCode || '').trim().toUpperCase();
  const files = req.files || [];

  if (!name || !name.trim()) {
    await removeUploadedFiles(files);
    return res.status(400).json({ message: 'სახელი სავალდებულოა' });
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    await removeUploadedFiles(files);
    return res.status(400).json({ message: 'გთხოვთ მიუთითოთ სწორი ელ-ფოსტა' });
  }
  if (!password || password.length < 6) {
    await removeUploadedFiles(files);
    return res.status(400).json({ message: 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს' });
  }
  if (!personalId || !PERSONAL_ID_REGEX.test(personalId)) {
    await removeUploadedFiles(files);
    return res.status(400).json({ message: 'პირადი ნომერი უნდა შედგებოდეს ზუსტად 11 ციფრისგან' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // The configured ADMIN_EMAIL always registers as admin, regardless of the
  // role selected in the form — this is how the super-admin account is
  // bootstrapped without ever exposing admin as a public registration option.
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const isSuperAdmin = adminEmail !== '' && normalizedEmail === adminEmail;

  const normalizedRole = isSuperAdmin ? 'admin' : (role || 'student').toLowerCase();
  if (!isSuperAdmin && !VALID_PUBLIC_ROLES.has(normalizedRole)) {
    await removeUploadedFiles(files);
    return res.status(400).json({ message: 'არასწორი როლი' });
  }

  if (normalizedRole === 'teacher' && files.length === 0) {
    return res.status(400).json({
      message:
        'მასწავლებლის რეგისტრაციისთვის საჭიროა ვერიფიკაციის დამადასტურებელი დოკუმენტის ატვირთვა',
    });
  }

  if (normalizedRole !== 'teacher' && files.length > 0) {
    await removeUploadedFiles(files);
  }

  let client;

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR personal_id = $2',
      [normalizedEmail, personalId],
    );
    if (existing.rows.length > 0) {
      await removeUploadedFiles(files);
      return res.status(409).json({ message: 'ეს ელ-ფოსტა ან პირადი ნომერი უკვე რეგისტრირებულია' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    client = await pool.connect();
    await client.query('BEGIN');

    // ── Referral linkage (teachers only) ──
    let referralCode = null; // the new teacher's own unique code
    let referredByCode = null; // the code they signed up under, once validated
    if (normalizedRole === 'teacher') {
      referralCode = await generateUniqueReferralCode(client);

      if (referralCodeInput) {
        const referrer = await client.query(
          `SELECT id FROM users WHERE referral_code = $1 AND role = 'teacher'`,
          [referralCodeInput],
        );
        if (referrer.rows.length === 0) {
          await client.query('ROLLBACK');
          client.release();
          client = null;
          await removeUploadedFiles(files);
          return res.status(400).json({ message: 'მითითებული რეფერალური კოდი არ არსებობს' });
        }
        referredByCode = referralCodeInput;
      }
    }

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, personal_id, role, referral_code, referred_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, created_at, referral_code, referred_by, vip_until`,
      [
        name.trim(),
        normalizedEmail,
        passwordHash,
        personalId,
        normalizedRole,
        referralCode,
        referredByCode,
      ],
    );
    const user = userResult.rows[0];

    let teacherProfile = null;
    if (normalizedRole === 'teacher') {
      const photoPaths = files.map((file) => `/uploads/verification/${file.filename}`);
      const profileResult = await client.query(
        `INSERT INTO teacher_profiles (user_id, status, verification_photos)
         VALUES ($1, 'pending', $2)
         RETURNING status, verification_photos, rejected_reason`,
        [user.id, photoPaths],
      );
      teacherProfile = profileResult.rows[0];
    }

    // ── Referral reward ──
    // Each completed group of THRESHOLD teacher sign-ups earns the referrer
    // REWARD_DAYS of free VIP. GREATEST(...) extends an already-active window
    // rather than truncating it; a lapsed one restarts from now.
    if (referredByCode) {
      const countResult = await client.query(
        `SELECT COUNT(*)::int AS count FROM users WHERE referred_by = $1 AND role = 'teacher'`,
        [referredByCode],
      );
      const invitedCount = countResult.rows[0].count;
      if (invitedCount > 0 && invitedCount % REFERRAL_REWARD_THRESHOLD === 0) {
        await client.query(
          `UPDATE users
             SET vip_until = GREATEST(COALESCE(vip_until, NOW()), NOW()) + make_interval(days => $2::int)
           WHERE referral_code = $1`,
          [referredByCode, REFERRAL_REWARD_DAYS],
        );
        console.log(
          `Referral reward: ${referredByCode} hit ${invitedCount} sign-ups → +${REFERRAL_REWARD_DAYS} VIP days`,
        );
      }
    }

    await client.query('COMMIT');

    if (normalizedRole === 'teacher') {
      return res.status(201).json({
        message:
          'რეგისტრაცია წარმატებით დასრულდა. თქვენი პროფილი მოლოდინის რეჟიმშია ადმინისტრატორის დადასტურებამდე.',
        user: sanitizeUser(user, teacherProfile),
      });
    }

    const token = signToken({ id: user.id, role: user.role });
    return res.status(201).json({
      message: 'რეგისტრაცია წარმატებით დასრულდა',
      token,
      user: sanitizeUser(user, teacherProfile),
    });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    await removeUploadedFiles(files);

    if (err.code === '23505') {
      const message =
        err.constraint && err.constraint.includes('personal_id')
          ? 'ეს პირადი ნომერი უკვე რეგისტრირებულია'
          : 'ეს ელ-ფოსტა უკვე რეგისტრირებულია';
      return res.status(409).json({ message });
    }

    console.error('Registration failed:', err);
    return sendDbError(res, err, 'რეგისტრაცია ვერ მოხერხდა. სცადეთ თავიდან.');
  } finally {
    if (client) client.release();
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'ელ-ფოსტა და პაროლი სავალდებულოა' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const userResult = await pool.query(
      `SELECT id, name, email, password_hash, role, is_blocked, created_at,
              referral_code, referred_by, vip_until, vip_plus_until,
              video_intro_url, profile_banner, cover_image_url,
              phone_num, whatsapp_num, telegram_username, messenger_url, audio_intro_url,
              avatar_url, bio
       FROM users WHERE email = $1`,
      [normalizedEmail],
    );
    const user = userResult.rows[0];

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ message: 'არასწორი ელ-ფოსტა ან პაროლი' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'არასწორი ელ-ფოსტა ან პაროლი' });
    }

    if (user.is_blocked) {
      return res.status(403).json({
        reason: 'blocked',
        message: 'თქვენი ანგარიში დაბლოკილია ადმინისტრატორის მიერ',
      });
    }

    await sweepExpiredVip(user);

    let teacherProfile = null;
    if (user.role === 'teacher') {
      const profileResult = await pool.query(
        'SELECT status, rejected_reason, verification_photos FROM teacher_profiles WHERE user_id = $1',
        [user.id],
      );
      teacherProfile = profileResult.rows[0];

      if (!teacherProfile || teacherProfile.status === 'pending') {
        return res.status(403).json({
          reason: 'pending',
          message: 'თქვენი რეგისტრაცია მოლოდინის რეჟიმშია ადმინისტრატორის დადასტურებამდე',
        });
      }
      if (teacherProfile.status === 'rejected') {
        return res.status(403).json({
          reason: 'rejected',
          message: `თქვენი პროფილი უარყოფილია. მიზეზი: ${teacherProfile.rejected_reason || 'მითითებული არ არის'}`,
        });
      }
      // status === 'approved' falls through and is allowed to log in.
    }

    const tokenPayload = { id: user.id, role: user.role };
    if (teacherProfile) {
      tokenPayload.teacherStatus = teacherProfile.status;
    }
    const token = signToken(tokenPayload);

    const sanitized = sanitizeUser(user, teacherProfile);
    if (user.role === 'teacher') {
      sanitized.tier = await getTeacherTier(user.id);
    }
    return res.status(200).json({
      message: 'შესვლა წარმატებულია',
      token,
      user: sanitized,
    });
  } catch (err) {
    console.error('Login failed:', err);
    return sendDbError(res, err, 'შესვლა ვერ მოხერხდა. სცადეთ თავიდან.');
  }
}

async function getCurrentUser(req, res) {
  try {
    const userResult = await pool.query(
      `SELECT id, name, email, role, created_at, referral_code, referred_by, vip_until, vip_plus_until,
              video_intro_url, profile_banner, cover_image_url,
              phone_num, whatsapp_num, telegram_username, messenger_url, audio_intro_url,
              avatar_url, bio
       FROM users WHERE id = $1`,
      [req.user.id],
    );
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }

    await sweepExpiredVip(user);

    let teacherProfile = null;
    if (user.role === 'teacher') {
      const profileResult = await pool.query(
        'SELECT status, rejected_reason, verification_photos FROM teacher_profiles WHERE user_id = $1',
        [user.id],
      );
      teacherProfile = profileResult.rows[0];
    }

    const sanitized = sanitizeUser(user, teacherProfile);
    if (user.role === 'teacher') {
      sanitized.tier = await getTeacherTier(user.id);
    }
    return res.status(200).json({ user: sanitized });
  } catch (err) {
    console.error('Fetching current user failed:', err);
    return sendDbError(res, err, 'მომხმარებლის მოძიება ვერ მოხერხდა');
  }
}

// ── Password reset: request a code ──
// Per product decision, responds 404 when the email is not registered (so the
// user gets a clear "no such account" message); on a hit, only a bcrypt hash of
// the 6-digit code is stored, with a 15-minute expiry. The code is emailed via
// Nodemailer and is NEVER returned to the client, logged, or shown in the UI.
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: 'გთხოვთ მიუთითოთ სწორი ელ-ფოსტა' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const userResult = await pool.query('SELECT id, email FROM users WHERE email = $1', [
      normalizedEmail,
    ]);
    const user = userResult.rows[0];

    // Account must exist. Per product decision, tell the user explicitly when the
    // email isn't registered — no OTP is generated and Resend is not called.
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'მითითებული ელ-ფოსტით ანგარიში ვერ მოიძებნა',
      });
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
    const expires = new Date(Date.now() + RESET_CODE_TTL_MIN * 60 * 1000);

    await pool.query(
      `UPDATE users
         SET reset_code_hash = $2, reset_code_expires = $3, reset_code_attempts = 0
       WHERE id = $1`,
      [user.id, codeHash, expires],
    );

    // Dispatch via Nodemailer (Gmail SMTP). The mailer catches its own errors
    // (bad credentials, SMTP outage) and never throws or exposes the code — the
    // account exists, so we report success regardless of delivery outcome.
    await sendPasswordResetEmail(user.email, code);

    return res.status(200).json({
      success: true,
      message: 'კოდი გაიგზავნა! შეამოწმეთ თქვენი ელ-ფოსტა.',
    });
  } catch (err) {
    console.error('forgotPassword failed:', err);
    return sendDbError(res, err, 'მოთხოვნის დამუშავება ვერ მოხერხდა. სცადეთ თავიდან.');
  }
}

// ── Password reset: verify code + set new password ──
async function resetPassword(req, res) {
  const { email, code, password } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: 'გთხოვთ მიუთითოთ სწორი ელ-ფოსტა' });
  }
  if (!code || !/^\d{6}$/.test(String(code).trim())) {
    return res.status(400).json({ message: 'კოდი უნდა შედგებოდეს 6 ციფრისგან' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const userResult = await pool.query(
      `SELECT id, reset_code_hash, reset_code_expires, reset_code_attempts
         FROM users WHERE email = $1`,
      [normalizedEmail],
    );
    const user = userResult.rows[0];
    const invalid = () => res.status(400).json({ message: 'კოდი არასწორია ან ვადაგასულია' });

    if (!user || !user.reset_code_hash || !user.reset_code_expires) {
      return invalid();
    }

    // Expired → burn it and reject.
    if (new Date(user.reset_code_expires).getTime() < Date.now()) {
      await pool.query(
        `UPDATE users SET reset_code_hash = NULL, reset_code_expires = NULL, reset_code_attempts = 0 WHERE id = $1`,
        [user.id],
      );
      return invalid();
    }

    // Too many wrong guesses → burn it and force a fresh request.
    if (user.reset_code_attempts >= RESET_MAX_ATTEMPTS) {
      await pool.query(
        `UPDATE users SET reset_code_hash = NULL, reset_code_expires = NULL, reset_code_attempts = 0 WHERE id = $1`,
        [user.id],
      );
      return res.status(429).json({ message: 'ბევრი მცდელობა. მოითხოვეთ ახალი კოდი.' });
    }

    const matches = await bcrypt.compare(String(code).trim(), user.reset_code_hash);
    if (!matches) {
      await pool.query('UPDATE users SET reset_code_attempts = reset_code_attempts + 1 WHERE id = $1', [
        user.id,
      ]);
      return invalid();
    }

    // Success: set the new password and clear the reset token.
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
      `UPDATE users
         SET password_hash = $2, reset_code_hash = NULL, reset_code_expires = NULL, reset_code_attempts = 0
       WHERE id = $1`,
      [user.id, passwordHash],
    );

    return res.status(200).json({ message: 'პაროლი წარმატებით შეიცვალა!' });
  } catch (err) {
    console.error('resetPassword failed:', err);
    return sendDbError(res, err, 'პაროლის შეცვლა ვერ მოხერხდა. სცადეთ თავიდან.');
  }
}

module.exports = { register, login, getCurrentUser, forgotPassword, resetPassword };
