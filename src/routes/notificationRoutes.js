const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middlewares/auth');

router.get('/', requireAuth, notificationController.getNotifications);
router.patch('/read-all', requireAuth, notificationController.markAllRead);
router.patch('/:id/read', requireAuth, notificationController.markRead);

module.exports = router;
