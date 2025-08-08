// routes/notifications.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { isAuthenticated } = require('./auth'); // Assuming you have this middleware

// GET /api/notifications - Fetch all notifications for the logged-in user
router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user?.brukerId || req.session.brukerId;

        // Fetch notifications and join with products to get some basic info
        const [notifications] = await pool.promise().query(
            `SELECT
                n.notificationId, n.userId, n.message, n.productdID, n.isRead, n.notification_type, n.createdAt,
                p.ProductName, p.Price, p.Images
             FROM notifications n
             LEFT JOIN products p ON n.productdID = p.productdID
             WHERE n.userId = ?
             ORDER BY n.createdAt DESC`, // Show newest first
            [userId]
        );

        // Process image URLs
        const processedNotifications = notifications.map(n => ({
            ...n,
            firstImage: n.Images ? `/img/320/${n.Images.split(',')[0].trim()}` : '/images/default-product.png'
        }));

        res.json(processedNotifications);
    } catch (err) {
        console.error("Error fetching notifications:", err);
        next(err);
    }
});

// GET /api/notifications/unread-count - Get count of unread notifications
router.get('/unread-count', isAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user?.brukerId || req.session.brukerId;

        const [result] = await pool.promise().query(
            'SELECT COUNT(*) AS count FROM notifications WHERE userId = ? AND isRead = FALSE',
            [userId]
        );
        res.json({ count: result[0].count });
    } catch (err) {
        console.error("Error fetching unread count:", err);
        next(err);
    }
});

// POST /api/notifications/mark-read/:notificationId - Mark a single notification as read
router.post('/mark-read/:notificationId', isAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user?.brukerId || req.session.brukerId;
        const notificationId = req.params.notificationId;

        const [result] = await pool.promise().query(
            'UPDATE notifications SET isRead = TRUE WHERE notificationId = ? AND userId = ?',
            [notificationId, userId]
        );

        if (result.affectedRows > 0) {
            res.json({ message: 'Notification marked as read.' });
            // Optional: Emit an event back to the user's socket to update UI immediately
            const io = req.app.get('io');
            const activeUsers = req.app.get('activeUsers'); // Assuming activeUsers map is also on app
            if (io && activeUsers) {
                 const userSocketId = activeUsers.get(String(userId));
                 if(userSocketId) {
                      io.to(userSocketId).emit('notification_read', { notificationId });
                 }
            }
        } else {
            res.status(404).json({ message: 'Notification not found or not owned by user.' });
        }
    } catch (err) {
        console.error("Error marking notification read:", err);
        next(err);
    }
});

// POST /api/notifications/mark-all-read - Mark all notifications as read for the user
router.post('/mark-all-read', isAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user?.brukerId || req.session.brukerId;

        const [result] = await pool.promise().query(
            'UPDATE notifications SET isRead = TRUE WHERE userId = ? AND isRead = FALSE',
            [userId]
        );

        res.json({ message: `${result.affectedRows} notifications marked as read.` });
         // Optional: Emit an event back to the user's socket to update UI immediately
         const io = req.app.get('io');
         const activeUsers = req.app.get('activeUsers');
         if (io && activeUsers) {
              const userSocketId = activeUsers.get(String(userId));
              if(userSocketId) {
                   io.to(userSocketId).emit('all_notifications_read');
              }
         }
    } catch (err) {
        console.error("Error marking all notifications read:", err);
        next(err);
    }
});


module.exports = router;