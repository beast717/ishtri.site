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
const { body, validationResult, check } = require('express-validator'); // <-- Import validator functions

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.brukernavn) return next();
    res.status(401).redirect('/login');
};

const VERIFICATION_REQUIRED_AFTER_DATE = new Date('2025-03-04T12:16:01Z');

// Validation chains
const signupValidation = [
    body('brukernavn').trim().notEmpty().withMessage('Username is required').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    body('email').trim().isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('passord').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.passord) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
    // Honeypot check - no explicit validation needed, just check if it exists
];

const loginValidation = [
    body('brukernavn').trim().notEmpty().withMessage('Username/Email is required'), // Can be username or email
    body('passord').notEmpty().withMessage('Password is required'),
];

const googleLoginValidation = [
    body('credential').notEmpty().withMessage('Google credential token is required'),
];

const forgotPasswordValidation = [
    body('email').trim().isEmail().withMessage('Invalid email format').normalizeEmail(),
];

const resetPasswordValidation = [
    body('email').trim().isEmail().withMessage('Invalid email format').normalizeEmail(), // Hidden field, but validate anyway
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
];

// User registration with Email Verification
router.post('/signup', signupValidation, async (req, res, next) => { // <-- Add validation middleware
    // Use a single main try...catch for overall request handling
    try {
        // --- Validation Check ---
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Return only the first error message for simplicity
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        // --- End Validation Check ---

        const { brukernavn, email, passord, confirmPassword, confirm_email /* Honeypot field name */ } = req.body;

        // --- Honeypot Check ---
        if (confirm_email) {
            return res.status(201).json({ message: 'Account created. Please check your email to verify your account.' });
        }

        // --- Basic Input Validation ---
        if (!brukernavn || !email || !passord || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (passord !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // --- Check for Existing Verified User (Username or Email) ---
        const [existingUser] = await pool.promise().query(
            'SELECT * FROM brukere WHERE brukernavn = ? OR (email = ? AND is_verified = 1)',
            [brukernavn, email]
        );

        if (existingUser.length > 0) {
            if (existingUser[0].brukernavn === brukernavn) {
                return res.status(400).json({ message: 'Username already exists' });
            } else {
                return res.status(400).json({ message: 'Email already registered and verified' });
            }
        }

        // --- Check for Existing Unverified User (Email) ---
        const [unverifiedEmail] = await pool.promise().query(
            'SELECT * FROM brukere WHERE email = ? AND is_verified = 0',
            [email]
        );

        let userId;
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiresAt = new Date(Date.now() + 3600000); // Token valid for 1 hour
        const hashedPassword = await bcrypt.hash(passord, 10); // Hash password once
        let operationPath = ''; // Variable to track the path for logging

        if (unverifiedEmail.length > 0) {
            // --- UPDATE PATH (Second+ attempt for this email) ---
            operationPath = 'UPDATE';
            userId = unverifiedEmail[0].brukerId;

            await pool.promise().query(
                'UPDATE brukere SET brukernavn = ?, passord = ?, verification_token = ?, token_expires_at = ? WHERE brukerId = ?',
                [brukernavn, hashedPassword, verificationToken, tokenExpiresAt, userId]
            );

        } else {
            // --- INSERT PATH (First attempt for this email) ---
            operationPath = 'INSERT';

            const [result] = await pool.promise().query(
                `INSERT INTO brukere (brukernavn, email, passord, is_verified, verification_token, token_expires_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [brukernavn, email, hashedPassword, 0, verificationToken, tokenExpiresAt]
            );
            userId = result.insertId;
        }

        // --- Send Verification Email (Common Logic) ---
        const verificationLink = `${process.env.APP_BASE_URL}/api/auth/verify-email?token=${verificationToken}`;
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Verify Your Email for Ishtri',
            html: `<p>Hello ${brukernavn},</p>
                   <p>Thank you for registering. Please click the link below to verify your email address:</p>
                   <p><a href="${verificationLink}">${verificationLink}</a></p>
                   <p>This link will expire in 1 hour.</p>`
        };

        // Add specific logging and error handling around sendMail
        try {
            const info = await transporter.sendMail(mailOptions);
        } catch (mailError) {
            // Log the specific error from Nodemailer
            console.error(`[${operationPath} PATH] FAILED to send verification email for user ${userId} to ${email}. Token: ${verificationToken}. Error:`, mailError);
            // Decide recovery strategy:
            // Option 1: Inform user explicitly (might be better UX)
            // return res.status(500).json({ message: 'Account created, but failed to send verification email. Please contact support or try signing up again.' });
            // Option 2: Still respond with the generic success message, but log the error server-side. The user might try again, triggering the UPDATE path (which apparently works). This matches the observed behavior.
            // Let the main catch block handle the response, but the error is logged.
            throw mailError; // Re-throw the error to be caught by the main catch block below
        }

        // --- Respond to Client (if email sending didn't throw an error) ---
        res.status(201).json({ message: 'Account created. Please check your email to verify your account.' });

    } catch (err) {
        // --- Main Error Handling ---
        console.error("Signup Process Error:", err);

        // Check if headers have already been sent (just in case, though unlikely here)
        if (res.headersSent) {
            // If headers are sent, we can't send another response,
            // but we should still log and potentially pass to the *next* error handler
            // if there was one after the global one (which there isn't usually).
            // For safety, just return or call next without sending response.
            return next(err); // Or just return; if no further error handling needed
        }

        // Send appropriate error response
        if (err.code && (err.code === 'EENVELOPE' || err.command || typeof err.responseCode === 'number')) {
             res.status(500).json({ message: 'Account processed, but there was an issue sending the verification email. Please try registering again shortly or contact support if the problem persists.' });
        } else {
            res.status(500).json({ message: 'An internal error occurred during signup.' });
        }
        // REMOVE THE next(err); CALL FROM HERE
    }
});

// User login
router.post('/login', loginValidation, async (req, res, next) => { // <-- Add validation middleware
    try {
        // --- Validation Check ---
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        // --- End Validation Check ---

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
            } else {
                // User was created AFTER verification was required and is not verified - NOT OK
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

        // --- Explicitly save the session before responding ---
        req.session.save((err) => {
            if (err) {
                console.error("Session save error during login:", err);
                // Pass the error to the main error handler
                return next(err);
            }
            // Session is saved, now send the success response
            res.json({ message: 'Login successful', user: req.session.user }); // Send user object back if frontend needs it
        });
        // --- End session save ---

        // REMOVE any res.json() or similar response that was here before adding req.session.save()

    } catch (err) {
        next(err);
    }
});

// Google login
router.post('/google', googleLoginValidation, async (req, res, next) => { // <-- Add validation middleware
    try {
        // --- Validation Check ---
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        // --- End Validation Check ---

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
router.post('/forgot-password', forgotPasswordValidation, async (req, res, next) => { // <-- Add validation middleware
    try {
        // --- Validation Check ---
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Maybe render an error page or send a specific response for UI
            // For now, sending JSON, but the original sends HTML. Adjust as needed.
            // Still send the generic success HTML even on validation error for security? Or show validation error?
            // Let's show validation error for now, but keep the user-not-found case silent.
            const htmlPath = path.join(__dirname, '../Public/ResetEmailSent.html'); // Or an error page
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            // Inject error message if needed, or just show generic page
            return res.status(400).send(htmlContent.replace('{{email}}', req.body.email || '')); // Send generic page even on validation fail?
        }
        // --- End Validation Check ---

        const { email } = req.body;
        const [results] = await pool.promise().query(
            'SELECT * FROM brukere WHERE email = ?',
            [email]
        );

        // --- MODIFICATION START ---
        // If user exists, send the email. If not, do nothing but proceed to the generic response.
        if (results.length > 0) {
            const user = results[0];
            const resetLink = `https://ishtri.site/api/auth/reset-password?email=${email}`; // ← Add /api/auth

            // Send email only if user was found
            try {
                await transporter.sendMail({
                    from: process.env.GMAIL_USER,
                    to: email,
                    subject: 'Password Reset',
                    html: `<p>Hello ${user.brukernavn},</p>
                           <p>Reset your password: <a href="${resetLink}">${resetLink}</a></p>`
                });
            } catch (mailError) {
                // Log email sending failure but still send generic success response to user
                console.error(`Failed to send password reset email to ${email}:`, mailError);
                // Do NOT throw or call next(mailError) here if you want the generic response below
            }
        }
        // --- MODIFICATION END ---

        // Send styled HTML response regardless of whether the user was found or email sent successfully.
        // This prevents leaking information about registered emails.
        const htmlPath = path.join(__dirname, '../Public/ResetEmailSent.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        const populatedContent = htmlContent.replace('{{email}}', email);
        res.send(populatedContent);

    } catch (err) {
        // Catch unexpected errors (DB connection issues, etc.), but not the "user not found" case.
        console.error("Unexpected error in /forgot-password:", err); // Log unexpected errors
        // Send a generic error page or response without revealing details
        const htmlPath = path.join(__dirname, '../Public/ResetEmailSent.html'); // Or a generic error page
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        res.status(500).send(htmlContent.replace('{{email}}', req.body.email || '')); // Still show generic page on server error?
        // next(err); // Optionally pass to global error handler if needed, but response is sent.
    }
});

// Password reset confirmation
router.post('/reset-password', resetPasswordValidation, async (req, res, next) => { // <-- Add validation middleware
    try {
        // --- Validation Check ---
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Send error message back to the reset form page (which needs JS to display it)
            // Or render an error page. Sending plain text for now.
            return res.status(400).send(`Error: ${errors.array()[0].msg}. <a href="javascript:history.back()">Go Back</a>`);
        }
        // --- End Validation Check ---

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
        // ...existing code...
        // Consider sending a user-friendly error page here too
        res.status(500).send('An error occurred while resetting the password. <a href="javascript:history.back()">Go Back</a>');
        // next(err); // Avoid calling next if response is sent
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
    // Check if the user object exists in the session
    if (req.session.user) {
        // Send the user object stored during login
        res.json(req.session.user);
    } else {
        // Send null values if no user is logged in
        res.json({
            brukernavn: null,
            brukerId: null,
            // Add other fields expected by the frontend in a logged-out state if necessary
            email: null,
            profilepic: null,
            is_verified: null
        });
    }
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

        // 1. Basic Check: Token must be present
        if (!token) {
            return res.status(400).send('Verification token is missing.');
        }

        // 2. Primary Check: Find user by VALID token (not expired, not yet cleared)
        const [validTokenResults] = await pool.promise().query(
            'SELECT * FROM brukere WHERE verification_token = ? AND token_expires_at > NOW()',
            [token]
        );

        // 3. Handle Valid Token Found
        if (validTokenResults.length > 0) {
            const user = validTokenResults[0];

            // Safety check: Handle rare race condition where token exists but user somehow got marked verified already
            if (user.is_verified) {
                 return res.send('Email already verified. You can <a href="/login">log in</a>.');
            }

            // --- Main Success Path ---
            // Mark user as verified and clear token info in the database
            await pool.promise().query(
                'UPDATE brukere SET is_verified = 1, verification_token = NULL, token_expires_at = NULL WHERE brukerId = ?',
                [user.brukerId]
            );

            return res.send('Email successfully verified! You can now <a href="/login">log in</a>.');

        } else {
            // --- Initial Lookup Failed ---
            // Reason could be: Invalid token, Expired token, OR Token already used/cleared (double-click/prefetch)

            // 4. Secondary Check: Look for the token *without* the expiry check to differentiate reasons
            // This helps identify if the token *was* valid but might have just been cleared or expired.
            const [existingTokenUserResults] = await pool.promise().query(
                'SELECT brukerId, email, is_verified FROM brukere WHERE verification_token = ?', // No expiry check here
                [token]
            );

            if (existingTokenUserResults.length > 0) {
                // Token exists in the DB (associated with a user), but the NOW() check failed earlier.
                const potentialUser = existingTokenUserResults[0];

                if (potentialUser.is_verified) {
                    // Token is found, user IS verified => Must be the double-click/prefetch case
                    // where the token was valid but cleared by the *first* successful request.
                    return res.send('Email already verified. You can <a href="/login">log in</a>.');
                } else {
                    // Token is found, user IS NOT verified => Token must have genuinely expired.
                    return res.status(400).send('Your verification link has expired. Please try signing up again or request a password reset to potentially get a new verification if implemented.'); // Adjust message as needed
                }
            } else {
                // Token doesn't match *any* current verification_token in the DB.
                // It's either genuinely invalid (never existed, typo) OR
                // it was valid, used successfully, cleared, AND this check ran *after* the clear.
                // This second possibility is less likely but covered by treating it as invalid/used.
                return res.status(400).send('Invalid verification link. It may have already been used, is incorrect, or has expired.');
            }
        }

    } catch (err) {
        // 5. Catch-all Error Handling
        console.error("Verification Process Error:", err);
        // Avoid exposing detailed errors to the user
        res.status(500).send('An error occurred during email verification. Please try again later or contact support.');
        next(err); // Pass to Express error handling middleware if you have one
    }
});

module.exports = { router, isAuthenticated };