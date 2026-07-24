const fs = require('fs/promises');
const path = require('path');
const pool = require('../config/db');
const { sendDbError } = require('../utils/dbErrors');
const { UUID_REGEX } = require('../utils/validators');
const { CONTACT_CHANNELS } = require('../utils/premium');
const { getTeacherTier } = require('../utils/tiers');
const { effectivePackageSql } = require('../utils/packages');
const { publicPath } = require('../middleware/uploadImage');
const { mapPost } = require('./postController');

// Light normalization so stored values are clean and render predictably.
function normalizePhone(v) {
  const s = (v || '').toString().trim();
  if (!s) return null;
  const cleaned = s.replace(/[^\d+]/g, '');
  return cleaned.slice(0, 32) || null;
}
function normalizeWhatsapp(v) {
  const s = (v || '').toString().trim();
  if (!s) return null;
  // Keep a leading + and digits only.
  const cleaned = s.replace(/[^\d+]/g, '');
  return cleaned.slice(0, 32) || null;
}
function normalizeTelegram(v) {
  const s = (v || '').toString().trim().replace(/^@+/, '');
  if (!s) return null;
  return s.slice(0, 64);
}
function normalizeMessenger(v) {
  const s = (v || '').toString().trim();
  if (!s) return null;
  return s.slice(0, 255);
}

function contactPayload(row) {
  return {
    phone: row.phone_num || null,
    whatsapp: row.whatsapp_num || null,
    telegram: row.telegram_username || null,
    messenger: row.messenger_url || null,
    audioIntroUrl: row.audio_intro_url || null,
    ...(row.bio !== undefined && { bio: row.bio || null }),
  };
}

// PUT /api/teachers/contact — update the logged-in teacher's contact channels
// + senior-friendly audio intro (available to every teacher, any tier).
async function updateContact(req, res) {
  const phone = normalizePhone(req.body.phoneNum);
  const whatsapp = normalizeWhatsapp(req.body.whatsappNum);
  const telegram = normalizeTelegram(req.body.telegramUsername);
  const messenger = normalizeMessenger(req.body.messengerUrl);
  const audioIntro = (req.body.audioIntroUrl || '').toString().trim().slice(0, 255) || null;
  const bio = req.body.bio !== undefined ? (req.body.bio || '').toString().trim().slice(0, 1000) || null : undefined;

  if (messenger && !/^https?:\/\//i.test(messenger)) {
    return res.status(400).json({ message: 'Messenger ბმული უნდა იწყებოდეს http:// ან https://' });
  }
  if (audioIntro && !/^https?:\/\//i.test(audioIntro)) {
    return res.status(400).json({ message: 'აუდიოს ბმული უნდა იწყებოდეს http:// ან https://' });
  }

  try {
    // bio is only touched when the client sends it (COALESCE keeps existing).
    const result = await pool.query(
      `UPDATE users
         SET phone_num = $2, whatsapp_num = $3, telegram_username = $4, messenger_url = $5, audio_intro_url = $6,
             bio = CASE WHEN $8::boolean THEN $7 ELSE bio END
       WHERE id = $1
       RETURNING phone_num, whatsapp_num, telegram_username, messenger_url, audio_intro_url, bio`,
      [req.user.id, phone, whatsapp, telegram, messenger, audioIntro, bio ?? null, bio !== undefined],
    );
    return res.status(200).json({ message: 'საკონტაქტო არხები განახლდა ✓', contact: contactPayload(result.rows[0]) });
  } catch (err) {
    console.error('Updating contact failed:', err);
    return sendDbError(res, err, 'საკონტაქტო არხების განახლება ვერ მოხერხდა');
  }
}

