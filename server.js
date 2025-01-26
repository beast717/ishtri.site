// server.js
const bcrypt = require('bcrypt');
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const multer = require('multer');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());  // This will also parse incoming JSON

const cors = require('cors');
app.use(cors());

// Serve static files from the 'data' folder
app.use('/data', express.static(path.join(__dirname, 'data')));

// Serve all static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'Public')));

app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));


// MySQL database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true, // Enable keep-alive to maintain the connection
    keepAliveInitialDelay: 10000, // Delay before sending the first keep-alive packet
});

// Create a MySQL session store
const sessionStore = new MySQLStore({}, pool);

// Handle MySQL pool errors
pool.on('error', (err) => {
    console.error('MySQL pool error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Reconnecting to MySQL...');
        pool.getConnection((err, connection) => {
            if (err) {
                console.error('Error reconnecting to MySQL:', err);
            } else {
                console.log('Reconnected to MySQL!');
                connection.release();
            }
        });
    } else {
        throw err;
    }
});

// Configure express-session to use the MySQL store
app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Use 'strict' in production, 'lax' in development
    },
}));

// Set EJS as the default view engine
app.set('view engine', 'ejs'); // Set the view engine to EJS
app.set('views', path.join(__dirname, 'views')); // Set the views directory

// Route to serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Logg inn.html'));
});

// Route to serve signup page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'lag konto.html'));
});

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

// User signup route
app.post('/signup', async (req, res) => {
    const { brukernavn, email, passord, confirmPassword } = req.body;

    if (passord !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const hashedPassword = await bcrypt.hash(passord, 10);

    pool.query('INSERT INTO brukere (brukernavn, email, passord) VALUES (?, ?, ?)', 
        [brukernavn, email, hashedPassword], (err, result) => {
            if (err) {
                console.error("Error inserting user:", err);
                return res.status(500).send("Failed to create account.");
            }
            res.redirect('/login');
        }
    );
});

app.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    pool.query('SELECT * FROM brukere WHERE email = ?', [email], (err, results) => {
        if (err || results.length === 0) {
            return res.status(400).json({ message: 'User not found.' });
        }

        const user = results[0];
        const resetLink = `http://ishtri.site/reset-password?email=${email}`;
        
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Password Reset',
            html: `<p>Hello ${user.brukernavn},</p>
                   <p>Click the link below to reset your password:</p>
                   <a href="${resetLink}">${resetLink}</a>`
        };

        transporter.sendMail(mailOptions, (emailErr) => {
            if (emailErr) {
                console.error("Error sending email:", emailErr);
                return res.status(500).send("Failed to send reset email.");
            }
            res.json({ message: 'Password reset link sent to your email.' });
        });
    });
});

app.post('/reset-password', async (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    pool.query('UPDATE brukere SET passord = ? WHERE email = ?', [hashedPassword, email], (err) => {
        if (err) {
            console.error("Error resetting password:", err);
            return res.status(500).send("Error resetting password.");
        }
        res.send('Password reset successfully. You can now <a href="/login">log in</a>.');
    });
});

app.get('/reset-password', (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).send("Invalid reset link.");
    }

    const htmlPath = path.join(__dirname, 'Public', 'ResetPassword.html');
    fs.readFile(htmlPath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error loading reset password page:", err);
            return res.status(500).send("Error loading page.");
        }

        // Replace {{email}} placeholder with actual email
        const pageContent = data.replace('{{email}}', email);
        res.send(pageContent);
    });
});

// User login route
app.post('/login', async (req, res) => {
    const { brukernavn, passord } = req.body; // Extracting from request body

    if (!brukernavn || !passord) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Query the database for the user with the provided username
    pool.query('SELECT * FROM brukere WHERE brukernavn = ?', [brukernavn], async (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: 'Database error.' });
        }

        // Check if user exists
        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = results[0];

        // Compare hashed password with the one provided
        const passwordMatch = await bcrypt.compare(passord, user.passord);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Successful login - set session
        req.session.brukerId = user.brukerId;
        req.session.brukernavn = user.brukernavn;
        res.status(200).json({ message: 'Login successful.' }); // Send success response
    });
});

