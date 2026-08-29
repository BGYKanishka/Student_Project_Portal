const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');
const {
  getProjectComments,
  createComment,
  deleteComment,
} = require('../controllers/commentController');

// mergeParams: true so this router can read :id (the project id) from the
// parent router when mounted at /api/projects/:id/comments
const router = express.Router({ mergeParams: true });

const commentValidation = [
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required.')
    .isLength({ max: 2000 }).withMessage('Comment must be ≤ 2000 characters.'),
  body('is_private').optional().isBoolean().withMessage('is_private must be true or false.'),
];

// Any authenticated user can comment. The controller handles visibility logic:
// - Public comments are visible to everyone.
// - Private comments are visible only to the author, admins, and the project owner.
router.get('/', param('id').isInt(), validate, optionalAuth, getProjectComments);

// Posting and deleting comments requires login (student, recruiter, or admin)
router.post('/',
  authenticate,
  param('id').isInt(),
  commentValidation,
  validate,
  createComment
);

router.delete('/:commentId',
  authenticate,
  param('id').isInt(),
  param('commentId').isInt(),
  validate,
  deleteComment
);

module.exports = router;