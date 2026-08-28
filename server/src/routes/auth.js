const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, checkJwt } = require('../middleware/auth');
const { getMe, syncUser, completeProfile } = require('../controllers/authController');

const router = express.Router();

// Synchronize the Asgardeo user with our local database
router.post('/sync', checkJwt, syncUser);

// Get current user profile (requires user to be synced)
router.get('/me', authenticate, getMe);

// Complete profile (set student/recruiter role for new users)
router.post(
  '/complete-profile',
  authenticate,
  [
    body('role').isIn(['student', 'recruiter']).withMessage('Role must be student or recruiter.'),
    body('student_id').optional({ checkFalsy: true }).trim()
  ],
  validate,
  completeProfile
);

module.exports = router;