// Route to get the logged-in user's brukernavn
app.get('/api/brukernavn', (req, res) => {
    if (req.session.brukernavn) {
        res.json({ brukernavn: req.session.brukernavn });
    } else {
        res.json({ brukernavn: null });
    }
});

// Middleware to check if the user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.brukernavn) {
        next(); // User is authenticated, proceed to the next middleware/route
    } else {
        res.redirect('/login'); // Redirect to login page if not logged in
    }
}

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Failed to log out.');
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.status(200).send('Logged out successfully.');
    });
});

// Serve the homepage
app.get('/', (req, res) => {
     res.render('Forside'); // Renders views/Forside.ejs
});

app.get('/favorites', isAuthenticated, (req, res) => {
    res.render('favorites');
});

app.listen(3000, () => {
   console.log('Server running at http://localhost:3000');
});

// Set up Multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
app.use('/uploads', express.static('uploads'));

// Simulate an admin check
const isAdmin = true; // Replace this with actual authentication logic in a real application

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'ForgotPassword.html'));
});

app.get('/ny-annonse', isAuthenticated, (req, res) => {
    res.render ('Ny-annonse');
});

app.get('/productDetails', (req, res) => {
    res.render ('productDetails');
});

app.get('/torgetkat', (req, res) => {
   res.render ('TorgetKat');
});

app.get('/mine-annonser', isAuthenticated, (req, res) => {
    res.render('mine-annonser');
});

app.get('/reise', (req, res) => {
    res.render('reise');
});

app.get('/messages', isAuthenticated, (req, res) => {
    res.render('messages');
});

