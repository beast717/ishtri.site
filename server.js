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
//const helmet = require('helmet');
dotenv.config();

const app = express();
app.set('trust proxy', 1);
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

const cors = require('cors');
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
            ? 'https://ishtri.site' 
            : '*', 
  credentials: true, 
};
app.use(cors(corsOptions));

/*app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "https://accounts.google.com/gsi/client", 
        "https://js-de.sentry-cdn.com",
        "https://browser.sentry-cdn.com",
        "'unsafe-inline'" 
      ],
      
      workerSrc: ["'self'", "blob:"], 
      frameSrc: ["https://accounts.google.com/"],
      connectSrc: ["'self'", "https://*.sentry.io", "https://accounts.google.com/"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  })
);
*/
// Static files
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/uploads', express.static('uploads'));
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

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
    res.locals.baseUrl = process.env.APP_BASE_URL;
    next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => res.render('Forside'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'Logg inn.html')));
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

// Airport routes (for the travel page search)
const airportRoutes = require('./routes/airports');
app.use('/api/airports', airportRoutes);

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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack); // Log the error regardless of environment
    if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(err); // Send error to Sentry in production
    }
    res.status(500).json({
        error: 'Internal Server Error',
        // Only include message in development
        message: process.env.NODE_ENV === 'development' ? err.message : undefined 
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

// Server initialization
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));