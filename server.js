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
const helmet = require('helmet');
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
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, be more restrictive
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = [
        'https://ishtri.site',
        'https://www.ishtri.site',
        'https://accounts.google.com'
      ];
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    } else {
      // In development, allow any origin
      return callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Content Security Policy for Google Sign-In
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "https://accounts.google.com",
        "https://apis.google.com",
        "https://js-de.sentry-cdn.com",
        "https://browser.sentry-cdn.com",
        "https://pagead2.googlesyndication.com",
        "https://www.googletagmanager.com",
        "'unsafe-inline'",
        "'unsafe-eval'"
      ],
      scriptSrcAttr: [
        "'unsafe-inline'",
        "'unsafe-hashes'",
        "'sha256-dO6sDz0mPs9jZXbQiPbt9AIvzanSZYRWbzbWM5NZao0='"
      ],
      styleSrc: [
        "'self'", 
        "https://accounts.google.com",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com",
        "'unsafe-inline'"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com",
        "data:"
      ],
      connectSrc: [
        "'self'", 
        "https://accounts.google.com",
        "https://www.googleapis.com",
        "https://*.sentry.io",
        "https://pagead2.googlesyndication.com",
        "https://ep1.adtrafficquality.google",
        "https://csi.gstatic.com"
      ],
      frameSrc: [
        "'self'",
        "https://accounts.google.com",
        "https://googleads.g.doubleclick.net",
        "https://tpc.googlesyndication.com",
        "https://pagead2.googlesyndication.com"
      ],
      imgSrc: [
        "'self'", 
        "https://accounts.google.com",
        "https://www.gstatic.com",
        "https://csi.gstatic.com",
        "https://www.svgrepo.com",
        "https://pagead2.googlesyndication.com",
        "https://googleads.g.doubleclick.net",
        "data:",
        "blob:"
      ],
      workerSrc: ["'self'", "blob:"]
    }
  })
);
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
cron.schedule('*/5 * * * *', async () => { // Run every 5 minutes
    if (process.env.NODE_ENV === 'development') {
        console.log('Running saved search matching job...');
    }
    try {
        // Pass 'io' instance to the job if needed for real-time updates
        await checkNewProductsForMatches(io, getActiveUsersMap);
        if (process.env.NODE_ENV === 'development') {
            console.log('Saved search matching job finished.');
        }
    } catch (error) {
        console.error('Error in saved search matching job:', error);
    }
});

// Server initialization
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));