app.get('/api/products', (req, res) => {
    const {
        category,          // Filter by category
        sortPrice,         // Sort by price (asc/desc)
        sortDate,          // Sort by date (asc/desc)
        countries,         // Filter by countries (comma-separated)
        cities,            // Filter by cities (comma-separated)
        subCategory,       // Filter by subcategory
        carBrand,          // Filter by car brand (comma-separated)
        limit = 20,        // Number of products per page (default: 20)
        offset = 0         // Offset for pagination (default: 0)
    } = req.query;

    // List of valid Arab League countries (for filtering)
    const arabicCountries = [
        "Algeria", "Bahrain", "Comoros", "Djibouti", "Egypt", "Iraq", "Jordan", "Kuwait", "Lebanon", "Libya",
        "Mauritania", "Morocco", "Oman", "Palestine", "Qatar", "Saudi Arabia", "Somalia", "Sudan", "Syria",
        "Tunisia", "United Arab Emirates", "Yemen"
    ];

    // Base query
    let query = "SELECT * FROM products WHERE 1=1";
    const params = [];

    // Category filter
    if (category && category !== 'default') {
        query += " AND category = ?";
        params.push(category);
    }

    // Subcategory filter
    if (subCategory && subCategory !== '') {
        query += " AND SubCategori = ?";
        params.push(subCategory);
    }

    // Car brand filter
    if (carBrand) {
        const carBrands = carBrand.split(',').filter(brand => brand.trim() !== '');
        if (carBrands.length > 0) {
            query += ` AND carBrand IN (${carBrands.map(() => '?').join(',')})`;
            params.push(...carBrands);
        }
    }

    // Country filter (only allow valid Arabic countries)
    if (countries) {
        const countryList = countries.split(',').filter(country => arabicCountries.includes(country));
        if (countryList.length > 0) {
            query += ` AND Country IN (${countryList.map(() => '?').join(',')})`;
            params.push(...countryList);

            // City filter (only if country is selected)
            if (cities) {
                const cityList = cities.split(',').filter(city => city.trim() !== '');
                if (cityList.length > 0) {
                    query += ` AND City IN (${cityList.map(() => '?').join(',')})`;
                    params.push(...cityList);
                }
            }
        }
    }

    // Sorting
    const orderClauses = [];
    if (sortPrice) orderClauses.push(`Price ${sortPrice.toUpperCase()}`);
    if (sortDate) orderClauses.push(`CAST(Date AS DATETIME) ${sortDate.toUpperCase()}`);
    if (orderClauses.length > 0) {
        query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // Pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    // Execute the query
    pool.query(query, params, (err, results) => {
        if (err) {
            console.error("Error fetching products:", err);
            return res.status(500).json({ error: "Error fetching products." });
        }

        // Format results with the first image
        const formattedResults = results.map(product => {
            const images = product.Images ? product.Images.split(',') : [];
            return {
                ...product,
                firstImage: images.length > 0
                    ? `/uploads/${images[0].trim()}`
                    : '/uploads/default-placeholder.png'
            };
        });

        // Get the total count of products (for pagination)
        const countQuery = "SELECT COUNT(*) AS total FROM products WHERE 1=1";
        pool.query(countQuery, params.slice(0, -2), (err, countResult) => { // Remove LIMIT and OFFSET params
            if (err) {
                console.error("Error fetching total count:", err);
                return res.status(500).json({ error: "Error fetching total count." });
            }

            const total = countResult[0].total;

            // Return the results with total count
            res.json({
                total,
                products: formattedResults
            });
        });
    });
});

// Endpoint to serve filtered products by category
app.get('/torgetkat', (req, res) => {
    const { category } = req.query; // Get category from query parameters

    let query = "SELECT * FROM products";
    const params = [];

    // If category is specified, filter products by category
    if (category) {
        query += " WHERE category = ?";
        params.push(category);
    }

    // Query the database for filtered products
    pool.query(query, params, (err, results) => {
        if (err) {
            console.error("Error fetching products:", err);
            return res.status(500).send("Error fetching products.");
        }

        // Render the filtered products as JSON (for frontend to use)
        res.json(results); // Send the filtered products as a response
    });
});

// Serve Torget.html from the 'public' folder for the /torget route
app.get('/torget', (req, res) => {
    res.render('Torget');
});

// Endpoint to fetch only the products uploaded by a specific user
app.get('/api/user-products', isAuthenticated, (req, res) => {
    const userId = req.session.brukerId; // Use the session to get the logged-in user's ID

    const query = 'SELECT * FROM products WHERE brukerId = ?';
    pool.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching user products:", err);
            return res.status(500).json({ error: "Error fetching user products." });
        }
        res.json(results);
    });
});

// Handle form submission
app.post('/submit-product', isAuthenticated, upload.array('Images', 5), (req, res) => {
    const brukerId = req.session.brukerId;
    if (!brukerId) {
        console.error("No user ID in session. Cannot upload product.");
        return res.status(401).send("You must be logged in to upload a product.");
    }

    const { ProductName, Price, Location, Description, Category, SubCategori, carBrand, Country, City } = req.body;
    let Images;
    if (req.files && req.files.length > 0) {
        Images = req.files.map(file => file.filename).join(','); // Join uploaded image filenames
    } else {
        Images = 'default.jpg'; // Use a default image filename
    }

    const query = 'INSERT INTO products (ProductName, Price, Location, Description, Images, brukerId, category, SubCategori, CarBrand, Country, City, Date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())';
    const values = [ProductName, parseFloat(Price), Location, Description, Images, brukerId, Category, SubCategori, carBrand || null, Country || null, City || null];

    pool.query(query, values, (err, result) => {
        if (err) {
            console.error("Error saving product:", err);
            return res.status(500).send("Error saving product.");
        }
     // Trigger notifications after successful product creation
    const newProductId = result.insertId;
    
    // Find matching preferences
    pool.query(
            `SELECT DISTINCT userId FROM notification_prefs
            WHERE (JSON_CONTAINS(categories, JSON_ARRAY(?)) OR 
                  (minPrice <= ? AND maxPrice >= ?))`,
            [req.body.Category, req.body.Price, req.body.Price],
            (err, prefResults) => {
                if (err) console.error("Notification error:", err);

                // Group by user ID to prevent duplicates
                const uniqueUsers = [...new Set(prefResults.map(user => user.userId))];
                
                uniqueUsers.forEach(userId => {
                    pool.query(
                        `INSERT INTO notifications 
                        (userId, productdID, message)
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                        createdAt = CURRENT_TIMESTAMP`,
                        [userId, newProductId, 
                        `New ${req.body.Category} product matching your preferences`]
                    );
                });
            }
        );
        res.redirect('/mine-annonser');
    });
});

