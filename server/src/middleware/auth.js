const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const pool = require('../config/db');

// 1. Validate the JWT token signature using Asgardeo's JWKS endpoint
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `${process.env.ASGARDEO_BASE_URL}/oauth2/jwks`
  }),
  // We allow both with/without trailing slash for safety
  issuer: [`${process.env.ASGARDEO_BASE_URL}/oauth2/token`, `${process.env.ASGARDEO_BASE_URL}/oauth2/token/`],
  algorithms: ['RS256'],
  requestProperty: 'auth' // Places decoded token at req.auth
});

// 2. Fetch the user from the database and attach to req.user
const attachUser = async (req, res, next) => {
  if (!req.auth) return next();

  try {
    // The Asgardeo `sub` is the unique user ID
    const asgardeoId = req.auth.sub;
    
    // Lookup by asgardeoId
    const result = await pool.query(
      'SELECT id, name, email, profile_pic, role, student_id, is_blocked, asgardeo_id FROM users WHERE asgardeo_id = $1',
      [asgardeoId]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (user.is_blocked) {
        return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
      }
      req.user = user;
    }
    // If not found, req.user remains undefined. The sync endpoint handles creation.
    next();
  } catch (err) {
    console.error('Error attaching user:', err);
    next(err);
  }
};

// Main middleware to require valid authentication AND a linked database user
const authenticate = [
  checkJwt,
  attachUser,
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User profile incomplete. Please sync your account.', code: 'PROFILE_INCOMPLETE' });
    }
    next();
  }
];

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions.' });
  }
  next();
};

const optionalAuth = [
  // Do not throw error if no token is provided
  jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `${process.env.ASGARDEO_BASE_URL}/oauth2/jwks`
    }),
    issuer: [`${process.env.ASGARDEO_BASE_URL}/oauth2/token`, `${process.env.ASGARDEO_BASE_URL}/oauth2/token/`],
    algorithms: ['RS256'],
    requestProperty: 'auth',
    credentialsRequired: false
  }),
  attachUser,
  (err, req, res, next) => {
    // Ignore invalid token errors for optional routes
    if (err.name === 'UnauthorizedError') return next();
    next(err);
  }
];

module.exports = { authenticate, requireRole, optionalAuth, checkJwt };
