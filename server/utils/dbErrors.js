const CONNECTION_ERROR_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN']);

function isConnectionError(err) {
  return Boolean(err && CONNECTION_ERROR_CODES.has(err.code));
}

// Classifies a caught DB error and sends the right status/shape: 503 for
// "the database itself is unreachable" (down, wrong host, network/firewall
// issue), 500 for any other unexpected query/logic failure (bad credentials,
// missing table, etc). Every response includes { success, error } and
// { message } so it works whether the caller reads the older message-only
// shape or the newer explicit one. Outside production, the raw driver error
// (err.message — e.g. the exact Postgres/Supabase rejection text) is also
// included, since that's what's actually needed to debug a broken connection
// string; it's withheld in production to avoid leaking internal detail.
function sendDbError(res, err, fallbackMessage) {
  const isProd = process.env.NODE_ENV === 'production';

  if (isConnectionError(err)) {
    const message = 'მონაცემთა ბაზასთან დაკავშირება ვერ მოხერხდა. სცადეთ მოგვიანებით.';
    return res.status(503).json({
      success: false,
      error: 'Database connection failed',
      message,
      ...(!isProd && { debug: err.message }),
    });
  }
  return res.status(500).json({
    success: false,
    error: fallbackMessage,
    message: fallbackMessage,
    ...(!isProd && { debug: err.message }),
  });
}

module.exports = { isConnectionError, sendDbError };
