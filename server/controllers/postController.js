const pool = require('../config/db');
const { sendDbError } = require('../utils/dbErrors');
const { UUID_REGEX } = require('../utils/validators');
const { MONTHLY_DAYS, effectivePackageSql, isPremiumSql } = require('../utils/packages');
const { TARGET_AUDIENCES, CONTACT_CHANNELS, FORMATS, LOCATIONS, PAYMENTS_ENABLED } = require('../utils/premium');
const { getTeacherTier, countActivePosts, postLimitFor } = require('../utils/tiers');

function mapPost(row) {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    ...(row.package_type !== undefined && {
      packageType: row.package_type,
      activeUntil: row.active_until || null,
      // effective_package folds in the teacher's earned VIP status; fall back
      // to the raw package when a query didn't compute it (e.g. createPost).
      effectivePackage: row.effective_package || row.package_type,
      // Feature 5: pinned + "Verified Expert" are computed from active VIP+ so
      // they can never drift from the tier. The feed ORDER BY pins these first.
      isPinned: (row.effective_package || row.package_type) === 'vip_plus',
      isVerified: (row.effective_package || row.package_type) === 'vip_plus',
    }),
    ...(row.target_audience !== undefined && { targetAudience: row.target_audience || [] }),
    ...(row.price !== undefined && { price: row.price ?? null }),
    ...(row.format !== undefined && { format: row.format || null }),
    ...(row.subject !== undefined && { subject: row.subject || null }),
    ...(row.city !== undefined && { city: row.city || null }),
    ...(row.last_bumped_at !== undefined && { lastBumpedAt: row.last_bumped_at || null }),
    ...(row.syllabus_url !== undefined && { syllabusUrl: row.syllabus_url || null }),
    ...(row.image_url !== undefined && { imageUrl: row.image_url || null }),
    ...(row.teacher_avatar !== undefined && { teacherAvatar: row.teacher_avatar || null }),
    // Contact channels are ALL scrubbed server-side for standard posts (every
    // field arrives NULL), so the paywall can't be bypassed by reading the API
    // directly — the frontend shows a blurred "Unlock with VIP" lock instead.
    ...(row.whatsapp_num !== undefined && {
      contact: {
        phone: row.phone_num || null,
        whatsapp: row.whatsapp_num || null,
        telegram: row.telegram_username || null,
        messenger: row.messenger_url || null,
      },
    }),
    // Active promo only (expired promos are filtered out in SQL → promo_tag_active).
    ...(row.promo_tag_active !== undefined && {
      promo: row.promo_tag_active
        ? { tag: row.promo_tag_active, expiresAt: row.promo_expires_at || null }
        : null,
    }),
    ...(row.teacher_name && { teacherName: row.teacher_name }),
    ...(row.avg_rating !== undefined && {
      avgRating: Number(row.avg_rating),
      ratingCount: Number(row.rating_count),
      commentCount: Number(row.comment_count),
      myRating: row.my_rating ? Number(row.my_rating) : null,
    }),
    ...(row.is_saved !== undefined && { isSaved: row.is_saved === true }),
    ...(row.availability !== undefined && { availability: row.availability || [] }),
  };
}

// Keep only known audience keys, de-duplicated — defends the array column from
// arbitrary client input.
function sanitizeAudience(input) {
  if (!Array.isArray(input)) return [];
  return TARGET_AUDIENCES.filter((key) => input.includes(key));
}

// Coerce matching-engine fields to safe, storable values.
function sanitizePrice(input) {
  if (input === '' || input === null || input === undefined) return null;
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(Math.round(n), 100000);
}
function sanitizeFormat(input) {
  return FORMATS.includes(input) ? input : null;
}
function sanitizeSubject(input) {
  const s = (input || '').toString().trim();
  return s ? s.slice(0, 64) : null;
}
// Syllabus is a link to a PDF / document; must be an http(s) URL or null.
function sanitizeUrl(input) {
  const s = (input || '').toString().trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  return s.slice(0, 255);
}
// City must be a known location key ('online' or a city) or null.
function sanitizeCity(input) {
  const s = (input || '').toString().trim();
  return LOCATIONS.has(s) ? s : null;
}

