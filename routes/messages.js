// routes/messages.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all messages for logged-in user
router.get('/', async (req, res, next) => {
    try {
        const [messages] = await pool.promise().query(
            `SELECT m.messageId, m.messageContent, m.timestamp, m.readd,
                    p.ProductName, p.productdID,
                    u.brukernavn AS senderName, u.brukerId AS senderId
             FROM messages m
             JOIN products p ON m.productdID = p.productdID
             JOIN brukere u ON m.senderId = u.brukerId
             WHERE m.receiverId = ?
             ORDER BY m.timestamp DESC`,
            [req.session.brukerId]
        );
        
        res.json(messages);
    } catch (err) {
        next(err);
    }
});

// Send new message
router.post('/', async (req, res, next) => {
    try {
        const { productdID, messageContent } = req.body;
        const senderId = req.session.brukerId;

        if (!productdID || !messageContent) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get product owner
        const [product] = await pool.promise().query(
            'SELECT brukerId FROM products WHERE productdID = ?',
            [productdID]
        );

        if (!product.length) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const receiverId = product[0].brukerId;

        if (senderId === receiverId) {
            return res.status(400).json({ error: 'Cannot message yourself' });
        }

        // Verify users exist
        const [users] = await pool.promise().query(
            'SELECT brukerId FROM brukere WHERE brukerId IN (?, ?)',
            [senderId, receiverId]
        );

        if (users.length !== 2) {
            return res.status(400).json({ error: 'Invalid user detected' });
        }

        // Insert message
        await pool.promise().query(
            `INSERT INTO messages 
             (senderId, receiverId, productdID, messageContent, timestamp)
             VALUES (?, ?, ?, ?, NOW())`,
            [senderId, receiverId, productdID, messageContent]
        );

        res.status(201).json({ message: 'Message sent successfully' });
    } catch (err) {
        next(err);
    }
});

// Get unread count
router.get('/unread-count', async (req, res, next) => {
    try {
        const [result] = await pool.promise().query(
            'SELECT COUNT(*) AS unreadCount FROM messages WHERE receiverId = ? AND readd = FALSE',
            [req.session.brukerId]
        );
        
        res.json({ unreadCount: result[0].unreadCount });
    } catch (err) {
        next(err);
    }
});

// Mark messages as read
router.post('/mark-read', async (req, res, next) => {
    try {
        const { messageId } = req.body;
        const userId = req.session.brukerId;

        if (!messageId) {
            return res.status(400).json({ error: 'messageId is required' });
        }

        await pool.promise().query(
            'UPDATE messages SET readd = TRUE WHERE messageId = ? AND receiverId = ?',
            [messageId, userId]
        );

        res.json({ message: 'Message marked as read' });
    } catch (err) {
        next(err);
    }
});

// Get conversation history
router.get('/conversation', async (req, res, next) => {
    try {
        const { productdID } = req.query;
        const userId = req.session.brukerId;

        if (!productdID) {
            return res.status(400).json({ error: 'productdID is required' });
        }

        const [messages] = await pool.promise().query(
            `SELECT m.*, u.brukernavn AS senderName, p.ProductName
             FROM messages m
             JOIN brukere u ON m.senderId = u.brukerId
             JOIN products p ON m.productdID = p.productdID
             WHERE m.productdID = ? 
             AND (m.senderId = ? OR m.receiverId = ?)
             ORDER BY m.timestamp ASC`,
            [productdID, userId, userId]
        );

        res.json(messages);
    } catch (err) {
        next(err);
    }
});

// Send reply
router.post('/reply', async (req, res, next) => {
    try {
        const { originalSenderId, productdID, messageContent } = req.body;
        const senderId = req.session.brukerId;

        if (!originalSenderId || !productdID || !messageContent) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await pool.promise().query(
            `INSERT INTO messages 
             (senderId, receiverId, productdID, messageContent, timestamp)
             VALUES (?, ?, ?, ?, NOW())`,
            [senderId, originalSenderId, productdID, messageContent]
        );

        res.status(201).json({ message: 'Reply sent successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;