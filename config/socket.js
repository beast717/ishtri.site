const socketIO = require('socket.io');

const activeUsers = new Map(); // Keep track of userId -> socketId

function initializeSocket(server) {
    const io = socketIO(server);

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);

        socket.on('authenticate', (userId) => {
            if (!userId) return;
            const userIdStr = String(userId); // Use consistent type for map key
            console.log(`Authenticating user ${userIdStr} with socket ${socket.id}`);
            activeUsers.set(userIdStr, socket.id);
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
                console.log(`User ${disconnectedUserId} disconnected (Socket ${socket.id})`);
                activeUsers.delete(disconnectedUserId);
                // Maybe emit user status offline
                 io.emit('userStatus', { userId: disconnectedUserId, status: 'offline' });
            } else {
                 console.log(`Socket ${socket.id} disconnected without known user.`);
            }
        });



        // Handle new message
        socket.on('newMessage', (message) => {
            const receiverSocketId = activeUsers.get(message.receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('messageReceived', newMessage[0]);
                io.to(senderSocketId).emit('messageSent', newMessage[0]);
            }
        });

        // Handle typing status
        socket.on('typing', (data) => {
            const receiverSocketId = activeUsers.get(data.receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('userTyping', {
                    senderId: data.senderId,
                    isTyping: data.isTyping
                });
            }
        });

        // Handle read receipts
        socket.on('messageRead', (data) => {
            const senderSocketId = activeUsers.get(data.senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit('messageReadReceipt', {
                    messageId: data.messageId,
                    readBy: data.readBy
                });
            }
        });

    });

    return io;
}

// Export the map or a function to access it
function getActiveUsersMap() {
    return activeUsers;
}

module.exports = { initializeSocket, getActiveUsersMap }; // Export the function