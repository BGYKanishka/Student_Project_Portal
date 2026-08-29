const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validateMagicBytes = require('../middleware/validateMagicBytes');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/block', adminController.blockUser);
router.put('/users/:id/block', adminController.blockUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/projects', adminController.getProjects);
router.post('/projects', upload.single('thumbnail'), validateMagicBytes, adminController.addProjectForStudent);
router.patch('/projects/:id', upload.single('thumbnail'), validateMagicBytes, adminController.updateProject);
router.put('/projects/:id', upload.single('thumbnail'), validateMagicBytes, adminController.updateProject);
router.delete('/projects/:id', adminController.deleteProject);
router.get('/search', adminController.globalSearch);
router.get('/notifications', adminController.getAdminNotifications);
router.patch('/notifications/:id/read', adminController.markNotificationRead);
router.patch('/notifications/read-all', adminController.markAllNotificationsRead);

module.exports = router;
