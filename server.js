// server.js
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
dotenv.config();

const app = express();
const server = http.createServer(app);

// Import configs
const pool = require('./config/db');
const { transporter } = require('./config/email');
const upload = require('./config/upload');
const initializeSocket = require('./config/socket');

// Initialize Socket.IO
const io = initializeSocket(server);

// Make io accessible to routes
app.set('io', io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require('cors')());

// Session configuration
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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : null
    });
});

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

// Notification routes
const notificationRoutes = require('./routes/notifications');
app.use('/notifications', notificationRoutes);

// Authentication routes
const { router: authRoutes, isAuthenticated } = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Server initialization
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));