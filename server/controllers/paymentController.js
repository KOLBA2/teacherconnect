const pool = require('../config/db');
const { sendDbError } = require('../utils/dbErrors');
const { UUID_REGEX } = require('../utils/validators');
const { MONTHLY_DAYS, VALID_PACKAGES, PACKAGES, effectivePackageSql } = require('../utils/packages');
const { getTeacherTier } = require('../utils/tiers');
const { PAYMENTS_ENABLED } = require('../utils/premium');

const TIER_LABELS = { vip: 'VIP', vip_plus: 'VIP+' };

// Demo phase: friendly "coming soon" that also points at the free path.
const COMING_SOON = {
  reason: 'coming_soon',
  message: 'ონლაინ გადახდები მალე ჩაირთვება! VIP სტატუსის უფასოდ მისაღებად გამოიყენეთ რეფერალური სისტემა.',
};

// Mock checkout. A real integration would create a charge with a payment
// provider and only apply the package on a verified webhook; here we trust the
// request and apply it immediately so the flow is fully demonstrable.
//
// Two shapes:
//   { tier: 'vip'|'vip_plus', billing?: 'monthly'|'yearly' }  → buy a user-level
//     subscription tier (from the pricing page); grants vip_until / vip_plus_until.
//   { postId, packageType }  → upgrade a single post's package (Boost / new post).
async function checkout(req, res) {
  // Demo phase: direct purchases are switched off (referral-earned VIP is a
  // separate code path and stays fully active).
  if (!PAYMENTS_ENABLED) {
    return res.status(403).json(COMING_SOON);
  }
  if (req.body.tier && !req.body.postId) {
    return checkoutTier(req, res);
  }

  const { postId } = req.body;
  const packageType = (req.body.packageType || '').trim();

  if (!UUID_REGEX.test(postId || '')) {
    return res.status(400).json({ message: 'არასწორი პოსტის ID' });
  }
  if (!VALID_PACKAGES.has(packageType)) {
    return res.status(400).json({ message: 'არასწორი პაკეტის ტიპი' });
  }

  try {
    const postResult = await pool.query('SELECT teacher_id FROM posts WHERE id = $1', [postId]);
    const post = postResult.rows[0];
    if (!post) {
      return res.status(404).json({ message: 'პოსტი ვერ მოიძებნა' });
    }
    // Only the post's own author may change its package.
    if (post.teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'მხოლოდ პოსტის ავტორს შეუძლია პაკეტის შეცვლა' });
    }

    // Standard keeps the post live for a month with no premium boost; VIP/VIP+
    // set the same monthly window but lift its ranking and styling.
    const updated = await pool.query(
      `UPDATE posts
         SET package_type = $2,
             active_until = NOW() + make_interval(days => $3::int)
       WHERE id = $1
       RETURNING id, package_type, active_until`,
      [postId, packageType, MONTHLY_DAYS],
    );

    // Re-read with the teacher joined so effective_package matches the feed.
    const enriched = await pool.query(
      `SELECT p.id, p.package_type, p.active_until, ${effectivePackageSql('p', 'u')} AS effective_package
         FROM posts p JOIN users u ON u.id = p.teacher_id
        WHERE p.id = $1`,
      [postId],
    );
    const row = enriched.rows[0] || updated.rows[0];

    return res.status(200).json({
      message: `გადახდა წარმატდა — პაკეტი "${PACKAGES[packageType].label}" გააქტიურდა ✓`,
      post: {
        id: row.id,
        packageType: row.package_type,
        activeUntil: row.active_until,
        effectivePackage: row.effective_package || row.package_type,
      },
    });
  } catch (err) {
    console.error('Checkout failed:', err);
    return sendDbError(res, err, 'გადახდა ვერ დამუშავდა');
  }
}

// Buy a user-level subscription tier. VIP grants vip_until; VIP+ grants
// vip_plus_until (Ultimate). GREATEST(...) extends an active window rather than
// truncating it. This instantly recalculates the teacher's tier, post limits,
// contact unlock, and feed ranking (all derive from these windows).
async function checkoutTier(req, res) {
  const tier = (req.body.tier || '').trim();
  const billing = req.body.billing === 'yearly' ? 'yearly' : 'monthly';
  if (tier !== 'vip' && tier !== 'vip_plus') {
    return res.status(400).json({ message: 'არასწორი პაკეტის ტიპი' });
  }

  const days = billing === 'yearly' ? 365 : 30;
  const column = tier === 'vip_plus' ? 'vip_plus_until' : 'vip_until';

  try {
    await pool.query(
      `UPDATE users
         SET ${column} = GREATEST(COALESCE(${column}, NOW()), NOW()) + make_interval(days => $2::int)
       WHERE id = $1`,
      [req.user.id, days],
    );
    // Buying VIP+ implies at least VIP coverage for the same window.
    if (tier === 'vip_plus') {
      await pool.query(
        `UPDATE users
           SET vip_until = GREATEST(COALESCE(vip_until, NOW()), NOW()) + make_interval(days => $2::int)
         WHERE id = $1`,
        [req.user.id, days],
      );
    }

    const newTier = await getTeacherTier(req.user.id);
    const fresh = await pool.query('SELECT vip_until, vip_plus_until FROM users WHERE id = $1', [req.user.id]);
    return res.status(200).json({
      message: `გადახდა წარმატდა — ${TIER_LABELS[tier]} გააქტიურდა ✓`,
      tier: newTier,
      vipUntil: fresh.rows[0].vip_until,
      vipPlusUntil: fresh.rows[0].vip_plus_until,
      billing,
    });
  } catch (err) {
    console.error('Tier checkout failed:', err);
    return sendDbError(res, err, 'გადახდა ვერ დამუშავდა');
  }
}

module.exports = { checkout };
