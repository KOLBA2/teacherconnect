// Premium packaging definitions, shared by the checkout and feed layers so
// prices/tiers live in exactly one place.

// A paid package lasts one month ("monthly fee").
const MONTHLY_DAYS = 30;

// Prices are in Georgian Lari (₾). This is a mock checkout — no real charge.
const PACKAGES = {
  standard: { label: 'Standard', price: 0 },
  vip: { label: 'VIP', price: 15 },
  vip_plus: { label: 'VIP+', price: 30 },
};

const VALID_PACKAGES = new Set(Object.keys(PACKAGES));

// Ranking used for feed ordering: lower sorts first.
const PACKAGE_RANK = { vip_plus: 0, vip: 1, standard: 2 };

// SQL expression computing a post's *effective* package. A post is premium
// when it has an active paid package OR its teacher currently holds VIP status
// (vip_until in the future) — that is how the referral reward pays off: earning
// VIP lifts all of that teacher's posts to the VIP tier for the reward window.
//   `p` = posts row alias, `u` = joined users (teacher) row alias.
function effectivePackageSql(p = 'p', u = 'u') {
  return `CASE
      WHEN (${p}.package_type = 'vip_plus' AND (${p}.active_until IS NULL OR ${p}.active_until > NOW()))
           OR (${u}.vip_plus_until IS NOT NULL AND ${u}.vip_plus_until > NOW()) THEN 'vip_plus'
      WHEN (${p}.package_type = 'vip' AND (${p}.active_until IS NULL OR ${p}.active_until > NOW()))
           OR (${u}.vip_until IS NOT NULL AND ${u}.vip_until > NOW()) THEN 'vip'
      ELSE 'standard'
    END`;
}

// Boolean: is the post premium (VIP or VIP+) right now? Used to gate the
// contact-channel paywall and promo features in SQL.
function isPremiumSql(p = 'p', u = 'u') {
  return `((${effectivePackageSql(p, u)}) <> 'standard')`;
}

module.exports = { MONTHLY_DAYS, PACKAGES, VALID_PACKAGES, PACKAGE_RANK, effectivePackageSql, isPremiumSql };
