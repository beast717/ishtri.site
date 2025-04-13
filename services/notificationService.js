// services/notificationService.js
const pool = require('../config/db'); // Adjust path if db.js is elsewhere

// ** IMPORTANT: How to access activeUsers? **
// Option 1: Pass 'io' and 'activeUsers' map from server.js/backgroundMatcher.js
// Option 2: Export 'activeUsers' from socket.js (less ideal, creates tight coupling)
// Option 3: Use a shared module or external store (like Redis) for user sockets.
// We'll assume Option 1 for now: 'io' and 'activeUsers' are passed in.

async function createMatchNotification(userId, searchName, product, io, activeUsers) { // Accept io and activeUsers
    try {
        const message = `New match for your search '${searchName}': ${product.ProductName}`;
        // Ensure product object has the correct ID field name used in your DB/frontend
        const productId = product.productdID || product.ProductdID;

        if (!productId) {
             console.warn(`Product object missing ID field for notification. Product:`, product);
             // Decide how to handle - maybe create notification without product link?
             // For now, we'll skip if productId is missing.
             return;
        }


        // Insert notification into the database
        const [result] = await pool.promise().query(
            `INSERT INTO notifications (userId, message, productdID, isRead, notification_type, createdAt)
             VALUES (?, ?, ?, FALSE, 'new_match', NOW())`,
            [userId, message, productId]
        );

        const newNotificationId = result.insertId;
        console.log(`Notification created (ID: ${newNotificationId}) for user ${userId}, search '${searchName}', product ${productId}`);

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
                    Price: product.Price // Ensure product object has Price
                };
                io.to(userSocketId).emit('new_notification', newNotificationData);
                console.log(`Emitted new_notification to user ${userId} (Socket ID: ${userSocketId})`);
            } else {
                 console.log(`Could not find active socket for user ${userId} to send real-time notification.`);
            }
        } else {
             console.log("Skipping real-time notification: io or activeUsers map not provided.");
        }

    } catch (error) {
        console.error(`Error creating notification for user ${userId}:`, error);
        // Handle specific errors, e.g., foreign key constraint if product ID is invalid
    }
}


module.exports = { createMatchNotification };