async function createPost(req, res) {
  const { title, content } = req.body;
  const targetAudience = sanitizeAudience(req.body.targetAudience);
  const price = sanitizePrice(req.body.price);
  const format = sanitizeFormat(req.body.format);
  const subject = sanitizeSubject(req.body.subject);
  const syllabusUrl = sanitizeUrl(req.body.syllabusUrl);
  const city = sanitizeCity(req.body.city);

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'სათაური სავალდებულოა' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'შინაარსი სავალდებულოა' });
  }

  try {
    const profileResult = await pool.query(
      'SELECT status FROM teacher_profiles WHERE user_id = $1',
      [req.user.id],
    );
    const teacherProfile = profileResult.rows[0];

    if (!teacherProfile || teacherProfile.status !== 'approved') {
      return res.status(403).json({
        message: 'პოსტის გამოქვეყნება შეუძლიათ მხოლოდ დამტკიცებულ მასწავლებლებს',
      });
    }

    // Item 2: enforce the tier's active-post limit. Standard = 1, VIP = 5,
    // VIP+ = unlimited. Blocked with 403 (the frontend surfaces an upgrade CTA).
    const tier = await getTeacherTier(req.user.id);
    const limit = postLimitFor(tier);
    if (Number.isFinite(limit)) {
      const active = await countActivePosts(req.user.id);
      if (active >= limit) {
        return res.status(403).json({
          reason: 'post_limit',
          tier,
          limit,
          message:
            tier === 'standard'
              ? 'Standard პაკეტზე დაშვებულია მხოლოდ 1 აქტიური პოსტი. VIP-ით მიიღებთ 5-ს, VIP+-ით — ულიმიტოს.'
              : `თქვენს პაკეტზე დაშვებულია მაქსიმუმ ${limit} აქტიური პოსტი. VIP+-ით მიიღებთ ულიმიტოს.`,
        });
      }
    }

    // A newly published post is 'standard' and live for a month (the base
    // "monthly fee" window). The teacher can upgrade it to VIP/VIP+ at checkout.
    const result = await pool.query(
      `INSERT INTO posts (teacher_id, title, content, active_until, target_audience, price, format, subject, syllabus_url, city)
       VALUES ($1, $2, $3, NOW() + make_interval(days => $4::int), $5, $6, $7, $8, $9, $10)
       RETURNING id, teacher_id, title, content, created_at, package_type, active_until,
                 target_audience, price, format, subject, syllabus_url, city, last_bumped_at, image_url`,
      [req.user.id, title.trim(), content.trim(), MONTHLY_DAYS, targetAudience, price, format, subject, syllabusUrl, city],
    );

    return res.status(201).json({ message: 'პოსტი წარმატებით გამოქვეყნდა', post: mapPost(result.rows[0]) });
  } catch (err) {
    console.error('Creating post failed:', err);
    return sendDbError(res, err, 'პოსტის გამოქვეყნება ვერ მოხერხდა');
  }
}

async function getPosts(req, res) {
  try {
    // req.user comes from optionalAuth — null for anonymous visitors, in
    // which case my_rating is simply never matched.
    const viewerId = req.user?.id || null;
    // Premium ranking first (VIP+ → VIP → standard), then newest within a tier.
    // The tiers come from effective_package, which also honors a teacher's
    // earned VIP status, so referral rewards surface here too.
    const result = await pool.query(
      `WITH feed AS (
         SELECT
           p.id,
           p.title,
           p.content,
           p.created_at,
           p.teacher_id,
           p.package_type,
           p.active_until,
           p.target_audience,
           p.price,
           p.format,
           p.subject,
           p.city,
           p.last_bumped_at,
           p.syllabus_url,
           p.image_url,
           u.name AS teacher_name,
           u.avatar_url AS teacher_avatar,
           ${effectivePackageSql('p', 'u')} AS effective_package,
           -- Direct contact is public for every teacher (all tiers) — students
           -- must be able to reach any active teacher without a paywall.
           u.phone_num,
           u.whatsapp_num,
           u.telegram_username,
           u.messenger_url,
           -- Only surface a promo while it is active.
           CASE WHEN p.promo_tag IS NOT NULL AND (p.promo_expires_at IS NULL OR p.promo_expires_at > NOW())
                THEN p.promo_tag ELSE NULL END AS promo_tag_active,
           p.promo_expires_at,
           COALESCE(rs.avg_rating, 0)::float AS avg_rating,
           COALESCE(rs.rating_count, 0)::int AS rating_count,
           COALESCE(cs.comment_count, 0)::int AS comment_count,
           mr.stars AS my_rating,
           (sv.id IS NOT NULL) AS is_saved,
           -- Teacher's weekly availability slots — used by the "search by availability" filter.
           COALESCE((SELECT json_agg(json_build_object('day', wa.day_of_week, 'hour', wa.hour))
                     FROM weekly_availability wa WHERE wa.teacher_id = p.teacher_id), '[]') AS availability
         FROM posts p
         JOIN users u ON u.id = p.teacher_id
         LEFT JOIN (
           SELECT post_id, AVG(stars) AS avg_rating, COUNT(*) AS rating_count
           FROM ratings GROUP BY post_id
         ) rs ON rs.post_id = p.id
         LEFT JOIN (
           SELECT post_id, COUNT(*) AS comment_count
           FROM comments GROUP BY post_id
         ) cs ON cs.post_id = p.id
         LEFT JOIN ratings mr ON mr.post_id = p.id AND mr.user_id = $1::uuid
         LEFT JOIN saved_posts sv ON sv.post_id = p.id AND sv.user_id = $1::uuid
       )
       SELECT * FROM feed
       ORDER BY
         -- Tier first (VIP+ pinned to the absolute top, then VIP, then standard),
         -- then a paid bump-up, then recency — so a bump lifts a post within its
         -- own tier without leapfrogging a higher-paying tier.
         CASE effective_package WHEN 'vip_plus' THEN 0 WHEN 'vip' THEN 1 ELSE 2 END,
         last_bumped_at DESC NULLS LAST,
         created_at DESC`,
      [viewerId],
    );

    return res.status(200).json({ posts: result.rows.map(mapPost) });
  } catch (err) {
    console.error('Fetching posts failed:', err);
    return sendDbError(res, err, 'პოსტების ჩატვირთვა ვერ მოხერხდა');
  }
}

