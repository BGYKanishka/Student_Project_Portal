const express = require('express');
const passport = require('passport');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  handleGoogleCallback,
  validateAdminKey,
  requireAdminFlowToken,
  logout,
  getMe,
  completeProfile,
  registerLocal,
  verifyEmail,
  loginLocal,
  refresh,
} = require('../controllers/authController');

const router = express.Router();

// ── Google OAuth — Student ────────────────────────────────────────────────────
// Sets state='student' so the strategy knows to create a student account for new users
router.get('/google/student', (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: 'student',
    session: false,
  })(req, res, next);
});

// ── Google OAuth — Recruiter ──────────────────────────────────────────────────
router.get('/google/recruiter', (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: 'recruiter',
    session: false,
  })(req, res, next);
});

// ── Google OAuth — Login (existing users only, any role) ─────────────────────
// Used from the login page. Does NOT create new accounts.
router.get('/google/login', (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: 'login',
    session: false,
  })(req, res, next);
});

// ── Google OAuth — Admin (existing DB admin only) ─────────────────────────────
// Step 1: POST /auth/admin/verify-key  → validates secret key, returns adminFlowToken
// Step 2: GET  /auth/admin/google?t=TOKEN  → verifies token, initiates OAuth with state='admin'
// Step 3: Google redirects to /auth/google/callback with state='admin'
// The Passport strategy only succeeds if the Google account is already in DB with role='admin'

router.post(
  '/admin/verify-key',
  [body('secretKey').trim().notEmpty().withMessage('Secret key is required.')],
  validate,
  validateAdminKey
);

router.get('/admin/google', requireAdminFlowToken, (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: 'admin',
    session: false,
  })(req, res, next);
});

// ── Shared Google callback (all flows) ───────────────────────────────────────
// All Google OAuth flows return here.  The `state` query param tells the callback
// which flow it is and where to redirect on failure.
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) return next(err);
    // Attach user and authInfo to req for handleGoogleCallback
    req.user = user || null;
    req.authInfo = info || {};
    next();
  })(req, res, next);
}, handleGoogleCallback);

// General endpoints
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

router.post(
  '/complete-profile',
  authenticate,
  [body('student_id').trim().notEmpty().withMessage('Student ID is required.')],
  validate,
  completeProfile
);

// ── Local auth ────────────────────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Full name is required.'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter.')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number.'),
    body('role')
      .isIn(['student', 'recruiter'])
      .withMessage('Role must be student or recruiter.'),
  ],
  validate,
  registerLocal
);

router.post(
  '/verify-email',
  [body('token').notEmpty().withMessage('Token is required.')],
  validate,
  verifyEmail
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  loginLocal
);

module.exports = router;
