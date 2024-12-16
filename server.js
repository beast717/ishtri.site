// server.js
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());  // This will also parse incoming JSON

const cors = require('cors');
app.use(cors());


// Serve all static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: '123',  // Replace with a strong secret in production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// MySQL database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});


//connect to mysql
db.connect((err) => {
    if (err) throw err;
    console.log("MySQL connected...");
});

// Route to serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Logg inn.html'));
});

// Route to serve signup page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'lag konto.html'));
});

// User signup route
app.post('/signup', (req, res) => {
    const { brukernavn, email, passord } = req.body;

    // Check if user already exists
    db.query('SELECT * FROM brukere WHERE email = ?', [email], (err, results) => {
        if (results.length > 0) {
            return res.status(400).json({ message: 'User already exists.' });
        }

        // Insert new user into database with plaintext password (not recommended for production)
        db.query('INSERT INTO brukere (brukernavn, email, passord) VALUES (?, ?, ?)', 
            [brukernavn, email, passord], (err, result) => {
                
                req.session.brukernavn = brukernavn;
                res.redirect('/forside');
        });
    });
});

// User login route
app.post('/login', (req, res) => {
    const { brukernavn, passord } = req.body;

    // Verify user credentials
    db.query('SELECT * FROM brukere WHERE brukernavn = ? AND passord = ?', [brukernavn, passord], (err, results) => {
        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Store username in session on successful login
        req.session.brukerId = results[0].brukerId; // Ensure brukerId exists in your database schema
        req.session.brukernavn = brukernavn;
        return res.redirect('/');
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
    res.sendFile(path.join(__dirname, 'Public', 'Forside.html'));
});


// Start the server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
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

app.get('/forside', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Forside.html', ));
});

app.get('/ny-annonse', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Ny-annonse.html'));
});

app.get('/torgetkat', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'TorgetKat.html'));
});


// Endpoint to serve filtered products by category
app.get('/api/products', (req, res) => {
    const { category } = req.query;

    let query = "SELECT productdID, ProductName, Price, Location, Description, Images, brukerId FROM products";
    const params = [];

    if (category) {
        query += " WHERE category = ?";
        params.push(category);
    }

    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Error fetching products:", err);
            return res.status(500).json({ error: "Error fetching products." });
        }

        // Format results to include the first image URL for each product
        const formattedResults = results.map(product => {
            const images = product.Images ? product.Images.split(',') : [];
            return {
                ...product,
                firstImage: images.length > 0 ? `/uploads/${images[0]}` : null,
            };
        });

        res.json(formattedResults);
    });
});

// Serve TorgetKat.html
app.get('/torgetkat', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'TorgetKat.html'));
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
    db.query(query, params, (err, results) => {
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
    res.sendFile(path.join(__dirname, 'Public', 'Torget.html'));
});

// Endpoint to fetch only the products uploaded by a specific user
app.get('/api/user-products', (req, res) => {
    // Replace `1` with the actual user ID if you have user sessions or authentication set up
    const userId = 1; // Example user ID
    
    const query = 'SELECT * FROM products WHERE userId = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching user products:", err);
            return res.status(500).send("Error fetching user products.");
        }
        res.json(results); // Send products data as JSON
    });
});


// Handle form submission
app.post('/submit-product', upload.array('Images', 5), (req, res) => {
    if (!isAuthenticated) {
        return res.status(401).send("You must be logged in to upload a product.");
    }

    const brukerId = req.session.brukerId;
    const { ProductName, Price, Location, Description, Category } = req.body;
    const Images = req.files.map(file => file.filename).join(',');
   

    const query = 'INSERT INTO products (ProductName, Price, Location, Description, Images, brukerId, category) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [ProductName, parseFloat(Price), Location, Description, Images, brukerId, Category];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("Error saving product:", err);
            return res.status(500).send("Error saving product.");
        }
        res.redirect('/torgetkat');
    });
});