// Search Route
app.get('/search', (req, res) => {
    const searchQuery = req.query.query.trim();
    const sql = "SELECT * FROM products WHERE LOWER(ProductName) LIKE LOWER(?)";
    const values = [`%${searchQuery}%`];

    pool.query(sql, values, (err, results) => {
        if (err) {
            console.error("Error during search:", err);
            return res.status(500).send("An error occurred during the search.");
        }

        console.log("Search results:", results); // Debugging: Log the search results

        if (results.length > 0) {
            // Pass all matching products to a selection page
            res.render ('SearchResults');
        } else {
            return res.status(404).send("No products found.");
        }
    });
});

// Example of the correct endpoint implementation
app.get('/api/search', (req, res) => {
    const { query, sortPrice, sortDate, countries } = req.query;

    let sqlQuery = "SELECT * FROM products WHERE ProductName LIKE ?";
    const params = [`%${query}%`];

    if (countries) {
        const countryList = countries.split(',');
        const placeholders = countryList.map(() => '?').join(',');
        sqlQuery += ` AND Country IN (${placeholders})`;
        params.push(...countryList);
    }

    const orderClauses = [];
    if (sortPrice) orderClauses.push(`Price ${sortPrice.toUpperCase()}`);
    if (sortDate) orderClauses.push(`COALESCE(Date, '1970-01-01') ${sortDate.toUpperCase()}`);
    if (orderClauses.length > 0) sqlQuery += ` ORDER BY ${orderClauses.join(', ')}`;

    pool.query(sqlQuery, params, (err, results) => {
        if (err) {
            console.error("Error fetching search results:", err);
            return res.status(500).json({ error: "Failed to fetch search results." });
        }

        res.json(results);
    });
});

// Product Detail Route
app.get('/product/:productdID', (req, res) => {
    const { productdID } = req.params; // Access productdID from URL params
    const sql = "SELECT * FROM products WHERE productdID = ?";
    pool.query(sql, [productdID], (err, results) => {
        if (err) {
            console.error("Error fetching product:", err);
            return res.status(500).send("An error occurred.");
        }

        if (results.length === 0) {
            console.log("Product not found:", productdID);
            return res.status(404).send("Product not found.");
        }

        res.json(results[0]); // Return product data
    });
});

app.get('/api/product/:productdID', (req, res) => {
    const { productdID } = req.params;
    console.log(`Fetching product with ID: ${productdID}`); // Debugging

    const query = 'SELECT * FROM products WHERE productdID = ?';
    pool.query(query, [productdID], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            console.warn(`Product with ID ${productdID} not found.`);
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(results[0]);
    });
});

