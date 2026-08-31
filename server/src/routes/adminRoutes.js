const express = require('express');
const { param } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { verifyImageMagicBytes } = upload;
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

const idParam = [param('id').isInt(), validate];

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.get('/users/:id', idParam, adminController.getUserById);
router.patch('/users/:id/block', idParam, adminController.blockUser);
router.put('/users/:id/block', idParam, adminController.blockUser);
router.delete('/users/:id', idParam, adminController.deleteUser);
router.get('/projects', adminController.getProjects);
router.post('/projects', upload.single('thumbnail'), verifyImageMagicBytes, adminController.addProjectForStudent);
router.patch('/projects/:id', idParam, adminController.updateProject);
router.put('/projects/:id', idParam, adminController.updateProject);
router.delete('/projects/:id', idParam, adminController.deleteProject);
router.get('/search', adminController.globalSearch);
router.get('/notifications', adminController.getAdminNotifications);
router.patch('/notifications/:id/read', idParam, adminController.markNotificationRead);
router.patch('/notifications/read-all', adminController.markAllNotificationsRead);

module.exports = router;
