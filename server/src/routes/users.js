const express = require('express');
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole, optionalAuth } = require('../middleware/auth');
const { getUserProfile, getUserProjects, followUser, getAllUsers, getFollowers, getFollowing, updateProfile } = require('../controllers/userController');

const router = express.Router();

router.get('/', authenticate, requireRole('admin'), getAllUsers);

router.put('/profile', authenticate, updateProfile);

router.get('/:id',
  optionalAuth,
  param('id').isInt(),
  validate,
  getUserProfile
);

router.get('/:id/followers',
  optionalAuth,
  param('id').isInt(),
  validate,
  getFollowers
);

router.get('/:id/following',
  optionalAuth,
  param('id').isInt(),
  validate,
  getFollowing
);

router.get('/:id/projects',
  optionalAuth,
  param('id').isInt(),
  validate,
  getUserProjects
);

router.post('/:id/follow',
  authenticate,
  param('id').isInt(),
  validate,
  followUser
);

module.exports = router;
