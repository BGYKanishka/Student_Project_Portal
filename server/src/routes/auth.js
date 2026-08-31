const express = require('express');
const { query, body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  initiateLogin,
  handleCallback,
  logout,
  getMe,
  completeProfile,
  refresh,
} = require('../controllers/authController');

const router = express.Router();

// ── OIDC (Asgardeo) — Login ──────────────────────────────────────────────────
// role='student'|'recruiter' provision a new account on first login;
// role='login' only succeeds for an existing account (any role);
// role='admin' only succeeds if the signing-in email is already a
// pre-provisioned admin row (see scripts/create_admin.js) — admins are
// never auto-created purely from an IdP login.
router.get(
  '/login',
  [query('role').isIn(['student', 'recruiter', 'login', 'admin']).withMessage('Invalid role.')],
  validate,
  initiateLogin
);

// ── OIDC (Asgardeo) — shared callback for all flows ──────────────────────────
router.get('/callback', handleCallback);

// ── OIDC (Asgardeo) — RP-initiated logout ────────────────────────────────────
// Must be a real browser navigation (not XHR): the browser needs to follow
// the redirect chain through Asgardeo so it can clear its own session too.
router.get('/logout', logout);

router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);

router.post(
  '/complete-profile',
  authenticate,
  [
    body('student_id').optional({ values: 'falsy' }).trim(),
    body('organization').optional({ values: 'falsy' }).trim().isLength({ max: 255 }),
    body('contact_number')
      .optional({ values: 'falsy' })
      .trim()
      .matches(/^[0-9+\-()\s]{7,20}$/)
      .withMessage('Invalid contact number format.'),
  ],
  validate,
  completeProfile
);

module.exports = router;