// Send a message to the product owner
app.post('/send-message', isAuthenticated, (req, res) => {
    const { productdID, messageContent } = req.body;
    const senderId = req.session.brukerId;

    console.log("Sender ID:", senderId); // Log senderId for debugging
    console.log("Received productdID:", productdID);
    console.log("Received messageContent:", messageContent);

    if (!productdID || !messageContent) {
        return res.status(400).send('Missing productId or messageContent');
    }

    if (!senderId) {
        return res.status(401).send("You must be logged in to send a message.");
    }

    // Find the product's owner (receiver)
    const query = 'SELECT brukerId FROM products WHERE productdID = ?';
    pool.query(query, [productdID], (err, results) => {
        if (err) {
            console.error("Error finding product owner:", err);
            return res.status(500).send("Error finding product owner.");
        }

        if (results.length === 0) {
            return res.status(404).send("Product not found.");
        }

        const receiverId = results[0].brukerId;

        console.log("Receiver ID:", receiverId); // Log receiverId for debugging

        // Check if the sender is trying to send a message to themselves
        if (senderId === receiverId) {
            return res.status(400).send("You cannot send a message to yourself.");
        }

        // Verify that both senderId and receiverId exist in the brukere table
        const verifyUsersQuery = 'SELECT brukerId FROM brukere WHERE brukerId IN (?, ?)';
        pool.query(verifyUsersQuery, [senderId, receiverId], (err, userResults) => {
            if (err) {
                console.error("Error verifying users:", err);
                return res.status(500).send("Error verifying users.");
            }

            console.log("User verification results:", userResults); // Log verification results

            if (userResults.length !== 2) {
                // Check which ID is missing
                const existingIds = userResults.map(row => row.brukerId);
                if (!existingIds.includes(senderId)) {
                    console.error("Invalid senderId:", senderId);
                    return res.status(400).send("Invalid sender.");
                }
                if (!existingIds.includes(receiverId)) {
                    console.error("Invalid receiverId:", receiverId);
                    return res.status(400).send("Invalid receiver.");
                }
            }

            // Insert the message into the database
            const messageQuery = `
                INSERT INTO messages (senderId, receiverId, productdID, messageContent, timestamp)
                VALUES (?, ?, ?, ?, NOW())
            `;
            pool.query(messageQuery, [senderId, receiverId, productdID, messageContent], (err) => {
                if (err) {
                    console.error("Error saving message:", err);
                    return res.status(500).send("Error saving message.");
                }
                res.status(200).send("Message sent successfully.");
            });
        });
    });
});

// Get messages for the logged-in user
app.get('/api/messages', isAuthenticated, (req, res) => {
    const brukerId = req.session.brukerId;

    const query = `
       SELECT m.messageContent, m.timestamp, p.ProductName, p.productdID, u.brukernavn AS senderName, u.brukerId AS senderId, m.readd, m.messageId
        FROM messages m
        JOIN products p ON m.productdID = p.productdID
        JOIN brukere u ON m.senderId = u.brukerId
        WHERE m.receiverId = ?
        ORDER BY m.timestamp DESC
    `;
    pool.query(query, [brukerId], (err, results) => {
        if (err) {
            console.error("Error fetching messages:", err);
            return res.status(500).send("Error fetching messages.");
        }
        console.log(results);  // Log the result to ensure senderId is present
        res.json(results);
    });
});

// Route to serve the messages page
app.get('/messages', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'messages.html'));  // Ensure this path matches where you store your messages.html file
});

// Endpoint to get unread message count for the logged-in user
app.get('/api/unread-messages-count', isAuthenticated, (req, res) => {
    const userId = req.session.brukerId;

    const query = 'SELECT COUNT(*) AS unreadCount FROM messages WHERE receiverId = ? AND readd = false';
    pool.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching unread messages count:", err);
            return res.status(500).send("Error fetching unread messages count.");
        }

        const unreadCount = results[0].unreadCount;
        res.json({ unreadCount });
    });
});

// Endpoint to mark all unread messages as read when user opens messages
app.post('/api/mark-messages-read', isAuthenticated, (req, res) => {
    const userId = req.session.brukerId;
    const { messageId } = req.body;

    const query = 'UPDATE messages SET readd = true WHERE receiverId = ? AND messageId = ? AND readd = false';
    pool.query(query, [userId, messageId], (err) => {
        if (err) {
            console.error("Error marking messages as read:", err);
            return res.status(500).send("Error marking messages as read.");
        }

        res.status(200).send("Messages marked as read.");
    });
});

