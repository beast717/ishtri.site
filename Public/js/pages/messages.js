/**
 * Messages page functionality - Chat system
 */

let socket = null;
let currentConversation = null;
let typingTimeout = null;
let currentUserId = null;

export default function initMessagesPage() {
    console.log('Initializing messages page...');
    
    // Check if on the correct page
    if (!document.getElementById('chatContainer')) return;
    
    // Use the global socket from app.js
    socket = window.ishtri.socket;
    if (!socket) {
        console.error("Socket not initialized. Chat will not function.");
        document.getElementById('chatContainer').innerHTML = '<p class="error-message">Could not connect to chat service.</p>';
        return;
    }

    // Get current user from global state
    if (window.ishtri.user && window.ishtri.user.brukerId) {
        currentUserId = window.ishtri.user.brukerId;
    } else {
        console.error("User not authenticated for messages");
        return;
    }

    initializeChat();
}

/**
 * Initialize chat functionality
 */
function initializeChat() {
    console.log('Initializing chat with user ID:', currentUserId);

    // Get DOM elements
    const chatContainer = document.getElementById('chatContainer');
    const conversationsListEl = document.getElementById('conversationsList');
    const chatMessagesEl = document.getElementById('chatMessages');
    const messageInput = document.querySelector('.chat-input');
    const sendButton = document.getElementById('sendButton');
    const searchInput = document.querySelector('.search-input');
    const typingIndicator = document.getElementById('typingIndicator');
    const selectedChatNameEl = document.querySelector('.selected-chat-name');
    const backButton = document.getElementById('backButton');

    if (!chatContainer || !conversationsListEl) {
        console.error('Required chat elements not found');
        return;
    }

    // Setup mobile view functions
    const switchToChatView = () => {
        if (window.innerWidth <= 768) {
            chatContainer.classList.add('mobile-chat-active');
        }
    };

    const switchToListView = () => {
        if (window.innerWidth <= 768) {
            chatContainer.classList.remove('mobile-chat-active');
            currentConversation = null;
            if (selectedChatNameEl) {
                selectedChatNameEl.textContent = 'Select a conversation';
                selectedChatNameEl.setAttribute('data-i18n', 'meldinger.klikk');
            }
        }
    };

    // Socket event listeners
    setupSocketListeners();

    // DOM event listeners
    setupEventListeners();

    // Back button functionality
    if (backButton) {
        backButton.addEventListener('click', switchToListView);
    }

    // Initial load
    loadConversations();

    // Private functions for this module
    function setupSocketListeners() {
        // Handle new message received
        socket.on('messageReceived', (message) => {
            console.log('New message received:', message);
            
            if (currentConversation && message.productdID === currentConversation.productdID) {
                appendMessage(message);
                markMessageAsRead(message);
            } else {
                // Show toast notification for messages not in current view
                if (window.ishtri.toast) {
                    window.ishtri.toast.show(`New message about ${message.ProductName}`, 'info');
                }
            }
            updateConversationsList();
        });

        // Handle message sent confirmation
        socket.on('messageSent', (message) => {
            console.log('Message sent confirmation:', message);
            updateMessageStatusUI(message.tempId || message.messageId, 'sent', message.messageId);
            updateConversationsList();
        });

        // Handle typing indicators
        socket.on('userTyping', (data) => {
            if (currentConversation && 
                currentConversation.productdID === data.productdID && 
                data.senderId !== currentUserId) {
                
                if (typingIndicator) {
                    typingIndicator.textContent = `${data.senderName || 'User'} is typing...`;
                    typingIndicator.style.display = 'block';
                    
                    setTimeout(() => {
                        typingIndicator.style.display = 'none';
                        typingIndicator.textContent = '';
                    }, 3000);
                }
            }
        });

        // Handle stopped typing
        socket.on('userStoppedTyping', (data) => {
            if (currentConversation && 
                currentConversation.productdID === data.productdID && 
                data.senderId !== currentUserId) {
                
                if (typingIndicator) {
                    typingIndicator.style.display = 'none';
                    typingIndicator.textContent = '';
                }
            }
        });

        // Handle read receipts
        socket.on('messageReadReceipt', (data) => {
            if (data.readerId !== currentUserId) {
                updateMessageStatusUI(data.messageId, 'read');
            }
        });
    }

    function setupEventListeners() {
        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase().trim();
                const conversations = conversationsListEl.querySelectorAll('.conversation-item');

                conversations.forEach(conv => {
                    const name = conv.querySelector('.conversation-name')?.textContent.toLowerCase() || '';
                    const preview = conv.querySelector('.conversation-preview')?.textContent.toLowerCase() || '';

                    if (name.includes(searchTerm) || preview.includes(searchTerm)) {
                        conv.style.display = 'flex';
                    } else {
                        conv.style.display = 'none';
                    }
                });
            });
        }

        // Message input typing indicators
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                if (!currentConversation) return;

                // Clear previous timeout
                if (typingTimeout) clearTimeout(typingTimeout);

                // Emit typing
                socket.emit('typing', {
                    senderId: currentUserId,
                    receiverId: currentConversation.otherParticipantId,
                    productdID: currentConversation.productdID,
                    senderName: window.ishtri.user?.brukernavn || 'User',
                    isTyping: true
                });

                // Set timeout to stop typing
                typingTimeout = setTimeout(() => {
                    socket.emit('typing', {
                        senderId: currentUserId,
                        receiverId: currentConversation.otherParticipantId,
                        productdID: currentConversation.productdID,
                        isTyping: false
                    });
                    typingTimeout = null;
                }, 1500);
            });

            // Handle enter key
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (sendButton) {
                        sendButton.click();
                    }
                }
            });
        }

        // Send button
        if (sendButton) {
            sendButton.addEventListener('click', async () => {
                await sendMessage();
            });
        }
    }

    async function sendMessage() {
        const messageContent = messageInput?.value.trim();

        if (!messageContent || !currentConversation) {
            console.warn("Cannot send empty message or no conversation selected.");
            return;
        }

        // Create optimistic message
        const tempId = `temp_${Date.now()}`;
        const optimisticMessage = {
            messageId: tempId,
            tempId: tempId,
            productdID: currentConversation.productdID,
            ProductName: currentConversation.productName,
            senderId: currentUserId,
            senderName: window.ishtri.user?.brukernavn || 'Me',
            receiverId: currentConversation.otherParticipantId,
            messageContent: messageContent,
            timestamp: new Date().toISOString(),
            readd: false,
            status: 'pending'
        };

        // Add to UI immediately
        appendMessage(optimisticMessage);
        if (messageInput) {
            messageInput.value = '';
            messageInput.style.height = 'auto';
        }

        try {
            // Stop typing indicator
            if (typingTimeout) clearTimeout(typingTimeout);
            socket.emit('typing', {
                senderId: currentUserId,
                receiverId: currentConversation.otherParticipantId,
                productdID: currentConversation.productdID,
                isTyping: false
            });

            // Send to server
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productdID: currentConversation.productdID,
                    messageContent: messageContent,
                    receiverId: currentConversation.otherParticipantId,
                    tempId: tempId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const confirmedMessage = await response.json();

            // Update UI with confirmed message
            updateMessageStatusUI(tempId, 'sent', confirmedMessage.messageId, confirmedMessage.timestamp);

            // Emit via socket
            socket.emit('newMessage', confirmedMessage);

            updateConversationsList();

        } catch (error) {
            console.error('Error sending message:', error);
            if (window.ishtri.toast) {
                window.ishtri.toast.show(error.message || 'Failed to send message. Please try again.', 'error');
            }
            updateMessageStatusUI(tempId, 'failed');
        }
    }

    async function loadConversations() {
        console.log('Loading conversations...');

        // Show skeleton loading using SkeletonLoader
        window.ishtri.skeletonLoader.showInContainer('conversationsList', 'message', 3);

        try {
            const response = await fetch('/api/messages', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const messages = await response.json();
            console.log(`Loaded ${messages.length} messages`);

            // Group messages into conversations
            const conversations = groupMessagesByConversation(messages);
            console.log(`Found ${conversations.length} conversations`);

            // Display conversations
            displayConversations(conversations);

        } catch (error) {
            console.error('Error loading conversations:', error);
            // Hide skeleton on error
            window.ishtri.skeletonLoader.hideInContainer('conversationsList');
            conversationsListEl.innerHTML = '<div class="error">Failed to load conversations. Please try again.</div>';
            if (window.ishtri.toast) {
                window.ishtri.toast.show('Failed to load conversations. Please try again.', 'error');
            }
        }
    }

    function groupMessagesByConversation(messages) {
        const conversations = {};

        messages.forEach(message => {
            const conversationKey = message.productdID;

            if (!conversations[conversationKey]) {
                conversations[conversationKey] = {
                    productdID: message.productdID,
                    productName: message.ProductName,
                    messages: [],
                    participants: new Set(),
                    lastMessage: null,
                    unreadCount: 0
                };
            }

            conversations[conversationKey].messages.push(message);
            conversations[conversationKey].participants.add(message.senderId);
            conversations[conversationKey].participants.add(message.receiverId);

            // Update last message
            if (!conversations[conversationKey].lastMessage || 
                new Date(message.timestamp) > new Date(conversations[conversationKey].lastMessage.timestamp)) {
                conversations[conversationKey].lastMessage = message;
            }

            // Count unread messages
            if (message.senderId !== currentUserId && !message.readd) {
                conversations[conversationKey].unreadCount++;
            }
        });

        return Object.values(conversations);
    }

    function displayConversations(conversations) {
        // Hide skeleton and clear container
        window.ishtri.skeletonLoader.hideInContainer('conversationsList');

        if (conversations.length === 0) {
            conversationsListEl.innerHTML = '<div class="no-conversations">No conversations yet.</div>';
            return;
        }

        // Sort by last message timestamp
        conversations.sort((a, b) => {
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
        });

        conversations.forEach(conversation => {
            const conversationEl = createConversationElement(conversation);
            conversationsListEl.appendChild(conversationEl);
        });
    }

    function createConversationElement(conversation) {
        const conversationEl = document.createElement('div');
        conversationEl.className = 'conversation-item';
        conversationEl.dataset.productdID = conversation.productdID;

        const displayName = conversation.productName || 'Unknown Product';
        const otherParticipant = Array.from(conversation.participants).find(id => id !== currentUserId);

        const lastMessage = conversation.lastMessage;
        const previewText = lastMessage ? 
            (lastMessage.senderId === currentUserId ? 'You: ' : '') + lastMessage.messageContent : 
            'No messages yet';

        const timeString = lastMessage ? formatRelativeTime(lastMessage.timestamp) : '';

        conversationEl.innerHTML = `
            <div class="conversation-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="conversation-info">
                <div class="conversation-name">${displayName}</div>
                <div class="conversation-preview">${previewText}</div>
            </div>
            <div class="conversation-meta">
                <div class="conversation-time">${timeString}</div>
                ${conversation.unreadCount > 0 ? `<div class="unread-badge">${conversation.unreadCount}</div>` : ''}
            </div>
        `;

        // Add click handler
        conversationEl.addEventListener('click', () => {
            // Remove active class from all conversations
            document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
            conversationEl.classList.add('active');

            // Set current conversation
            currentConversation = {
                productdID: conversation.productdID,
                productName: conversation.productName,
                otherParticipantId: otherParticipant,
                messages: conversation.messages
            };

            // Load messages
            loadConversationMessages(conversation.productdID);

            // Switch to chat view on mobile
            switchToChatView();

            // Update header
            if (selectedChatNameEl) {
                selectedChatNameEl.textContent = displayName;
                selectedChatNameEl.removeAttribute('data-i18n');
            }
        });

        return conversationEl;
    }

    async function loadConversationMessages(productdID) {
        console.log(`Loading messages for conversation: ${productdID}`);

        if (chatMessagesEl) {
            chatMessagesEl.innerHTML = '<div class="loading">Loading messages...</div>';
        }

        try {
            const response = await fetch(`/api/messages/conversation?productdID=${productdID}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const messages = await response.json();
            console.log(`Loaded ${messages.length} messages for conversation ${productdID}`);

            if (chatMessagesEl) {
                chatMessagesEl.innerHTML = '';

                messages.forEach(message => {
                    appendMessage(message);
                });

                // Messages are automatically marked as read by the backend
                // when fetching conversation, so just update the list
                updateConversationsList();

                // Scroll to bottom
                chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
            }

        } catch (error) {
            console.error('Error loading conversation messages:', error);
            if (chatMessagesEl) {
                chatMessagesEl.innerHTML = '<div class="error">Failed to load messages. Please try again.</div>';
            }
            if (window.ishtri.toast) {
                window.ishtri.toast.show('Failed to load messages. Please try again.', 'error');
            }
        }
    }

    function appendMessage(message) {
        if (!chatMessagesEl) return;

        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.senderId === currentUserId ? 'sent' : 'received'}`;
        messageEl.dataset.messageId = message.messageId || message.tempId;

        const timestamp = formatRelativeTime(message.timestamp);
        
        let statusIcon = '';
        if (message.senderId === currentUserId) {
            if (message.status === 'pending') {
                statusIcon = '<span class="message-status pending">⏳</span>';
            } else if (message.status === 'failed') {
                statusIcon = '<span class="message-status failed">❌</span>';
            } else if (message.readd) {
                statusIcon = '<span class="message-status read">✓✓</span>';
            } else {
                statusIcon = '<span class="message-status sent">✓</span>';
            }
        }

        messageEl.innerHTML = `
            <div class="message-content">${message.messageContent}</div>
            <div class="message-meta">
                <span class="message-time">${timestamp}</span>
                ${statusIcon}
            </div>
        `;

        chatMessagesEl.appendChild(messageEl);
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    function updateMessageStatusUI(messageId, status, newMessageId = null, newTimestamp = null) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageEl) return;

        if (newMessageId) {
            messageEl.dataset.messageId = newMessageId;
        }

        if (newTimestamp) {
            const timeEl = messageEl.querySelector('.message-time');
            if (timeEl) {
                timeEl.textContent = formatRelativeTime(newTimestamp);
            }
        }

        const statusEl = messageEl.querySelector('.message-status');
        if (statusEl) {
            statusEl.className = `message-status ${status}`;
            switch (status) {
                case 'pending':
                    statusEl.textContent = '⏳';
                    break;
                case 'sent':
                    statusEl.textContent = '✓';
                    break;
                case 'read':
                    statusEl.textContent = '✓✓';
                    break;
                case 'failed':
                    statusEl.textContent = '❌';
                    break;
            }
        }
    }

    function markMessageAsRead(message) {
        if (message.senderId !== currentUserId) {
            socket.emit('messageRead', {
                messageId: message.messageId,
                senderId: message.senderId,
                readBy: currentUserId
            });
        }
    }

    function updateConversationsList() {
        loadConversations();
    }

    function formatRelativeTime(timestamp) {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffInMinutes = Math.floor((now - messageTime) / 60000);

        if (diffInMinutes < 1) return 'Now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return messageTime.toLocaleDateString();
    }
}