// PUT /api/teachers/profile — VIP+ profile extras (video intro + banner).
// Ultimate-tier only.
async function updateProfile(req, res) {
  const videoUrl = (req.body.videoIntroUrl || '').toString().trim().slice(0, 255) || null;
  const banner = (req.body.profileBanner || '').toString().trim().slice(0, 255) || null;
  const coverImageUrl = (req.body.coverImageUrl || '').toString().trim().slice(0, 255) || null;

  if (videoUrl && !/^https?:\/\//i.test(videoUrl)) {
    return res.status(400).json({ message: 'ვიდეოს ბმული უნდა იწყებოდეს http:// ან https://' });
  }
  if (coverImageUrl && !/^https?:\/\//i.test(coverImageUrl)) {
    return res.status(400).json({ message: 'ქავერის ბმული უნდა იწყებოდეს http:// ან https://' });
  }

  try {
    const tier = await getTeacherTier(req.user.id);
    if (tier !== 'vip_plus') {
      return res.status(403).json({
        reason: 'vip_plus_only',
        message: 'ვიდეო-პრეზენტაცია, ქავერი და ბანერი VIP+ ფუნქციაა',
      });
    }
    const r = await pool.query(
      `UPDATE users SET video_intro_url = $2, profile_banner = $3, cover_image_url = $4 WHERE id = $1
       RETURNING video_intro_url, profile_banner, cover_image_url`,
      [req.user.id, videoUrl, banner, coverImageUrl],
    );
    return res.status(200).json({
      message: 'პროფილი განახლდა ✓',
      profile: {
        videoIntroUrl: r.rows[0].video_intro_url || null,
        profileBanner: r.rows[0].profile_banner || null,
        coverImageUrl: r.rows[0].cover_image_url || null,
      },
    });
  } catch (err) {
    console.error('Updating profile failed:', err);
    return sendDbError(res, err, 'პროფილის განახლება ვერ მოხერხდა');
  }
}

// ── Item 4: weekly availability matrix ──
function mapAvailability(rows) {
  return rows.map((r) => ({ day: r.day_of_week, hour: r.hour }));
}

// GET /api/teachers/availability/me — the logged-in teacher's own grid.
async function getMyAvailability(req, res) {
  try {
    const r = await pool.query(
      'SELECT day_of_week, hour FROM weekly_availability WHERE teacher_id = $1 ORDER BY day_of_week, hour',
      [req.user.id],
    );
    const tier = await getTeacherTier(req.user.id);
    return res.status(200).json({ slots: mapAvailability(r.rows), tier, canEdit: tier !== 'standard' });
  } catch (err) {
    console.error('Fetching availability failed:', err);
    return sendDbError(res, err, 'ხელმისაწვდომობის ჩატვირთვა ვერ მოხერხდა');
  }
}

// GET /api/teachers/:id/availability — public; a teacher's grid + their WhatsApp
// number (only when premium, so students can generate the booking template).
async function getTeacherAvailability(req, res) {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი ID' });
  }
  try {
    const [rows, teacher] = await Promise.all([
      pool.query(
        'SELECT day_of_week, hour FROM weekly_availability WHERE teacher_id = $1 ORDER BY day_of_week, hour',
        [id],
      ),
      pool.query(
        `SELECT name, whatsapp_num, phone_num, telegram_username, video_intro_url, profile_banner, cover_image_url, audio_intro_url
           FROM users WHERE id = $1`,
        [id],
      ),
    ]);
    const t = teacher.rows[0] || {};
    const tier = await getTeacherTier(id);
    // Only expose the contact number to build the WhatsApp link when premium.
    const premium = tier !== 'standard';
    // Video intro + banner + cover are VIP+ Ultimate-tier profile features.
    const isVipPlus = tier === 'vip_plus';
    return res.status(200).json({
      slots: mapAvailability(rows.rows),
      teacherName: t.name || '',
      // Direct contact is shown on every booking page (no longer premium-gated).
      phone: t.phone_num || null,
      whatsapp: t.whatsapp_num || t.phone_num || null,
      telegram: t.telegram_username || null,
      videoIntroUrl: isVipPlus ? t.video_intro_url || null : null,
      profileBanner: isVipPlus ? t.profile_banner || null : null,
      coverImageUrl: t.cover_image_url || null,
      // Senior-friendly audio greeting — available to every tier.
      audioIntroUrl: t.audio_intro_url || null,
      tier,
    });
  } catch (err) {
    console.error('Fetching teacher availability failed:', err);
    return sendDbError(res, err, 'ხელმისაწვდომობის ჩატვირთვა ვერ მოხერხდა');
  }
}

