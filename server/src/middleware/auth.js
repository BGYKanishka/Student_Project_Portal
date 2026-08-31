const { jwtVerify, createRemoteJWKSet } = require('jose');
const pool = require('../config/db');
const { getOidcConfig } = require('../config/oidc');

// Lazily built once the OIDC discovery document (and therefore jwks_uri) is
// known. createRemoteJWKSet caches keys internally and re-fetches on an
// unrecognized `kid`, so this is a one-time setup cost per process.
let jwksPromise;
function getJwks() {
  if (!jwksPromise) {
    jwksPromise = getOidcConfig().then((config) => {
      const { jwks_uri: jwksUri } = config.serverMetadata();
      return createRemoteJWKSet(new URL(jwksUri));
    });
  }
  return jwksPromise;
}

// Verifies the Asgardeo-issued access token itself (signature, issuer,
// audience, expiry) against the IdP's published JWKS — authorization is
// anchored to this token, not to any locally re-issued credential.
async function verifyAccessToken(accessToken) {
  const [jwks, config] = await Promise.all([getJwks(), getOidcConfig()]);
  const { issuer } = config.serverMetadata();
  const { payload } = await jwtVerify(accessToken, jwks, {
    issuer,
    audience: process.env.OIDC_AUDIENCE || process.env.OIDC_CLIENT_ID,
  });
  return payload;
}

const authenticate = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const payload = await verifyAccessToken(accessToken);
    const result = await pool.query('SELECT * FROM users WHERE oidc_sub = $1', [payload.sub]);

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const user = result.rows[0];

    if (user.is_blocked) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.clearCookie('idToken');
      return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.clearCookie('accessToken');
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions.' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.accessToken;
    if (!accessToken) return next();

    const payload = await verifyAccessToken(accessToken);
    const result = await pool.query('SELECT * FROM users WHERE oidc_sub = $1', [payload.sub]);

    if (result.rows.length && !result.rows[0].is_blocked) {
      req.user = result.rows[0];
    }
  } catch {
    // Invalid token — proceed without auth
  }
  next();
};

module.exports = { authenticate, requireRole, optionalAuth };
