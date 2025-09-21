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
const fs = require('fs');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const http = require('http');
const cron = require('node-cron');
const helmet = require('helmet');
const cors = require('cors');
// Optional: CSS bundling on startup (dev convenience)

// New: centralized performance helpers
const { applyCompression, setStaticCacheHeaders } = require('./config/performance');

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

// Apply compression
applyCompression(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Special routes that need to bypass CORS (must come before CORS middleware)
// ads.txt - allow unrestricted access for advertising platforms
app.get('/ads.txt', (req, res) => {
    res.set({
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    });
    res.sendFile(path.join(__dirname, 'Public', 'ads.txt'));
});

// robots.txt - also commonly needs unrestricted access
app.get('/robots.txt', (req, res) => {
    res.set({
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
    });
    res.sendFile(path.join(__dirname, 'Public', 'robots.txt'));
});

// CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
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
      return callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'
  ]
};
app.use(cors(corsOptions));

// Security headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "data:", "blob:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:", "data:", "blob:"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:", "data:", "blob:"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:", "data:"],
      fontSrc: ["'self'", "https:", "http:", "data:", "blob:"],
      connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
      frameSrc: ["'self'", "https:", "http:"],
      imgSrc: ["'self'", "https:", "http:", "data:", "blob:"],
      mediaSrc: ["'self'", "https:", "http:", "data:", "blob:"],
      objectSrc: ["'none'"],
      workerSrc: ["'self'", "blob:", "data:"]
    }
  })
);

// --- Build CSS bundle on startup if needed (dev-friendly) ---
async function ensureBundledCSS() {
  try {
    const src = path.join(__dirname, 'Public', 'css', 'main.css');
    const out = path.join(__dirname, 'Public', 'css', 'main.min.css');
    const srcExists = fs.existsSync(src);
    if (!srcExists) return; // nothing to do

    const outExists = fs.existsSync(out);
    const needsBuild = !outExists || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs;
    if (!needsBuild) return;

    // Try local Node API build; if dev deps missing, silently skip
    const postcss = require('postcss');
    const postcssImport = require('postcss-import');
    const autoprefixer = require('autoprefixer');
    const cssnano = require('cssnano');

    const css = fs.readFileSync(src, 'utf8');
    const result = await postcss([
      postcssImport(),
      autoprefixer(),
      cssnano({ preset: 'default' })
    ]).process(css, { from: src, to: out });
    fs.writeFileSync(out, result.css, 'utf8');
    if (process.env.NODE_ENV !== 'production') {
      console.log('Built CSS bundle -> Public/css/main.min.css');
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('CSS bundling skipped:', e.message);
    }
  }
}
ensureBundledCSS();

// Mount responsive images route
const imagesRouter = require('./routes/images');
app.use('/', imagesRouter);

// Static files with smarter caching
app.use('/data', express.static(path.join(__dirname, 'data'), { setHeaders: setStaticCacheHeaders }));
app.use(express.static(path.join(__dirname, 'Public'), { setHeaders: setStaticCacheHeaders }));

// Handle default.svg requests in uploads directory by serving our default image
app.get('/uploads/default.svg', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'images', 'default.svg'));
});

app.use('/uploads', express.static('uploads', { setHeaders: setStaticCacheHeaders }));
app.use('/.well-known', express.static(path.join(__dirname, '.well-known'), { setHeaders: setStaticCacheHeaders }));

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
app.get('/torget', (req, res) => res.render('TorgetKat'));
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

// Sitemap (cached) route
const sitemapRouter = require('./routes/sitemap');
app.use('/', sitemapRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(err);
    }
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
});


// --- Cron Job for Matching Saved Searches ---
cron.schedule('*/5 * * * *', async () => {
    if (process.env.NODE_ENV === 'development') {
        console.log('Running saved search matching job...');
    }
    try {
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