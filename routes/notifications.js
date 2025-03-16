// routes/notifications.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { isAuthenticated } = require('./auth');

// Add this helper function at the top of the file
function safeJsonParse(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return []; // Return empty array if parsing fails
    }
}

// Get notification preferences
router.get('/preferences', async (req, res, next) => {
    try {
        const [prefs] = await pool.promise().query(
            `SELECT categories, minPrice, maxPrice 
             FROM notification_prefs 
             WHERE userId = ?`,
            [req.session.brukerId]
        );
        
        const preferences = prefs[0] || {
            categories: [],
            minPrice: null,
            maxPrice: null
        };
        
        if (preferences.categories) {
            preferences.categories = safeJsonParse(preferences.categories);
        }
        
        res.json(preferences);
    } catch (err) {
        next(err);
    }
});

// Update notification preferences
router.post('/preferences', async (req, res, next) => {
    try {
        const { categories, minPrice, maxPrice } = req.body;
        const userId = req.session.brukerId;

        await pool.promise().query(
            `INSERT INTO notification_prefs 
             (userId, categories, minPrice, maxPrice)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             categories = VALUES(categories),
             minPrice = VALUES(minPrice),
             maxPrice = VALUES(maxPrice)`,
            [
                userId,
                JSON.stringify(categories || []),
                minPrice || null,
                maxPrice || null
            ]
        );
        
        res.json({ message: 'Preferences updated successfully' });
    } catch (err) {
        next(err);
    }
});

// Get all notifications with unread count
router.get('/data', async (req, res, next) => {
    try {
        const [notifications] = await pool.promise().query(
            `SELECT n.*, p.ProductName, p.Price
             FROM notifications n
             JOIN products p ON n.productdID = p.productdID
             WHERE n.userId = ?
             ORDER BY n.createdAt DESC`,
            [req.session.brukerId]
        );

        const [unread] = await pool.promise().query(
            `SELECT COUNT(*) AS count 
             FROM notifications 
             WHERE userId = ? AND isRead = FALSE`,
            [req.session.brukerId]
        );

        res.json({
            notifications,
            unreadCount: unread[0].count
        });
    } catch (err) {
        next(err);
    }
});

// Mark single notification as read
router.patch('/:notificationId/read', async (req, res, next) => {
    try {
        await pool.promise().query(
            `UPDATE notifications 
             SET isRead = TRUE 
             WHERE notificationId = ? AND userId = ?`,
            [req.params.notificationId, req.session.brukerId]
        );
        
        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        next(err);
    }
});

// Mark all notifications as read
router.patch('/read-all', async (req, res, next) => {
    try {
        await pool.promise().query(
            `UPDATE notifications 
             SET isRead = TRUE 
             WHERE userId = ?`,
            [req.session.brukerId]
        );
        
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        next(err);
    }
});

// Get unread count
router.get('/unread-count', async (req, res, next) => {
    try {
        const [result] = await pool.promise().query(
            `SELECT COUNT(*) AS count 
             FROM notifications 
             WHERE userId = ? AND isRead = FALSE`,
            [req.session.brukerId]
        );
        
        res.json({ count: result[0].count });
    } catch (err) {
        next(err);
    }
});

// Render notifications page
router.get('/', isAuthenticated, async (req, res, next) => {
    try {

        // default user prefrences
        const defaultPreferences = {
            categories: [],
            minPrice: null,
            maxPrice: null
        };

        const availableCategories = [
            'Torget', 'Bil', 'Reise', 'Båt', 'Mc', 
            'Jobb', 'Eiendom', 'Elektronikk'
        ];

        const [prefs] = await pool.promise().query(
            'SELECT * FROM notification_prefs WHERE userId = ?',
            [req.session.brukerId]
        );

        // Parse existing preferences or use defaults
        const preferences = prefs[0] ? {
            categories: safeJsonParse(prefs[0].categories),
            minPrice: prefs[0].minPrice,
            maxPrice: prefs[0].maxPrice
        } : defaultPreferences;
        
        const [notifications] = await pool.promise().query(
            `SELECT n.*, p.ProductName, p.Price
             FROM notifications n
             JOIN products p ON n.productdID = p.productdID
             WHERE n.userId = ?
             ORDER BY n.createdAt DESC`,
            [req.session.brukerId]
        );

        res.render('notifications', {
            preferences: preferences,
            notifications: notifications, 
            categories: availableCategories 
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;