// Reply to a message from the logged-in user
app.post('/reply-message', isAuthenticated, (req, res) => {
    const { originalSenderId, messageContent, productdID } = req.body;  // Include productdID
    const senderId = req.session.brukerId; // Logged-in user's ID

    console.log("Replying to senderId:", originalSenderId);
    console.log("Message content:", messageContent);
    console.log("Product ID:", productdID);

    if (!originalSenderId || !messageContent || !productdID) {
        return res.status(400).send("Missing originalSenderId, messageContent, or productdID.");
    }

    // Insert the reply into the messages table, including productdID
    const query = `
        INSERT INTO messages (senderId, receiverId, productdID, messageContent, timestamp)
        VALUES (?, ?, ?, ?, NOW())
    `;
    pool.query(query, [senderId, originalSenderId, productdID, messageContent], (err) => {
        if (err) {
            console.error("Error saving reply message:", err);
            return res.status(500).send("Error saving reply message.");
        }
        res.status(200).send("Reply sent successfully.");
    });
});

app.delete('/api/delete-product/:productdID', isAuthenticated, (req, res) => {
    const { productdID } = req.params;
    const userId = req.session.brukerId;

    if (!productdID) {
        return res.status(400).json({ error: "Invalid Product ID." });
    }

    const query = 'DELETE FROM products WHERE productdID = ? AND brukerId = ?';
    pool.query(query, [productdID, userId], (err, result) => {
        if (err) {
            console.error("Error deleting product:", err);
            return res.status(500).json({ error: "Error deleting product." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Product not found or not authorized to delete." });
        }

        res.status(200).json({ message: "Product deleted successfully." });
    });
});

// Fetch random products
app.get('/api/random-products', (req, res) => {
    const query = "SELECT ProductdID, ProductName, Price, Sold, Images FROM products ORDER BY RAND() LIMIT 5";
    
    pool.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching random products:", err);
            return res.status(500).json({ error: "Error fetching random products." });
        }
         const formattedResults = results.map(product => {
            const images = product.Images ? product.Images.split(',') : [];
            return {
                ...product,
                firstImage: images.length > 0 ? `/uploads/${images[0]}` : '/uploads/default-placeholder.png',
            };
        });
        res.json(formattedResults);
    });
});

app.put('/api/mark-as-sold/:productdID', isAuthenticated, (req, res) => {
    const { productdID } = req.params;
    console.log("Received Product ID:", productdID);

    const userId = req.session.brukerId;
    console.log("User ID from session:", userId);

    const query = 'UPDATE products SET Sold = true WHERE productdID = ? AND brukerId = ?';
    const params = [productdID, userId];

    pool.query(query, params, (err, result) => {
        if (err) {
            console.error("Error executing query:", err);
            return res.status(500).json({ error: "Failed to mark product as sold." });
        }

        if (result.affectedRows === 0) {
            console.log("No matching product found or not authorized.");
            return res.status(404).json({ error: "Product not found or not authorized." });
        }

        console.log("Product successfully marked as sold.");
        res.status(200).json({ message: "Product marked as sold." });
    });
});

app.put('/api/mark-as-unsold/:productdID', isAuthenticated, (req, res) => {
    const { productdID } = req.params;

    const query = 'UPDATE products SET Sold = false WHERE productdID = ? AND brukerId = ?';
    const params = [productdID, req.session.brukerId];

    pool.query(query, params, (err, result) => {
        if (err) {
            console.error("Error marking product as unsold:", err);
            return res.status(500).json({ error: "Failed to mark product as unsold." });
        }

        if (result.affectedRows === 0) {
            console.log("No matching product found or not authorized.");
            return res.status(404).json({ error: "Product not found or not authorized." });
        }

        console.log("Product successfully marked as unsold.");
        res.status(200).json({ message: "Product marked as unsold." });
    });
});

