const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validateMagicBytes = require('../middleware/validateMagicBytes');
const {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  likeProject,
} = require('../controllers/projectController');
const commentRoutes = require('./comments');

const router = express.Router();

const projectValidation = [
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 255 }),
  body('description').trim().notEmpty().withMessage('Description is required.'),
  body('github_url').optional({ checkFalsy: true }).isURL().withMessage('Invalid GitHub URL.'),
  body('demo_url').optional({ checkFalsy: true }).isURL().withMessage('Invalid demo URL.'),
];

// Public — companies can browse without login
router.get('/', optionalAuth, getAllProjects);
router.get('/:id', param('id').isInt(), validate, optionalAuth, getProject);

// Authenticated
router.post('/',
  authenticate,
  requireRole('student'),
  upload.single('thumbnail'),
  validateMagicBytes,
  projectValidation,
  validate,
  createProject
);

router.put('/:id',
  authenticate,
  requireRole('student', 'admin'),
  upload.single('thumbnail'),
  validateMagicBytes,
  validate,
  updateProject
);

router.delete('/:id',
  authenticate,
  requireRole('student', 'admin'),
  param('id').isInt(),
  validate,
  deleteProject
);

// Like / unlike (recruiter or student)
router.post('/:id/like',
  authenticate,
  param('id').isInt(),
  validate,
  likeProject
);

// Comments — public + private, see commentController for visibility rules
router.use('/:id/comments', commentRoutes);

module.exports = router;
