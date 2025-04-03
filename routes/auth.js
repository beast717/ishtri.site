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
const crypto = require('crypto'); // <-- Add crypto for token generation
const validator = require('validator'); // <-- Add validator

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.brukernavn) return next();
    res.status(401).redirect('/login');
};

const VERIFICATION_REQUIRED_AFTER_DATE = new Date('2025-03-04T12:16:01Z');

// User registration with Email Verification
router.post('/signup', async (req, res, next) => {
    try {
        const { brukernavn, email, passord, confirmPassword } = req.body;

        // --- Basic Input Validation ---
        if (!brukernavn || !email || !passord || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (passord !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // --- Email Format Validation ---
        if (!validator.isEmail(email)) { // <-- Use validator
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // --- Check for Existing Verified User (Username or Email) ---
        const [existingUser] = await pool.promise().query(
            'SELECT * FROM brukere WHERE brukernavn = ? OR (email = ? AND is_verified = 1)', // Check verified email
            [brukernavn, email]
        );

        if (existingUser.length > 0) {
            if (existingUser[0].brukernavn === brukernavn) {
                return res.status(400).json({ message: 'Username already exists' });
            } else {
                // Email is already registered and verified
                return res.status(400).json({ message: 'Email already registered' });
            }
        }

        // --- Handle Potentially Unverified Existing Email ---
        // Check if the email exists but is not verified
        const [unverifiedEmail] = await pool.promise().query(
            'SELECT * FROM brukere WHERE email = ? AND is_verified = 0',
            [email]
        );

        let userId;
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiresAt = new Date(Date.now() + 3600000); // Token valid for 1 hour

        if (unverifiedEmail.length > 0) {
            // Email exists but is not verified - Update token and resend email
            userId = unverifiedEmail[0].brukerId;
            const hashedPassword = await bcrypt.hash(passord, 10); // Hash the potentially new password
            await pool.promise().query(
                'UPDATE brukere SET brukernavn = ?, passord = ?, verification_token = ?, token_expires_at = ? WHERE brukerId = ?',
                [brukernavn, hashedPassword, verificationToken, tokenExpiresAt, userId]
            );
            console.log(`Updating unverified user ${userId} with new token.`);
        } else {
            // New user - Insert with unverified status
            const hashedPassword = await bcrypt.hash(passord, 10);
            const [result] = await pool.promise().query(
                `INSERT INTO brukere (brukernavn, email, passord, is_verified, verification_token, token_expires_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [brukernavn, email, hashedPassword, 0, verificationToken, tokenExpiresAt] // is_verified = 0
            );
            userId = result.insertId;
            console.log(`Inserted new unverified user ${userId} with token.`);
        }

        // --- Send Verification Email ---
        const verificationLink = `https://ishtri.site/api/auth/verify-email?token=${verificationToken}`; // Adjust domain if needed

        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Verify Your Email for Ishtri',
            html: `<p>Hello ${brukernavn},</p>
                   <p>Thank you for registering. Please click the link below to verify your email address:</p>
                   <p><a href="${verificationLink}">${verificationLink}</a></p>
                   <p>This link will expire in 1 hour.</p>`
        });

        // --- Respond to Client ---
        res.status(201).json({ message: 'Account created. Please check your email to verify your account.' }); // Changed message

    } catch (err) {
        console.error("Signup Error:", err); // Log detailed error on server
        // Avoid exposing detailed errors to the client
        res.status(500).json({ message: 'An internal error occurred during signup.' });
        next(err); // Use if you have specific error handling middleware
    }
});

// User login
router.post('/login', async (req, res, next) => {
    try {
        const { brukernavn, passord } = req.body;

        if (!brukernavn || !passord) {
            return res.status(400).json({ message: 'Username/Email and password are required' });
        }

        const [results] = await pool.promise().query(
            'SELECT *, created_at FROM brukere WHERE brukernavn = ? OR email = ?', // Or allow login via email: WHERE brukernavn = ? OR email = ?
            [brukernavn, brukernavn] // If allowing email login: [brukernavn, brukernavn]
        );

        if (!results.length) {  
            return res.status(401).json({ message: 'Invalid username/email or password' });
        }

        const user = results[0];

         // --- Combined Verification & Legacy Check ---
        let canLogin = false;
        if (user.is_verified) {
            // 1. User is already verified - OK
            canLogin = true;
        } else {
            // 2. User is NOT verified - check if they are a legacy user
            if (user.created_at && new Date(user.created_at) < VERIFICATION_REQUIRED_AFTER_DATE) {
                // User was created BEFORE verification was required - OK (Legacy user)
                canLogin = true;
                // Optional: You might want to mark them as verified now, or prompt them later.
                // await pool.promise().query('UPDATE brukere SET is_verified = 1 WHERE brukerId = ?', [user.brukerId]);
                console.log(`Legacy login allowed for unverified user: ${user.brukerId}`);
            } else {
                // User was created AFTER verification was required and is not verified - NOT OK
                console.log(`Login blocked for unverified user created after cutoff: ${user.brukerId}`);
                return res.status(401).json({ message: 'Account not verified. Please check your email.' });
            }
        }
        // --- End Check ---

        // Proceed only if canLogin is true
        if (!canLogin) {
             // This case should technically be caught above, but as a safeguard:
             console.error(`Login logic error: Should not reach here if canLogin is false for user ${user.brukerId}`);
             return res.status(401).json({ message: 'Login denied.' });
        }

        // Check password (only if verification check passed)
        const validPassword = user.passord ? await bcrypt.compare(passord, user.passord) : false;

        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid username/email or password' });
        }

        // Store complete user object in session
        req.session.user = {
            brukerId: user.brukerId,
            brukernavn: user.brukernavn,
            email: user.email,
            profilepic: user.profilepic,
            // Add is_verified if needed elsewhere in the app
            is_verified: user.is_verified
        };

        req.session.brukerId = user.brukerId; // Keep for backward compatibility if needed
        req.session.brukernavn = user.brukernavn; // Keep for backward compatibility

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
            audience: process.env.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();

        // Check if user exists by email OR google_id
        const [existingUser] = await pool.promise().query(
            'SELECT * FROM brukere WHERE email = ? OR google_id = ?',
            [payload.email, payload.sub]
        );

        let user;
        if (existingUser.length > 0) {
            user = existingUser[0];
            // Ensure Google ID and verified status are set if matching by email
            if (!user.google_id || !user.is_verified) {
                await pool.promise().query(
                    'UPDATE brukere SET google_id = ?, is_verified = 1, profilepic = IFNULL(profilepic, ?) WHERE brukerId = ?',
                    [payload.sub, payload.picture, user.brukerId] // Update google_id, set verified, update pic if null
                );
                user.google_id = payload.sub; // Update in-memory object
                user.is_verified = 1;
                 user.profilepic = user.profilepic || payload.picture;
            }
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

             // Insert new user - Mark as verified immediately for Google signups
            const [result] = await pool.promise().query(
                `INSERT INTO brukere (brukernavn, email, google_id, profilepic, is_verified)
                 VALUES (?, ?, ?, ?, 1)`, // Set is_verified = 1
                [username, payload.email, payload.sub, payload.picture]
            );

            user = {
                brukerId: result.insertId,
                brukernavn: username,
                email: payload.email,
                profilepic: payload.picture,
                is_verified: 1 // Ensure it's part of the object
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

// Email Verification Handler
router.get('/verify-email', async (req, res, next) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).send('Verification token is missing.');
        }

        // Find user by token and check expiry
        const [results] = await pool.promise().query(
            'SELECT * FROM brukere WHERE verification_token = ? AND token_expires_at > NOW()',
            [token]
        );

        if (results.length === 0) {
            // Token not found or expired
            // Check if already verified (token might be null after successful verification)
             const [alreadyVerified] = await pool.promise().query(
                'SELECT * FROM brukere WHERE verification_token = ?', [token]
             );
             if(alreadyVerified.length > 0 && alreadyVerified[0].is_verified) {
                 // User exists and is verified, maybe clicked old link
                 // Redirect to login or show "already verified" message
                 return res.send('Email already verified. You can <a href="/login">log in</a>.');
             } else {
                 // Truly invalid or expired
                 return res.status(400).send('Invalid or expired verification link. Please try signing up again or request a new link.'); // Improve this message/page
             }
        }

        const user = results[0];

        // Mark user as verified and clear token info
        await pool.promise().query(
            'UPDATE brukere SET is_verified = 1, verification_token = NULL, token_expires_at = NULL WHERE brukerId = ?',
            [user.brukerId]
        );

        console.log(`User ${user.brukerId} (${user.email}) verified successfully.`);

        // Send a confirmation page/message
        // You could create a simple HTML file for this
        res.send('Email successfully verified! You can now <a href="/login">log in</a>.');

    } catch (err) {
        console.error("Verification Error:", err);
        res.status(500).send('An error occurred during email verification.');
        next(err);
    }
});

module.exports = { router, isAuthenticated };