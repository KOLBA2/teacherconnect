const pool = require('../config/db');
const { sendDbError } = require('../utils/dbErrors');
const {
  generateUniqueReferralCode,
  REFERRAL_REWARD_THRESHOLD,
  REFERRAL_REWARD_DAYS,
} = require('../utils/referral');

// Referral dashboard data for the logged-in teacher: their code, how many
// teachers they've brought in, and their current VIP status.
async function getMyReferralStats(req, res) {
  try {
    const userResult = await pool.query(
      `SELECT id, role, referral_code, vip_until FROM users WHERE id = $1`,
      [req.user.id],
    );
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }
    if (user.role !== 'teacher') {
      return res.status(403).json({ message: 'რეფერალები ხელმისაწვდომია მხოლოდ მასწავლებლებისთვის' });
    }

    // Older teacher rows created before this feature may not have a code yet —
    // mint one lazily so the dashboard always has something to show.
    let referralCode = user.referral_code;
    if (!referralCode) {
      referralCode = await generateUniqueReferralCode(pool);
      await pool.query('UPDATE users SET referral_code = $1 WHERE id = $2', [referralCode, user.id]);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM users WHERE referred_by = $1 AND role = 'teacher'`,
      [referralCode],
    );
    const invitedCount = countResult.rows[0].count;

    const now = Date.now();
    const vipActive = user.vip_until ? new Date(user.vip_until).getTime() > now : false;

    // Progress toward the *next* reward milestone (resets each full group).
    const towardNext = invitedCount % REFERRAL_REWARD_THRESHOLD;
    const rewardsEarned = Math.floor(invitedCount / REFERRAL_REWARD_THRESHOLD);

    return res.status(200).json({
      referralCode,
      invitedCount,
      threshold: REFERRAL_REWARD_THRESHOLD,
      rewardDays: REFERRAL_REWARD_DAYS,
      towardNext,
      remaining: REFERRAL_REWARD_THRESHOLD - towardNext,
      rewardsEarned,
      vipUntil: user.vip_until || null,
      vipActive,
    });
  } catch (err) {
    console.error('Fetching referral stats failed:', err);
    return sendDbError(res, err, 'რეფერალური მონაცემების ჩატვირთვა ვერ მოხერხდა');
  }
}

module.exports = { getMyReferralStats };
