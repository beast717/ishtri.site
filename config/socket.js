const socketIO = require('socket.io');

const activeUsers = new Map(); // Keep track of userId -> socketId

function initializeSocket(server) {
    const io = socketIO(server);

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);

        socket.on('authenticate', (userId) => {
            if (!userId) return;
            const userIdStr = String(userId); // Use consistent type for map key
            activeUsers.set(userIdStr, socket.id);
            
            // Join user to their own room for direct messaging
            socket.join(userIdStr);
            socket.authenticated = true;
            
            // Maybe emit user status here if needed
            io.emit('userStatus', { userId: userIdStr, status: 'online' });

             // Send existing notifications upon connection/auth? (Optional)
        });

        // Handle user disconnection
        socket.on('disconnect', () => {
            let disconnectedUserId = null;
            // Find which user disconnected
            for (const [userIdStr, socketId] of activeUsers.entries()) {
                if (socketId === socket.id) {
                    disconnectedUserId = userIdStr;
                    break;
                }
            }
            if (disconnectedUserId) {
                activeUsers.delete(disconnectedUserId);
                // Maybe emit user status offline
                 io.emit('userStatus', { userId: disconnectedUserId, status: 'offline' });
            }
        });

        // Handle typing status
        socket.on('typing', (data) => {
            // Emit to receiver's room
            io.to(String(data.receiverId)).emit('userTyping', {
                senderId: data.senderId,
                senderName: data.senderName,
                productdID: data.productdID,
                isTyping: data.isTyping
            });
        });

        // Handle read receipts
        socket.on('messageRead', (data) => {
            // Emit to sender's room
            io.to(String(data.senderId)).emit('messageReadReceipt', {
                messageId: data.messageId,
                readerId: data.readBy
            });
        });

    });

    return io;
}

// Export the map or a function to access it
function getActiveUsersMap() {
    return activeUsers;
}

module.exports = { initializeSocket, getActiveUsersMap }; // Export the function