// PUT /api/teachers/availability — replace the grid. VIP/VIP+ only.
async function setAvailability(req, res) {
  const incoming = Array.isArray(req.body.slots) ? req.body.slots : [];
  // Validate + de-dup to (day 0-6, hour 0-23) integer pairs.
  const seen = new Set();
  const slots = [];
  for (const s of incoming) {
    const day = Number(s?.day);
    const hour = Number(s?.hour);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;
    const key = `${day}-${hour}`;
    if (seen.has(key)) continue;
    seen.add(key);
    slots.push({ day, hour });
  }
  if (slots.length > 168) {
    return res.status(400).json({ message: 'ძალიან ბევრი უჯრა' });
  }

  let client;
  try {
    const tier = await getTeacherTier(req.user.id);
    if (tier === 'standard') {
      return res.status(403).json({
        reason: 'vip_only',
        message: 'ხელმისაწვდომობის განრიგი VIP/VIP+ ფუნქციაა',
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('DELETE FROM weekly_availability WHERE teacher_id = $1', [req.user.id]);
    if (slots.length > 0) {
      // Build a single multi-row insert.
      const values = [];
      const params = [req.user.id];
      slots.forEach((s, i) => {
        values.push(`($1, $${i * 2 + 2}, $${i * 2 + 3})`);
        params.push(s.day, s.hour);
      });
      await client.query(
        `INSERT INTO weekly_availability (teacher_id, day_of_week, hour) VALUES ${values.join(', ')}`,
        params,
      );
    }
    await client.query('COMMIT');
    return res.status(200).json({ message: 'ხელმისაწვდომობა შენახულია ✓', slots });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Saving availability failed:', err);
    return sendDbError(res, err, 'ხელმისაწვდომობის შენახვა ვერ მოხერხდა');
  } finally {
    if (client) client.release();
  }
}

// GET /api/teachers/analytics — traffic + conversion stats over the teacher's
// own posts. Any teacher may call it; the frontend reserves the rich display
// for VIP+.
async function getAnalytics(req, res) {
  try {
    const totals = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN pv.clicked_contact IS NULL THEN 1 ELSE 0 END), 0)::int AS total_views,
         COUNT(DISTINCT CASE WHEN pv.clicked_contact IS NULL THEN pv.viewer_session_id END)::int AS unique_viewers,
         COALESCE(SUM(CASE WHEN pv.clicked_contact IS NOT NULL THEN 1 ELSE 0 END), 0)::int AS total_clicks,
         -- Feature 3: "Recent Inquiries" = contact clicks in the last 7 days.
         COALESCE(SUM(CASE WHEN pv.clicked_contact IS NOT NULL AND pv.created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0)::int AS recent_inquiries
       FROM posts p
       LEFT JOIN post_views pv ON pv.post_id = p.id
       WHERE p.teacher_id = $1`,
      [req.user.id],
    );
    const t = totals.rows[0];

    const channels = await pool.query(
      `SELECT pv.clicked_contact AS channel, COUNT(*)::int AS clicks
         FROM post_views pv
         JOIN posts p ON p.id = pv.post_id
        WHERE p.teacher_id = $1 AND pv.clicked_contact IS NOT NULL
        GROUP BY pv.clicked_contact`,
      [req.user.id],
    );
    const byChannel = Object.fromEntries(CONTACT_CHANNELS.map((c) => [c, 0]));
    channels.rows.forEach((r) => {
      if (r.channel in byChannel) byChannel[r.channel] = r.clicks;
    });

    const perPost = await pool.query(
      `SELECT p.id, p.title,
              COALESCE(SUM(CASE WHEN pv.clicked_contact IS NULL THEN 1 ELSE 0 END), 0)::int AS views,
              COALESCE(SUM(CASE WHEN pv.clicked_contact IS NOT NULL THEN 1 ELSE 0 END), 0)::int AS clicks
         FROM posts p
         LEFT JOIN post_views pv ON pv.post_id = p.id
        WHERE p.teacher_id = $1
        GROUP BY p.id, p.title
        ORDER BY views DESC, p.created_at DESC`,
      [req.user.id],
    );

    const conversionRate = t.total_views > 0 ? t.total_clicks / t.total_views : 0;

    // Tier signal so the frontend can reserve the dashboard for premium teachers.
    const tierRes = await pool.query(
      `SELECT
         COALESCE(bool_or(package_type = 'vip_plus' AND (active_until IS NULL OR active_until > NOW())), false) AS has_vip_plus,
         COALESCE(bool_or(package_type = 'vip' AND (active_until IS NULL OR active_until > NOW())), false) AS has_vip
       FROM posts WHERE teacher_id = $1`,
      [req.user.id],
    );
    const userRes = await pool.query('SELECT vip_until FROM users WHERE id = $1', [req.user.id]);
    const earnedVip = userRes.rows[0]?.vip_until
      ? new Date(userRes.rows[0].vip_until).getTime() > Date.now()
      : false;
    const isVipPlus = tierRes.rows[0].has_vip_plus === true;
    const isPremium = isVipPlus || tierRes.rows[0].has_vip === true || earnedVip;

    return res.status(200).json({
      totalViews: t.total_views,
      uniqueViewers: t.unique_viewers,
      totalClicks: t.total_clicks,
      recentInquiries: t.recent_inquiries,
      conversionRate,
      byChannel,
      perPost: perPost.rows.map((r) => ({ id: r.id, title: r.title, views: r.views, clicks: r.clicks })),
      isPremium,
      isVipPlus,
    });
  } catch (err) {
    console.error('Fetching analytics failed:', err);
    return sendDbError(res, err, 'ანალიტიკის ჩატვირთვა ვერ მოხერხდა');
  }
}

// PUT /api/teachers/avatar — upload/replace the current user's avatar (any tier,
// any authenticated user). Multipart: field name "image".
async function updateAvatar(req, res) {
  if (!req.file) return res.status(400).json({ message: 'ფაილი არ არის ატვირთული' });
  const url = publicPath(req.file);
  try {
    const old = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [req.user.id]);
    await pool.query('UPDATE users SET avatar_url = $2 WHERE id = $1', [req.user.id, url]);
    const prev = old.rows[0]?.avatar_url;
    if (prev && prev.startsWith('/uploads/images/')) {
      fs.unlink(path.join(__dirname, '..', prev)).catch(() => {});
    }
    return res.status(200).json({ message: 'ავატარი განახლდა ✓', avatarUrl: url });
  } catch (err) {
    console.error('Avatar upload failed:', err);
    return sendDbError(res, err, 'ავატარის ატვირთვა ვერ მოხერხდა');
  }
}

// PUT /api/teachers/cover — upload/replace the cover (banner) image. Any teacher.
// Multipart: field name "image".
async function updateCover(req, res) {
  if (!req.file) return res.status(400).json({ message: 'ფაილი არ არის ატვირთული' });
  const url = publicPath(req.file);
  try {
    const old = await pool.query('SELECT cover_image_url FROM users WHERE id = $1', [req.user.id]);
    await pool.query('UPDATE users SET cover_image_url = $2 WHERE id = $1', [req.user.id, url]);
    const prev = old.rows[0]?.cover_image_url;
    if (prev && prev.startsWith('/uploads/images/')) {
      fs.unlink(path.join(__dirname, '..', prev)).catch(() => {});
    }
    return res.status(200).json({ message: 'ქავერი განახლდა ✓', coverImageUrl: url });
  } catch (err) {
    console.error('Cover upload failed:', err);
    return sendDbError(res, err, 'ქავერის ატვირთვა ვერ მოხერხდა');
  }
}

// GET /api/teachers/:id/profile — public teacher profile: identity + bio +
// contact + aggregated subjects/cities + their active listings.
async function getPublicProfile(req, res) {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return res.status(400).json({ message: 'არასწორი ID' });
  try {
    const userRes = await pool.query(
      `SELECT id, name, avatar_url, bio, whatsapp_num, phone_num, telegram_username, audio_intro_url,
              video_intro_url, cover_image_url
         FROM users WHERE id = $1 AND role = 'teacher'`,
      [id],
    );
    const u = userRes.rows[0];
    if (!u) return res.status(404).json({ message: 'მასწავლებელი ვერ მოიძებნა' });

    const tier = await getTeacherTier(id);
    const premium = tier !== 'standard';
    const isVipPlus = tier === 'vip_plus';

    const postsRes = await pool.query(
      `WITH pp AS (
         SELECT p.id, p.title, p.content, p.created_at, p.teacher_id, p.package_type, p.active_until,
                p.target_audience, p.price, p.format, p.subject, p.city, p.last_bumped_at,
                p.syllabus_url, p.image_url,
                us.name AS teacher_name, us.avatar_url AS teacher_avatar,
                ${effectivePackageSql('p', 'us')} AS effective_package,
                -- Direct contact is public for every teacher (all tiers) — no paywall.
                us.phone_num,
                us.whatsapp_num,
                us.telegram_username,
                us.messenger_url,
                CASE WHEN p.promo_tag IS NOT NULL AND (p.promo_expires_at IS NULL OR p.promo_expires_at > NOW())
                     THEN p.promo_tag ELSE NULL END AS promo_tag_active,
                p.promo_expires_at
           FROM posts p JOIN users us ON us.id = p.teacher_id
          WHERE p.teacher_id = $1 AND (p.active_until IS NULL OR p.active_until > NOW())
       )
       SELECT * FROM pp
       ORDER BY CASE effective_package WHEN 'vip_plus' THEN 0 WHEN 'vip' THEN 1 ELSE 2 END,
                last_bumped_at DESC NULLS LAST, created_at DESC`,
      [id],
    );
    const posts = postsRes.rows.map(mapPost);
    const subjects = [...new Set(posts.map((p) => p.subject).filter(Boolean))];
    const cities = [...new Set(posts.map((p) => p.city).filter(Boolean))];

    return res.status(200).json({
      id: u.id,
      name: u.name,
      avatarUrl: u.avatar_url || null,
      bio: u.bio || null,
      tier,
      isVerified: isVipPlus,
      // Direct contact is shown on every public profile (no longer premium-gated).
      phone: u.phone_num || null,
      whatsapp: u.whatsapp_num || u.phone_num || null,
      telegram: u.telegram_username || null,
      audioIntroUrl: u.audio_intro_url || null,
      videoIntroUrl: isVipPlus ? u.video_intro_url || null : null,
      // Cover image is a general profile-completeness feature (all teachers).
      coverImageUrl: u.cover_image_url || null,
      subjects,
      cities,
      posts,
    });
  } catch (err) {
    console.error('Fetching public profile failed:', err);
    return sendDbError(res, err, 'პროფილის ჩატვირთვა ვერ მოხერხდა');
  }
}

module.exports = {
  updateContact,
  updateProfile,
  updateAvatar,
  updateCover,
  getPublicProfile,
  getAnalytics,
  getMyAvailability,
  getTeacherAvailability,
  setAvailability,
};
