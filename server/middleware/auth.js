const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendDbError } = require('../utils/dbErrors');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'ავტორიზაცია საჭიროა' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'არასწორი ან ვადაგასული ტოკენი' });
  }

  // A JWT alone only proves who the caller *was* when it was issued. This
  // live check makes blocking/deletion take effect immediately, instead of
  // whenever the token happens to expire.
  try {
    const result = await pool.query('SELECT is_blocked FROM users WHERE id = $1', [payload.id]);
    if (!result.rows[0]) {
      return res.status(401).json({ message: 'ანგარიში ვერ მოიძებნა' });
    }
    if (result.rows[0].is_blocked) {
      return res.status(403).json({
        reason: 'blocked',
        message: 'თქვენი ანგარიში დაბლოკილია ადმინისტრატორის მიერ',
      });
    }
  } catch (err) {
    console.error('Authentication DB check failed:', err.message);
    return sendDbError(res, err, 'ავტორიზაციის შემოწმება ვერ მოხერხდა');
  }

  req.user = payload;
  return next();
}

// For public endpoints that personalize when a valid token happens to be
// present (e.g. "my rating" on the public feed). Invalid/absent tokens just
// mean an anonymous request — never an error.
function optionalAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // anonymous
    }
  }
  return next();
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'წვდომა აკრძალულია' });
    }
    return next();
  };
}

// Named alias for the common case, so routes read naturally.
const isAdmin = authorizeRoles('admin');

module.exports = { authenticate, optionalAuth, authorizeRoles, isAdmin };
