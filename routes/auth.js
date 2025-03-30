// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { transporter } = require('../config/email');
const fs = require('fs');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.brukernavn) return next();
    res.status(401).redirect('/login');
};

// User registration
router.post('/signup', async (req, res, next) => {
    try {
        const { brukernavn, email, passord, confirmPassword } = req.body;
        
        // Validate input
        if (!brukernavn || !email || !passord || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (passord !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Check if username already exists
        const [existingUser] = await pool.promise().query(
            'SELECT * FROM brukere WHERE brukernavn = ?',
            [brukernavn]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Check if email already exists
        const [existingEmail] = await pool.promise().query(
            'SELECT * FROM brukere WHERE email = ?',
            [email]
        );

        if (existingEmail.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(passord, 10);
        
        await pool.promise().query(
            'INSERT INTO brukere (brukernavn, email, passord) VALUES (?, ?, ?)',
            [brukernavn, email, hashedPassword]
        );
        
        res.status(201).json({ message: 'Account created successfully' });
    } catch (err) {
        next(err);
    }
});

// User login
router.post('/login', async (req, res, next) => {
    try {
        const { brukernavn, passord } = req.body;

        // Validate input
        if (!brukernavn || !passord) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const [results] = await pool.promise().query(
            'SELECT * FROM brukere WHERE brukernavn = ?',
            [brukernavn]
        );

        if (!results.length) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        
        const user = results[0];
        const validPassword = await bcrypt.compare(passord, user.passord);
        
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Store complete user object in session
        req.session.user = {
            brukerId: user.brukerId,
            brukernavn: user.brukernavn,
            email: user.email,
            profilepic: user.profilepic
        };
        
        // Also store brukerId directly in session for backward compatibility
        req.session.brukerId = user.brukerId;
        req.session.brukernavn = user.brukernavn;
        
        res.json({ message: 'Login successful' });
    } catch (err) {
        next(err);
    }
});

// Google login
router.post('/google', async (req, res, next) => {
    try {
        const { credential } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        
        // Check if user exists
        const [existingUser] = await pool.promise().query(
            'SELECT * FROM brukere WHERE email = ? OR google_id = ?',
            [payload.email, payload.sub]
        );

        let user;
        if (existingUser.length > 0) {
            user = existingUser[0];
        } else {
            // Generate unique username
            let baseUsername = (payload.name?.trim() || payload.email.split('@')[0] || 'user').replace(/\s+/g, '_');
            let username = baseUsername;
            let counter = 1;

            // Check for existing username
            while (true) {
                const [existing] = await pool.promise().query(
                    'SELECT * FROM brukere WHERE brukernavn = ?',
                    [username]
                );
                
                if (existing.length === 0) break;
                
                username = `${baseUsername}_${Math.floor(Math.random() * 1000)}`;
                if (counter++ > 10) break;
            }

            // Insert new user
            const [result] = await pool.promise().query(
                'INSERT INTO brukere (brukernavn, email, google_id, profilepic) VALUES (?, ?, ?, ?)',
                [username, payload.email, payload.sub, payload.picture]
            );

            user = {
                brukerId: result.insertId,
                brukernavn: username,
                email: payload.email,
                profilepic: payload.picture
            };
        }

        // Set session
        req.session.user = {
            brukerId: user.brukerId,
            brukernavn: user.brukernavn,
            email: user.email,
            profilepic: user.profilepic
        };
        req.session.brukernavn = user.brukernavn;
        req.session.brukerId = user.brukerId;

        req.session.save(err => {
            if (err) return next(err);
            res.json({ message: 'Google login successful' });
        });
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
        const resetLink = `https://ishtri.site/api/auth/reset-password?email=${email}`; // ← Add /api/auth
        
        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Password Reset',
            html: `<p>Hello ${user.brukernavn},</p>
                   <p>Reset your password: <a href="${resetLink}">${resetLink}</a></p>`
        });

        // Send styled HTML response instead of JSON
        const htmlPath = path.join(__dirname, '../Public/ResetEmailSent.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        const populatedContent = htmlContent.replace('{{email}}', email);
        res.send(populatedContent);
        
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
        
        const htmlPath = path.join(__dirname, '../Public/ResetPassword.html');
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