// Endpoint to fetch conversation history between two users for a specific product
app.get('/api/conversation', isAuthenticated, (req, res) => {
    const { productdID } = req.query;
    const userId = req.session.brukerId;

    if (!productdID) {
        return res.status(400).json({ error: "productdID is required." });
    }

    const query = `
        SELECT m.messageId, m.senderId, m.receiverId, m.productdID, m.messageContent, m.timestamp, m.readd, 
               u.brukernavn AS senderName, p.ProductName
        FROM messages m
        JOIN brukere u ON m.senderId = u.brukerId
        JOIN products p ON m.productdID = p.productdID
        WHERE m.productdID = ? AND (m.senderId = ? OR m.receiverId = ?)
        ORDER BY m.timestamp ASC
    `;

    pool.query(query, [productdID, userId, userId], (err, results) => {
        if (err) {
            console.error("Error fetching conversation:", err);
            return res.status(500).json({ error: "Error fetching conversation." });
        }

        res.json(results);
    });
});

app.post('/api/favorite', isAuthenticated, (req, res) => {
    const { productdID } = req.body;
    const userId = req.session.brukerId;

    if (!productdID) {
        return res.status(400).json({ error: "Product ID is required." });
    }

    const query = 'INSERT INTO favorites (userId, productdID) VALUES (?, ?)';
    pool.query(query, [userId, productdID], (err, result) => {
        if (err) {
            console.error("Error favoriting product:", err);
            return res.status(500).json({ error: "Error favoriting product." });
        }
        res.status(200).json({ message: "Product favorited successfully." });
    });
});

// Remove a product from favorites
app.post('/api/unfavorite', isAuthenticated, (req, res) => {
    const { productdID } = req.body;
    const userId = req.session.brukerId;

    if (!productdID) {
        return res.status(400).json({ error: "Product ID is required." });
    }

    const query = 'DELETE FROM favorites WHERE userId = ? AND productdID = ?';
    pool.query(query, [userId, productdID], (err, result) => {
        if (err) {
            console.error("Error unfavoriting product:", err);
            return res.status(500).json({ error: "Error unfavoriting product." });
        }
        res.status(200).json({ message: "Product unfavorited successfully." });
    });
});

// Get favorited products for the logged-in user
app.get('/api/favorites', isAuthenticated, (req, res) => {
    const userId = req.session.brukerId;

    const query = `
        SELECT p.* 
        FROM products p
        JOIN favorites f ON p.productdID = f.productdID
        WHERE f.userId = ?
    `;
    pool.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching favorites:", err);
            return res.status(500).json({ error: "Error fetching favorites." });
        }
        res.json(results);
    });
});

app.get('/api/isFavorited', (req, res) => {
    const { productdID } = req.query;
    const userId = req.user.id; // Assuming you have user authentication

    // Query the database to check if the product is favorited by the user
    db.query(
        'SELECT * FROM favorites WHERE userId = ? AND productdID = ?',
        [userId, productdID],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }
            res.json({ isFavorited: results.length > 0 });
        }
    );
});

app.get('/api/cities', (req, res) => {
    const { country } = req.query;

    if (!country) {
        return res.status(400).json({ error: "Country is required." });
    }

    const query = 'SELECT cityName FROM cities WHERE country = ?';
    pool.query(query, [country], (err, results) => {
        if (err) {
            console.error("Error fetching cities:", err);
            return res.status(500).json({ error: "Error fetching cities." });
        }
        res.json(results);
    });
});

// Get notification preferences
app.get('/api/notification-preferences', isAuthenticated, (req, res) => {
  const userId = req.session.brukerId;
  pool.query(
    'SELECT * FROM notification_prefs WHERE userId = ?',
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(results[0] || {});
    }
  );
});

