// server.js
require("./instrument.js");
const Sentry = require("@sentry/node");
const bcrypt = require('bcrypt');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const http = require('http');
const cron = require('node-cron');
dotenv.config();

const app = express();
const server = http.createServer(app);

// Import configs
const { checkNewProductsForMatches } = require('./services/backgroundMatcher');
const { initializeSocket, getActiveUsersMap } = require('./config/socket'); 
const pool = require('./config/db');
const { transporter } = require('./config/email');
const upload = require('./config/upload');

// Initialize Socket.IO
const io = initializeSocket(server);

// Make io accessible to routes
app.set('io', io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require('cors')());

// Sentry: Add Request Handler
app.use(Sentry.Handlers.requestHandler());
// Sentry: Add Tracing Handler to enable tracing for requests
app.use(Sentry.Handlers.tracingHandler());

const sessionStore = new MySQLStore({}, pool);
app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 86400000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    }
}));

app.use((req, res, next) => { 
    res.locals.user = req.session.user || null;
    next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/uploads', express.static('uploads'));
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

// Routes
app.get('/', (req, res) => res.render('Forside'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'Logg inn.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'lag konto.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'ForgotPassword.html')));
app.get('/torget', (req, res) => res.render('Torget'));
app.get('/reise', (req, res) => res.render('reise'));

const viewRoutes = require('./routes/views');
app.use('/', viewRoutes);

// Favorites routes
const favoriteRoutes = require('./routes/favorites');
app.use('/api/favorites', favoriteRoutes);

// Util routes
const utilRoutes = require('./routes/utils');
app.use('/api/utils', utilRoutes);

// ProductStatus routes
const statusRoutes = require('./routes/productStatus');
app.use('/api/products', statusRoutes);

// Product routes
const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);

// Search routes
const searchRoutes = require('./routes/search');
app.use('/api/search', searchRoutes);

// Message routes
const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);

// Saved-searches routes
const savedSearchRoutes = require('./routes/savedSearches');
app.use('/api/saved-searches', savedSearchRoutes);

// Authentication routes
const { router: authRoutes, isAuthenticated } = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Nontification routes
const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

// Settings routes
const settingsRoutes = require('./routes/settings');
app.use('/api/settings', settingsRoutes);

app.use(Sentry.Handlers.errorHandler());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : null
    });
});

// --- Cron Job for Matching Saved Searches ---
cron.schedule('*/5 * * * *', async () => { // Run every 1 minute for testing
    console.log('Running saved search matching job...');
    try {
        // Pass 'io' instance to the job if needed for real-time updates
        await checkNewProductsForMatches(io, getActiveUsersMap);
        console.log('Saved search matching job finished.');
    } catch (error) {
        console.error('Error in saved search matching job:', error);
    }
});

// --- TEMPORARY TEST CODE (add before server.listen) ---
try {
  console.log("Intentionally throwing test error for Sentry...");
  throw new Error("This is a test error for Sentry verification!"); // Use throw new Error
  // foo(); // Or call an undefined function like the example
} catch (e) {
  console.log("Caught test error, capturing with Sentry...");
  Sentry.captureException(e);
}
// --- END TEMPORARY TEST CODE ---

// Server initialization
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));