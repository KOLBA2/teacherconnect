const pool = require('../config/db');

// ── Automatic VIP / VIP+ expiration engine (bulk sweep) ──
// vip_until / vip_plus_until ARE the exact expiry timestamps (TIMESTAMPTZ, UTC).
// "Is VIP" == the timestamp is in the future; there is no separate boolean.
//
// Access/display is ALREADY enforced at read time — every tier and
// effective-package query compares the timestamp to NOW() (see utils/tiers.js
// and utils/packages.js), so an expired window never grants access even for a
// split second. This sweep is the authoritative *cleanup* pass that NULLs
// lapsed columns in bulk, so the stored data always matches reality (keeps the
// admin lists, referral stats and any future timestamp-only read honest).
//
// Comparison uses the database clock (NOW()), never the Node clock, so there is
// zero skew between when a window was granted (make_interval on NOW()) and when
// it is judged expired.
async function sweepAllExpiredVip(db = pool) {
  const { rowCount } = await db.query(
    `UPDATE users
        SET vip_until      = CASE WHEN vip_until      <= NOW() THEN NULL ELSE vip_until      END,
            vip_plus_until = CASE WHEN vip_plus_until <= NOW() THEN NULL ELSE vip_plus_until END
      WHERE (vip_until      IS NOT NULL AND vip_until      <= NOW())
         OR (vip_plus_until IS NOT NULL AND vip_plus_until <= NOW())`,
  );
  return rowCount;
}

// Periodic scheduler. On a persistent Node/Express process this is the
// equivalent of a cron job (there is no serverless platform here to host a
// Vercel Cron). Runs once immediately at boot, then every `intervalMs`.
// Overlap-safe and self-healing (a failed tick just logs and retries next
// interval). The timer is unref()'d so it never keeps the process alive on its
// own. Returns a stop() function for graceful shutdown.
function startVipSweepScheduler(intervalMs = Number(process.env.VIP_SWEEP_INTERVAL_MS) || 5 * 60 * 1000) {
  let running = false;
  const tick = async () => {
    if (running) return; // never overlap two sweeps
    running = true;
    try {
      const n = await sweepAllExpiredVip();
      if (n > 0) console.log(`[vip-sweep] cleared expired VIP/VIP+ on ${n} account(s)`);
    } catch (err) {
      console.error('[vip-sweep] sweep failed:', err.message);
    } finally {
      running = false;
    }
  };

  tick(); // run immediately at startup
  const timer = setInterval(tick, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return () => clearInterval(timer);
}

module.exports = { sweepAllExpiredVip, startVipSweepScheduler };