app.post('/api/notification-preferences', isAuthenticated, (req, res) => {
    const userId = req.session.brukerId;
    let { categories, minPrice, maxPrice } = req.body;

    // Ensure categories is always an array
    if (!Array.isArray(categories)) {
        categories = categories ? [categories] : [];
    }

    const query = `
        INSERT INTO notification_prefs (userId, categories, minPrice, maxPrice)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        categories = VALUES(categories),
        minPrice = VALUES(minPrice),
        maxPrice = VALUES(maxPrice)
    `;

    pool.query(
        query,
        [userId, JSON.stringify(categories), minPrice, maxPrice],
        (err) => {
            if (err) return res.status(500).json({ error: 'Error saving preferences' });
            res.json({ message: 'Preferences saved!' });
        }
    );
});

// Get notifications with badge count
app.get('/api/notifications', isAuthenticated, (req, res) => {
  const userId = req.session.brukerId;

  // Get notifications
  pool.query(
    `SELECT n.*, p.ProductName, p.Price 
     FROM notifications n
     JOIN products p ON n.productdID = p.productdID
     WHERE n.userId = ?
     ORDER BY createdAt DESC`,
    [userId],
    (err, notifications) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      // Get unread count
      pool.query(
        'SELECT COUNT(*) AS unreadCount FROM notifications WHERE userId = ? AND isRead = FALSE',
        [userId],
        (err, countResult) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          
          res.json({
            notifications,
            unreadCount: countResult[0].unreadCount
          });
        }
      );
    }
  );
});

// Mark notifications as read
app.post('/api/notifications/mark-read', isAuthenticated, (req, res) => {
  const userId = req.session.brukerId;
  pool.query(
    'UPDATE notifications SET isRead = TRUE WHERE userId = ?',
    [userId],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: 'Notifications marked as read' });
    }
  );
});

app.get('/notifications', isAuthenticated, (req, res) => {
    const userId = req.session.brukerId;
    
    // Define available categories
    const availableCategories = [
        'Torget', 'Bil', 'Reise', 'Båt', 'Mc', 
        'Jobb', 'Eiendom', 'Elektronikk'
    ];

    pool.query('SELECT * FROM notification_prefs WHERE userId = ?', [userId], (err, prefResults) => {
        if (err) return res.status(500).send("Database error");

        // Safely parse categories with fallback
        const preferences = prefResults[0] ? {
            ...prefResults[0],
            categories: tryParseJSON(prefResults[0].categories) || []
        } : { categories: [], minPrice: null, maxPrice: null };

        pool.query(
            `SELECT n.*, p.ProductName, p.Price 
             FROM notifications n
             JOIN products p ON n.productdID = p.productdID
             WHERE n.userId = ?
             ORDER BY n.createdAt DESC`,
            [userId],
            (err, notificationResults) => {
                if (err) return res.status(500).send("Database error");

                res.render('notifications', {
                    preferences: preferences,
                    notifications: notificationResults,
                    categories: availableCategories // Now properly defined
                });
            }
        );
    });

    // Add helper function inside the route handler
    function tryParseJSON(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            return null;
        }
    }
});

// Mark single notification as read
app.post('/api/notifications/mark-read/:notificationId', isAuthenticated, (req, res) => {
    const { notificationId } = req.params;
    const userId = req.session.brukerId;

    pool.query(
        `UPDATE notifications 
         SET isRead = TRUE 
         WHERE notificationId = ? AND userId = ?`,
        [notificationId, userId],
        (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.sendStatus(200);
        }
    );
});

// Mark all notifications as read
app.post('/api/notifications/mark-all-read', isAuthenticated, (req, res) => {
    const userId = req.session.brukerId;

    pool.query(
        `UPDATE notifications 
         SET isRead = TRUE 
         WHERE userId = ? AND isRead = FALSE`,
        [userId],
        (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.sendStatus(200);
        }
    );
});

// Get unread notification count
app.get('/api/notifications/count', isAuthenticated, (req, res) => {
  const userId = req.session.brukerId;
  pool.query(
    'SELECT COUNT(*) AS count FROM notifications WHERE userId = ? AND isRead = FALSE',
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ count: results[0].count });
    }
  );
});