async function ratePost(req, res) {
  const { id } = req.params;
  const stars = Number(req.body.stars);

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი პოსტის ID' });
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ message: 'შეფასება უნდა იყოს 1-დან 5 ვარსკვლავამდე' });
  }

  try {
    const postResult = await pool.query('SELECT teacher_id FROM posts WHERE id = $1', [id]);
    const post = postResult.rows[0];
    if (!post) {
      return res.status(404).json({ message: 'პოსტი ვერ მოიძებნა' });
    }
    if (post.teacher_id === req.user.id) {
      return res.status(400).json({ message: 'საკუთარი პოსტის შეფასება შეუძლებელია' });
    }

    await pool.query(
      `INSERT INTO ratings (post_id, user_id, stars)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id) DO UPDATE SET stars = EXCLUDED.stars`,
      [id, req.user.id, stars],
    );

    const agg = await pool.query(
      `SELECT AVG(stars)::float AS avg_rating, COUNT(*)::int AS rating_count
       FROM ratings WHERE post_id = $1`,
      [id],
    );

    return res.status(200).json({
      message: `შეფასდა ${stars} ვარსკვლავით ★`,
      avgRating: agg.rows[0].avg_rating,
      ratingCount: agg.rows[0].rating_count,
      myRating: stars,
    });
  } catch (err) {
    console.error('Rating post failed:', err);
    return sendDbError(res, err, 'შეფასება ვერ მოხერხდა');
  }
}

async function reportPost(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი პოსტის ID' });
  }
  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: 'გთხოვთ მიუთითოთ შეტყობინების მიზეზი' });
  }

  try {
    const postResult = await pool.query('SELECT teacher_id FROM posts WHERE id = $1', [id]);
    const post = postResult.rows[0];
    if (!post) {
      return res.status(404).json({ message: 'პოსტი ვერ მოიძებნა' });
    }
    if (post.teacher_id === req.user.id) {
      return res.status(400).json({ message: 'საკუთარი პოსტის დარეპორტება შეუძლებელია' });
    }

    await pool.query(
      `INSERT INTO reports (post_id, reporter_id, reason)
       VALUES ($1, $2, $3)`,
      [id, req.user.id, reason.trim()],
    );

    return res.status(201).json({ message: 'შეტყობინება გაიგზავნა ადმინისტრატორთან ✓' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'თქვენ უკვე დაარეპორტეთ ეს პოსტი' });
    }
    console.error('Reporting post failed:', err);
    return sendDbError(res, err, 'შეტყობინების გაგზავნა ვერ მოხერხდა');
  }
}

