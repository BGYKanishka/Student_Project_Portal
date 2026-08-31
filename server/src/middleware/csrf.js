const crypto = require('crypto');

// Client and server are deployed on different origins (separate Vercel
// projects), so a classic cookie-read double-submit CSRF token doesn't work:
// JS on the client's origin cannot read a cookie set by the server's origin.
// Instead the CSRF token is a stateless HMAC of the caller's own access
// token, handed to the client in a JSON response body (getMe/refresh) that
// only the client's own origin can read — CORS blocks a forged cross-site
// request from ever seeing that body, even though the browser still attaches
// the (SameSite=None) auth cookies to the forged request itself. The client
// echoes the token back as X-CSRF-Token on mutating requests; this
// middleware recomputes the HMAC from the accessToken cookie already on the
// request and compares.
const secret = () => process.env.CSRF_SECRET || process.env.SESSION_SECRET;

const csrfTokenFor = (accessToken) =>
  crypto.createHmac('sha256', secret()).update(accessToken).digest('hex');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const verifyCsrf = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const accessToken = req.cookies?.accessToken;
  // No access token cookie at all: nothing CSRF-worthy to protect here —
  // `authenticate`/`requireRole` on the actual route will reject it as
  // unauthenticated. Only enforce the header match when there IS a session
  // to forge.
  if (!accessToken) return next();

  const headerToken = req.headers['x-csrf-token'];
  if (!headerToken || headerToken !== csrfTokenFor(accessToken)) {
    return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token.' });
  }

  next();
};

module.exports = { verifyCsrf, csrfTokenFor };
