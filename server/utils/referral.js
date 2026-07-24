const crypto = require('crypto');

// Ambiguous characters (0/O, 1/I/L) are intentionally excluded so codes are
// easy to read aloud, copy, and type without confusion.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const DEFAULT_LENGTH = 8;

function randomCode(length = DEFAULT_LENGTH) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
}

// Generates a code that is not already taken. `db` is anything with a
// pg-style `.query` (the pool, or a transaction client so it also sees rows
// inserted earlier in the same uncommitted transaction).
async function generateUniqueReferralCode(db, length = DEFAULT_LENGTH) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomCode(length);
    // eslint-disable-next-line no-await-in-loop
    const { rows } = await db.query('SELECT 1 FROM users WHERE referral_code = $1', [code]);
    if (rows.length === 0) return code;
  }
  // With a 31-char alphabet and length 8 this is astronomically unlikely; the
  // UNIQUE index on referral_code is the ultimate backstop regardless.
  throw new Error('Could not generate a unique referral code after several attempts');
}

// The milestone at which a referrer earns free VIP, and the reward length.
// 10 successful invites → 10 days of VIP.
const REFERRAL_REWARD_THRESHOLD = 10;
const REFERRAL_REWARD_DAYS = 10;

module.exports = {
  randomCode,
  generateUniqueReferralCode,
  REFERRAL_REWARD_THRESHOLD,
  REFERRAL_REWARD_DAYS,
};
