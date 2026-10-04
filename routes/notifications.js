const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('./auth');

/**
 * GET /api/notifications
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifs = await db.getNotificationsForUser(req.user.id);
    const unreadCount = notifs.filter(n => !n.isRead).length;
    return res.json({
      notifications: notifs,
      unreadCount
    });
  } catch (err) {
    console.error('Notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

/**
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const success = await db.markNotificationAsRead(req.params.id, req.user.id);
    return res.json({ success });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
});

/**
 * PUT /api/notifications/read-all
 */
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await db.markAllNotificationsRead(req.user.id);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

module.exports = router;