// Search Route
app.get('/search', (req, res) => {
    const searchQuery = req.query.query.trim();
    const sql = "SELECT * FROM products WHERE LOWER(ProductName) LIKE LOWER(?)";
    const values = [`%${searchQuery}%`];

    db.query(sql, values, (err, results) => {
        if (err) {
            console.error("Error during search:", err);
            return res.status(500).send("An error occurred during the search.");
        }

        console.log("Search results:", results); // Debugging: Log the search results

        if (results.length > 0) {
            // Pass all matching products to a selection page
            res.sendFile(path.join(__dirname, 'public', 'SearchResults.html'));
        } else {
            return res.status(404).send("No products found.");
        }
    });
});


// Example of the correct endpoint implementation
app.get('/api/search', (req, res) => {
    const searchQuery = req.query.query.trim();
    const sql = "SELECT productdID, ProductName, Price, Location, Images FROM products WHERE LOWER(ProductName) LIKE LOWER(?)";
    const values = [`%${searchQuery}%`];

    db.query(sql, values, (err, results) => {
        if (err) {
            console.error("Error during search:", err);
            return res.status(500).send("An error occurred during the search.");
        }

        // Map results to include the first image for each product
        const productsWithImages = results.map(product => {
            const images = product.Images.split(','); // Split image filenames by comma
            return {
                ...product,
                firstImage: `/uploads/${images[0]}`, // Add the first image URL
            };
        });

        res.json(productsWithImages); // Send modified results as JSON
    });
});




// Product Detail Route
app.get('/product/:productdID', (req, res) => {
    const { productdID } = req.params; // Access productdID from URL params
    console.log("Fetching product with ID:", productdID); // Debugging log
    const sql = "SELECT * FROM products WHERE productdID = ?";
    db.query(sql, [productdID], (err, results) => {
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
    db.query(query, [productdID], (err, results) => {
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

    // Log the incoming data to check
    console.log("Received productdID:", productdID);
    console.log("Received messageContent:", messageContent);
    console.log("Sender ID:", senderId);

    if (!productdID || !messageContent) {
        return res.status(400).send('Missing productId or messageContent');
    }

    // Find the product's owner (receiver)
    const query = 'SELECT brukerId FROM products WHERE productdID = ?';
    db.query(query, [productdID], (err, results) => {
        if (err) {
            console.error("Error finding product owner:", err);
            return res.status(500).send("Error finding product owner.");
        }

        if (results.length === 0) {
            return res.status(404).send("Product not found.");
        }

        const receiverId = results[0].brukerId;  // Get the product owner

        // Insert the message into the database
        const messageQuery = 'INSERT INTO messages (senderId, receiverId, productdID, messageContent, timestamp) VALUES (?, ?, ?, ?, NOW())';
        db.query(messageQuery, [senderId, receiverId, productdID, messageContent], (err) => {
            if (err) {
                console.error("Error saving message:", err);
                return res.status(500).send("Error saving message.");
            }
            res.status(200).send("Message sent successfully.");
        });
    });
});



// Get messages for the logged-in user
app.get('/api/messages', isAuthenticated, (req, res) => {
    const brukerId = req.session.brukerId;

    const query = `
       SELECT m.messageContent, m.timestamp, p.ProductName, p.productdID, u.brukernavn AS senderName, u.brukerId AS senderId
        FROM messages m
        JOIN products p ON m.productdID = p.productdID
        JOIN brukere u ON m.senderId = u.brukerId
        WHERE m.receiverId = ?
        ORDER BY m.timestamp DESC

    `;
    db.query(query, [brukerId], (err, results) => {
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
    db.query(query, [userId], (err, results) => {
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

    const query = 'UPDATE messages SET readd = true WHERE receiverId = ? AND readd = false';
    db.query(query, [userId], (err) => {
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
    db.query(query, [senderId, originalSenderId, productdID, messageContent], (err) => {
        if (err) {
            console.error("Error saving reply message:", err);
            return res.status(500).send("Error saving reply message.");
        }
        res.status(200).send("Reply sent successfully.");
    });
});

// Fetch random products
app.get('/api/random-products', (req, res) => {
    const query = "SELECT ProductdID, ProductName, Price, Images FROM products ORDER BY RAND() LIMIT 5";
    
    db.query(query, (err, results) => {
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










