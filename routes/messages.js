// routes/messages.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all messages for logged-in user
router.get('/', async (req, res, next) => {
    try {
        // Get user ID from either session storage method
        const userId = req.session.user?.brukerId || req.session.brukerId;
        
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const [messages] = await pool.promise().query(
            `SELECT m.messageId, m.messageContent, m.timestamp, m.readd, m.receiverId,
                    p.ProductName, p.productdID,
                    u.brukernavn AS senderName, u.brukerId AS senderId
             FROM messages m
             JOIN products p ON m.productdID = p.productdID
             JOIN brukere u ON m.senderId = u.brukerId
             WHERE m.receiverId = ? OR m.senderId = ?
             ORDER BY m.timestamp DESC`,
            [userId, userId]
        );
        
        res.json(messages);
    } catch (err) {
        next(err);
    }
});

// Send new message
router.post('/', async (req, res, next) => {
    try {
        const { productdID, messageContent, receiverId } = req.body;
        const senderId = req.session.user?.brukerId || req.session.brukerId;

        if (!senderId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!productdID || !messageContent || !receiverId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify users exist
        const [users] = await pool.promise().query(
            'SELECT brukerId FROM brukere WHERE brukerId = ? OR brukerId = ?',
            [senderId, receiverId]
        );

        // Check if both users exist (allows same user if you want self-messaging)
        const senderExists = users.some(u => u.brukerId === senderId);
        const receiverExists = users.some(u => u.brukerId === receiverId);

        if (!senderExists || !receiverExists) {
            return res.status(400).json({ error: 'Invalid user detected' });
        }

        // Insert message
        const [result] = await pool.promise().query(
            `INSERT INTO messages 
             (senderId, receiverId, productdID, messageContent, timestamp)
             VALUES (?, ?, ?, ?, NOW())`,
            [senderId, receiverId, productdID, messageContent]
        );

        // Get the inserted message with user details
        const [newMessage] = await pool.promise().query(
            `SELECT m.*, u.brukernavn AS senderName, p.ProductName
             FROM messages m
             JOIN brukere u ON m.senderId = u.brukerId
             JOIN products p ON m.productdID = p.productdID
             WHERE m.messageId = ?`,
            [result.insertId]
        );

        // Get the io instance from the app
        const io = req.app.get('io');
        if (io) {
            // Emit to receiver's room
            io.to(receiverId.toString()).emit('messageReceived', newMessage[0]);
        }

        res.status(201).json(newMessage[0]);
    } catch (err) {
        next(err);
    }
});

// Get unread count
router.get('/unread-count', async (req, res, next) => {
    try {
        const userId = req.session.user?.brukerId || req.session.brukerId;
        
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const [result] = await pool.promise().query(
            `SELECT COUNT(*) AS unreadCount 
             FROM messages 
             WHERE receiverId = ? 
             AND readd = FALSE 
             AND senderId != receiverId`, // Add this line
            [userId]
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
        const userId = req.session.user?.brukerId || req.session.brukerId;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

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
        const userId = req.session.user?.brukerId || req.session.brukerId;

        if (!productdID) {
            return res.status(400).json({ error: 'productdID is required' });
        }

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
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

        // Mark messages as read and get the affected messages
        const [readResult] = await pool.promise().query(
            `UPDATE messages 
             SET readd = TRUE 
             WHERE productdID = ? 
             AND receiverId = ? 
             AND readd = FALSE`,
            [productdID, userId]
        );

        // If messages were marked as read, emit read receipts
        if (readResult.affectedRows > 0) {
            const [readMessages] = await pool.promise().query(
                `SELECT messageId, senderId
                 FROM messages 
                 WHERE productdID = ? 
                 AND receiverId = ? 
                 AND readd = TRUE 
                 AND senderId != ?`,
                [productdID, userId, userId]
            );

            // Emit read receipts for all the messages
            const io = req.app.get('io');
            if (io && readMessages.length > 0) {
                readMessages.forEach(message => {
                    io.to(String(message.senderId)).emit('messageReadReceipt', {
                        messageId: message.messageId,
                        readerId: userId
                    });
                });
            }
        }

        res.json(messages);
    } catch (err) {
        next(err);
    }
});

// Search messages
router.get('/search', async (req, res, next) => {
    try {
        const { query } = req.query;
        const userId = req.session.user.brukerId;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const [messages] = await pool.promise().query(
            `SELECT m.*, u.brukernavn AS senderName, p.ProductName
             FROM messages m
             JOIN brukere u ON m.senderId = u.brukerId
             JOIN products p ON m.productdID = p.productdID
             WHERE (m.senderId = ? OR m.receiverId = ?)
             AND m.messageContent LIKE ?
             ORDER BY m.timestamp DESC`,
            [userId, userId, `%${query}%`]
        );

        res.json(messages);
    } catch (err) {
        next(err);
    }
});

module.exports = router;