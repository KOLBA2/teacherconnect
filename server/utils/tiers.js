const pool = require('../config/db');
const { TIER_POST_LIMITS } = require('./premium');

// A teacher's effective tier for limits/paywalls: vip_plus if they have any
// active VIP+ post; vip if they have an active VIP post OR earned VIP status
// (vip_until); otherwise standard. Mirrors the feed's effective_package logic
// but at the teacher level.
async function getTeacherTier(userId) {
  const [posts, user] = await Promise.all([
    pool.query(
      `SELECT
         bool_or(package_type = 'vip_plus' AND (active_until IS NULL OR active_until > NOW())) AS has_vip_plus,
         bool_or(package_type = 'vip' AND (active_until IS NULL OR active_until > NOW())) AS has_vip
       FROM posts WHERE teacher_id = $1`,
      [userId],
    ),
    pool.query('SELECT vip_until, vip_plus_until FROM users WHERE id = $1', [userId]),
  ]);
  const r = posts.rows[0] || {};
  const now = Date.now();
  const u = user.rows[0] || {};
  const vipPlusActive = u.vip_plus_until ? new Date(u.vip_plus_until).getTime() > now : false;
  const vipActive = u.vip_until ? new Date(u.vip_until).getTime() > now : false;
  // User-level subscription takes precedence, then per-post packages.
  if (r.has_vip_plus || vipPlusActive) return 'vip_plus';
  if (r.has_vip || vipActive) return 'vip';
  return 'standard';
}

async function countActivePosts(userId) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n FROM posts
      WHERE teacher_id = $1 AND (active_until IS NULL OR active_until > NOW())`,
    [userId],
  );
  return r.rows[0].n;
}

function postLimitFor(tier) {
  return TIER_POST_LIMITS[tier] ?? 1;
}

module.exports = { getTeacherTier, countActivePosts, postLimitFor };
