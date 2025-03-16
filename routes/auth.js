// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { transporter } = require('../config/email');
const fs = require('fs');
const path = require('path');

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.brukernavn) return next();
    res.status(401).redirect('/login');
};

// User registration
router.post('/signup', async (req, res, next) => {
    try {
        const { brukernavn, email, passord, confirmPassword } = req.body;
        
        if (passord !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        const hashedPassword = await bcrypt.hash(passord, 10);
        
        await pool.promise().query(
            'INSERT INTO brukere (brukernavn, email, passord) VALUES (?, ?, ?)',
            [brukernavn, email, hashedPassword]
        );
        
        res.redirect('/login');
    } catch (err) {
        next(err);
    }
});

// User login
router.post('/login', async (req, res, next) => {
    try {
        const { brukernavn, passord } = req.body;
        const [results] = await pool.promise().query(
            'SELECT * FROM brukere WHERE brukernavn = ?',
            [brukernavn]
        );

        if (!results.length) throw new Error('Invalid credentials');
        
        const user = results[0];
        const validPassword = await bcrypt.compare(passord, user.passord);
        
        if (!validPassword) throw new Error('Invalid credentials');

        req.session.brukerId = user.brukerId;
        req.session.brukernavn = user.brukernavn;
        res.json({ message: 'Login successful' });
    } catch (err) {
        next(err);
    }
});

// Password reset handling
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        const [results] = await pool.promise().query(
            'SELECT * FROM brukere WHERE email = ?',
            [email]
        );

        if (!results.length) throw new Error('User not found');
        
        const user = results[0];
        const resetLink = `http://yourdomain.com/reset-password?email=${email}`;
        
        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Password Reset',
            html: `<p>Hello ${user.brukernavn},</p>
                   <p>Reset your password: <a href="${resetLink}">${resetLink}</a></p>`
        });
        
        res.json({ message: 'Reset email sent' });
    } catch (err) {
        next(err);
    }
});

// Password reset confirmation
router.post('/reset-password', async (req, res, next) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;
        
        if (newPassword !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await pool.promise().query(
            'UPDATE brukere SET passord = ? WHERE email = ?',
            [hashedPassword, email]
        );
        
        res.send('Password updated. <a href="/login">Login</a>');
    } catch (err) {
        next(err);
    }
});

// Get reset password page
router.get('/reset-password', (req, res, next) => {
    try {
        const email = req.query.email;
        if (!email) throw new Error('Invalid reset link');
        
        const htmlPath = path.join(__dirname, '../public/ResetPassword.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        const populatedContent = htmlContent.replace('{{email}}', email);
        
        res.send(populatedContent);
    } catch (err) {
        next(err);
    }
});

// Get current user
router.get('/current-user', (req, res) => {
    res.json({ 
        brukernavn: req.session.brukernavn || null,
        brukerId: req.session.brukerId || null
    });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('Logout failed');
        res.clearCookie('connect.sid').send('Logged out');
    });
});

module.exports = { router, isAuthenticated };