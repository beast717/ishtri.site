const socketIO = require('socket.io');

function initializeSocket(server) {
    const io = socketIO(server);
    
    // Store active users
    const activeUsers = new Map();

    io.on('connection', (socket) => {
        console.log('New client connected');

        // Handle user authentication
        socket.on('authenticate', (userId) => {
            activeUsers.set(userId, socket.id);
            io.emit('userStatus', { userId, status: 'online' });
        });

        // Handle new message
        socket.on('newMessage', (message) => {
            const receiverSocketId = activeUsers.get(message.receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('messageReceived', message);
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

        // Handle disconnection
        socket.on('disconnect', () => {
            let userId;
            for (const [key, value] of activeUsers.entries()) {
                if (value === socket.id) {
                    userId = key;
                    break;
                }
            }
            if (userId) {
                activeUsers.delete(userId);
                io.emit('userStatus', { userId, status: 'offline' });
            }
        });
    });

    return io;
}

module.exports = initializeSocket; 