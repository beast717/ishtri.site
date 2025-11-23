// services/notificationService.js
const pool = require('../config/db'); // Adjust path if db.js is elsewhere
const { transporter } = require('../config/email');
const { slugify } = require('../config/seo');

// ** IMPORTANT: How to access activeUsers? **
// Option 1: Pass 'io' and 'activeUsers' map from server.js/backgroundMatcher.js
// Option 2: Export 'activeUsers' from socket.js (less ideal, creates tight coupling)
// Option 3: Use a shared module or external store (like Redis) for user sockets.
// We'll assume Option 1 for now: 'io' and 'activeUsers' are passed in.

async function createMatchNotification(userId, searchName, product, io, activeUsers) {
    try {
        const message = `New match for your search '${searchName}': ${product.ProductName}`;
        const productId = product.productdID || product.ProductdID;

        if (!productId) {
            console.warn(`Product object missing ID field for notification. Product:`, product);
            return;
        }

        // --- Check User Preference ---
        let shouldSendEmail = false;
        let userEmail = null;
        let userName = null;
        try {
            const [userResults] = await pool.promise().query(
                'SELECT email, brukernavn, email_notifications_enabled FROM brukere WHERE brukerId = ?',
                [userId]
            );
            if (userResults.length > 0) {
                shouldSendEmail = userResults[0].email_notifications_enabled; // Check the boolean flag
                userEmail = userResults[0].email;
                userName = userResults[0].brukernavn;
            } else {
                console.warn(`User ${userId} not found when checking email preference.`);
            }
        } catch (prefError) {
            console.error(`Error fetching email preference for user ${userId}:`, prefError);
            // Decide if you should proceed without email or stop
        }
        // --- End Check ---

        // Check if a similar notification already exists to prevent duplicates
        const [existingNotification] = await pool.promise().query(
            `SELECT notificationId FROM notifications 
             WHERE userId = ? AND productdID = ? AND notification_type = 'new_match' 
             AND message LIKE ?`,
            [userId, productId, `%${searchName}%`]
        );

        if (existingNotification.length > 0) {
            return; // Don't create duplicate notification
        }


        // 1. Insert notification into the database (always do this)
        const [result] = await pool.promise().query(
            `INSERT INTO notifications (userId, message, productdID, isRead, notification_type, createdAt)
             VALUES (?, ?, ?, FALSE, 'new_match', NOW())`,
            [userId, message, productId]
        );
        const newNotificationId = result.insertId;


        // Emit real-time notification if io and activeUsers map are available
        if (io && activeUsers) {
            const userSocketId = activeUsers.get(String(userId)); // Ensure userId is string/number consistent with map key

            if (userSocketId) {
                const newNotificationData = {
                    notificationId: newNotificationId,
                    userId: userId,
                    message: message,
                    productdID: productId,
                    isRead: false,
                    notification_type: 'new_match',
                    createdAt: new Date().toISOString(), // Use ISO string format
                    // Include details needed by the frontend notification display
                    ProductName: product.ProductName,
                    Price: product.Price, // Ensure product object has Price
                    firstImage: product.Images ? `/img/480/${product.Images.split(',')[0].trim()}` : '/images/default.svg'
                };
                io.to(userSocketId).emit('new_notification', newNotificationData);
           }
        }

        // 3. Send Email Notification (Conditionally)
        if (shouldSendEmail && userEmail && userName) {
            // Call the email sending function (no need to await if you don't need to block)
            sendMatchEmail(userEmail, userName, searchName, product);
        }


    } catch (error) {
        console.error(`Error in createMatchNotification for user ${userId}:`, error);
    }
}


// --- Function to Send Match Email ---
async function sendMatchEmail(userEmail, userName, searchName, product) {
    // Ensure we have necessary data - USE CORRECT CASING FOR ID
    if (!userEmail || !userName || !searchName || !product || !product.ProductdID) { // <<< FIX: Use ProductdID (Uppercase D)
        console.error("Missing data for sending match email.", { userEmail, userName, searchName, product });
        return;
    }

    // Construct product link - USE CORRECT CASING FOR ID
    const slug = slugify(product.ProductName || '');
    const productLink = `${process.env.APP_BASE_URL}/product/${product.ProductdID}/${slug}`;
    // Use correct casing for Images (already correct)
    const firstImage = product.Images ? `${process.env.APP_BASE_URL}/img/800/${product.Images.split(',')[0].trim()}` : `${process.env.APP_BASE_URL}/images/default.svg`;

    // Email HTML content (Use correct casing for product properties)
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>New Match Found on Ishtri!</h2>
            <p>Hello ${userName},</p>
            <p>A new listing matching your saved search "<strong>${searchName}</strong>" has been posted:</p>
            <div style="border: 1px solid #eee; padding: 15px; margin: 15px 0; display: flex; align-items: center; gap: 15px;">
                 <img src="${firstImage}" alt="Product Image" style="max-width: 100px; max-height: 100px; object-fit: cover; border-radius: 4px;">
                 <div>
                     <h3 style="margin: 0 0 5px 0;">
                         <a href="${productLink}" style="color: #0056b3; text-decoration: none;">${product.ProductName || 'View Product'}</a> <!-- Already correct -->
                     </h3>
                     ${product.Price ? `<p style="margin: 0; font-weight: bold; color: #333;">Price: ${product.Price.toLocaleString('en-US')} $</p>` : ''} <!-- Already correct -->
                     ${product.cityName ? `<p style="margin: 0; color: #555;">Location: ${product.cityName}${product.country ? `, ${product.country}` : ''}</p>` : ''} <!-- Already correct -->
                 </div>
            </div>
            <p>
                <a href="${productLink}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    View Product Details
                </a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 0.9em; color: #777;">
                You received this email because you enabled notifications for your saved searches on Ishtri.
                You can manage your notification settings <a href="${process.env.APP_BASE_URL}/settings">here</a>.
            </p>
        </div>
    `;

    // Mail options
    const mailOptions = {
        from: `"Ishtri Notifications" <${process.env.GMAIL_USER}>`,
        to: userEmail,
        subject: `New Match Found: ${product.ProductName}`, // Use correct casing
        html: emailHtml
    };

    // Send email
    try {
        const info = await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`FAILED to send match notification email to ${userEmail}:`, error);
    }
}
// --- End New Function ---

module.exports = { createMatchNotification };