async function toggleSave(req, res) {
  const { id } = req.params;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი პოსტის ID' });
  }

  try {
    const postExists = await pool.query('SELECT id FROM posts WHERE id = $1', [id]);
    if (!postExists.rows[0]) {
      return res.status(404).json({ message: 'პოსტი ვერ მოიძებნა' });
    }

    // Delete-first toggle: if a row was there, this was an unsave.
    const removed = await pool.query(
      'DELETE FROM saved_posts WHERE user_id = $1 AND post_id = $2 RETURNING id',
      [req.user.id, id],
    );
    if (removed.rows[0]) {
      return res.status(200).json({ saved: false, message: 'შენახვა გაუქმდა' });
    }

    await pool.query(
      'INSERT INTO saved_posts (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, id],
    );
    return res.status(200).json({ saved: true, message: 'პოსტი შენახულია ✓' });
  } catch (err) {
    console.error('Toggling save failed:', err);
    return sendDbError(res, err, 'შენახვა ვერ მოხერხდა');
  }
}

async function getSavedPosts(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         p.id,
         p.title,
         p.content,
         p.created_at,
         p.teacher_id,
         p.package_type,
         p.active_until,
         p.target_audience,
         p.price,
         p.format,
         p.subject,
         p.city,
         p.last_bumped_at,
         p.syllabus_url,
         p.image_url,
         u.name AS teacher_name,
         u.avatar_url AS teacher_avatar,
         ${effectivePackageSql('p', 'u')} AS effective_package,
         -- Direct contact is public for every teacher (all tiers) — no paywall.
         u.phone_num,
         u.whatsapp_num,
         u.telegram_username,
         u.messenger_url,
         CASE WHEN p.promo_tag IS NOT NULL AND (p.promo_expires_at IS NULL OR p.promo_expires_at > NOW())
              THEN p.promo_tag ELSE NULL END AS promo_tag_active,
         p.promo_expires_at,
         COALESCE(rs.avg_rating, 0)::float AS avg_rating,
         COALESCE(rs.rating_count, 0)::int AS rating_count,
         COALESCE(cs.comment_count, 0)::int AS comment_count,
         mr.stars AS my_rating,
         TRUE AS is_saved
       FROM saved_posts sp
       JOIN posts p ON p.id = sp.post_id
       JOIN users u ON u.id = p.teacher_id
       LEFT JOIN (
         SELECT post_id, AVG(stars) AS avg_rating, COUNT(*) AS rating_count
         FROM ratings GROUP BY post_id
       ) rs ON rs.post_id = p.id
       LEFT JOIN (
         SELECT post_id, COUNT(*) AS comment_count
         FROM comments GROUP BY post_id
       ) cs ON cs.post_id = p.id
       LEFT JOIN ratings mr ON mr.post_id = p.id AND mr.user_id = $1
       WHERE sp.user_id = $1
       ORDER BY sp.created_at DESC`,
      [req.user.id],
    );

    return res.status(200).json({ posts: result.rows.map(mapPost) });
  } catch (err) {
    console.error('Fetching saved posts failed:', err);
    return sendDbError(res, err, 'შენახული პოსტების ჩატვირთვა ვერ მოხერხდა');
  }
}

// ── Module 4: VIP promo/discount manager ──
async function updatePromo(req, res) {
  const { id } = req.params;
  const promoTag = (req.body.promoTag || '').trim();
  const promoExpiresAt = req.body.promoExpiresAt || null;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი პოსტის ID' });
  }
  if (promoTag.length > 120) {
    return res.status(400).json({ message: 'პრომო ტექსტი მაქსიმუმ 120 სიმბოლო' });
  }
  let expiresIso = null;
  if (promoExpiresAt) {
    const d = new Date(promoExpiresAt);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ message: 'არასწორი ვადის თარიღი' });
    }
    expiresIso = d.toISOString();
  }

  try {
    // Owner + premium check in one shot.
    const check = await pool.query(
      `SELECT p.teacher_id, ${isPremiumSql('p', 'u')} AS is_premium
         FROM posts p JOIN users u ON u.id = p.teacher_id WHERE p.id = $1`,
      [id],
    );
    const row = check.rows[0];
    if (!row) return res.status(404).json({ message: 'პოსტი ვერ მოიძებნა' });
    if (row.teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'მხოლოდ პოსტის ავტორს შეუძლია პრომოს დაყენება' });
    }
    if (!row.is_premium) {
      return res.status(403).json({ message: 'პრომო ბანერი ხელმისაწვდომია მხოლოდ VIP პაკეტებზე' });
    }

    // Empty tag clears the promo entirely.
    const finalTag = promoTag || null;
    const finalExpiry = finalTag ? expiresIso : null;
    await pool.query('UPDATE posts SET promo_tag = $2, promo_expires_at = $3 WHERE id = $1', [
      id,
      finalTag,
      finalExpiry,
    ]);

    const active =
      finalTag && (!finalExpiry || new Date(finalExpiry).getTime() > Date.now())
        ? { tag: finalTag, expiresAt: finalExpiry }
        : null;
    return res.status(200).json({ message: 'პრომო განახლდა ✓', promo: active });
  } catch (err) {
    console.error('Updating promo failed:', err);
    return sendDbError(res, err, 'პრომოს განახლება ვერ მოხერხდა');
  }
}

// ── Feature 4: bump-up (პოსტის ამოწევა) ──
async function bumpPost(req, res) {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი პოსტის ID' });
  }
  // Demo phase: bump is a paid action (2₾) and payments are switched off.
  if (!PAYMENTS_ENABLED) {
    return res.status(403).json({
      reason: 'coming_soon',
      message: 'პოსტის ამოწევა მალე დაემატება ⏳',
    });
  }
  try {
    const owner = await pool.query('SELECT teacher_id FROM posts WHERE id = $1', [id]);
    if (!owner.rows[0]) return res.status(404).json({ message: 'პოსტი ვერ მოიძებნა' });
    if (owner.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'მხოლოდ ავტორს შეუძლია პოსტის ამოწევა' });
    }
    await pool.query('UPDATE posts SET last_bumped_at = NOW() WHERE id = $1', [id]);
    return res.status(200).json({ message: 'პოსტი ამოწეულია 🚀' });
  } catch (err) {
    console.error('Bump failed:', err);
    return sendDbError(res, err, 'ამოწევა ვერ მოხერხდა');
  }
}

// ── Item 3: attach an uploaded image to a post (VIP/VIP+ only) ──
async function attachPostImage(req, res) {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი პოსტის ID' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'ფაილი არ არის ატვირთული' });
  }
  try {
    const check = await pool.query(
      `SELECT p.teacher_id, ${isPremiumSql('p', 'u')} AS is_premium
         FROM posts p JOIN users u ON u.id = p.teacher_id WHERE p.id = $1`,
      [id],
    );
    const row = check.rows[0];
    if (!row) return res.status(404).json({ message: 'პოსტი ვერ მოიძებნა' });
    if (row.teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'მხოლოდ ავტორს შეუძლია სურათის ატვირთვა' });
    }
    if (!row.is_premium) {
      return res.status(403).json({
        reason: 'vip_only',
        message: 'პოსტზე ფოტოს დამატება ხელმისაწვდომია მხოლოდ VIP პაკეტებზე',
      });
    }
    const url = `/uploads/images/${req.file.filename}`;
    await pool.query('UPDATE posts SET image_url = $2 WHERE id = $1', [id, url]);
    return res.status(200).json({ message: 'სურათი დაემატა ✓', imageUrl: url });
  } catch (err) {
    console.error('Attaching post image failed:', err);
    return sendDbError(res, err, 'სურათის ატვირთვა ვერ მოხერხდა');
  }
}

// ── Module 2: traffic logging ──
async function logView(req, res) {
  const { id } = req.params;
  const sessionId = (req.body.sessionId || '').toString().slice(0, 64);
  if (!UUID_REGEX.test(id) || !sessionId) {
    return res.status(400).json({ message: 'არასწორი მოთხოვნა' });
  }
  try {
    // One view per session per post (partial unique index).
    await pool.query(
      `INSERT INTO post_views (post_id, viewer_session_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, sessionId],
    );
    return res.status(204).end();
  } catch (err) {
    // A view that fails to log (e.g. deleted post → FK violation) must never
    // surface to the visitor; analytics are best-effort.
    if (err.code === '23503') return res.status(204).end();
    console.error('Logging view failed:', err);
    return res.status(204).end();
  }
}

async function logContactClick(req, res) {
  const { id } = req.params;
  const sessionId = (req.body.sessionId || '').toString().slice(0, 64);
  const channel = (req.body.channel || '').toString();
  if (!UUID_REGEX.test(id) || !CONTACT_CHANNELS.includes(channel)) {
    return res.status(400).json({ message: 'არასწორი მოთხოვნა' });
  }
  try {
    await pool.query(
      `INSERT INTO post_views (post_id, viewer_session_id, clicked_contact) VALUES ($1, $2, $3)`,
      [id, sessionId || null, channel],
    );
    return res.status(204).end();
  } catch (err) {
    if (err.code === '23503') return res.status(204).end();
    console.error('Logging contact click failed:', err);
    return res.status(204).end();
  }
}

module.exports = {
  mapPost,
  createPost,
  getPosts,
  reportPost,
  ratePost,
  toggleSave,
  getSavedPosts,
  updatePromo,
  bumpPost,
  attachPostImage,
  logView,
  logContactClick,
};
