// Message Management System
class MessageManager {
    constructor() {
        this.activeChat = null;
        this.messageUpdateInterval = null;
        this.typingTimeout = null;
    }    // Initialize chat with a user
    initializeChat(userId) {
        const currentUser = JSON.parse(localStorage.getItem('dominon_current_user'));
        if (!currentUser) return;

        // Get or create chat between users
        const chatId = this.findOrCreateChat(currentUser.username, userId);
        this.activeChat = Database.getChat(chatId);
        this.startMessageUpdates();
        
        // Update chat UI
        this.updateChatUI();
        
        return this.activeChat;
    }

    // Find existing chat or create new one
    findOrCreateChat(user1, user2) {
        const chats = JSON.parse(localStorage.getItem('dominon_chats') || '{}');
        
        // Find existing chat
        const existingChat = Object.values(chats).find(chat => 
            chat.type === 'direct' && 
            chat.participants.includes(user1) && 
            chat.participants.includes(user2)
        );

        if (existingChat) return existingChat.id;

        // Create new chat
        return Database.createChat([user1, user2]);
    }

    // Send a message
    sendMessage(content, type = 'text') {
        if (!this.activeChat) return null;

        const currentUser = JSON.parse(localStorage.getItem('dominon_current_user'));
        if (!currentUser) return null;

        const message = new Message(
            Database.generateId(),
            currentUser.username,
            content,
            Date.now(),
            type
        );

        this.activeChat.addMessage(message);
        this.updateChatUI();
        return message;
    }

    // Set typing status
    setTyping(isTyping) {
        if (!this.activeChat) return;

        const currentUser = JSON.parse(localStorage.getItem('dominon_current_user'));
        if (!currentUser) return;

        if (isTyping) {
            this.activeChat.typing.add(currentUser.username);
            if (this.typingTimeout) clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.setTyping(false);
            }, 3000);
        } else {
            this.activeChat.typing.delete(currentUser.username);
        }

        this.activeChat.saveToStorage();
        this.updateTypingIndicator();
    }

    // Start periodic message updates
    startMessageUpdates() {
        if (this.messageUpdateInterval) {
            clearInterval(this.messageUpdateInterval);
        }

        this.messageUpdateInterval = setInterval(() => {
            if (this.activeChat) {
                const updatedChat = Database.getChat(this.activeChat.id);
                if (updatedChat && updatedChat.lastActivity > this.activeChat.lastActivity) {
                    this.activeChat = updatedChat;
                    this.updateChatUI();
                }
            }
        }, 1000);
    }

    // Stop message updates
    stopMessageUpdates() {
        if (this.messageUpdateInterval) {
            clearInterval(this.messageUpdateInterval);
            this.messageUpdateInterval = null;
        }
    }

    // Format timestamp for display
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) { // less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // less than 1 hour
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        } else if (diff < 86400000) { // less than 1 day
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    // Get user information
    getUserInfo(username) {
        return window.friendManager?.getFriendByUsername(username) || null;
    }

    // Handle user profile click
    onUserProfileClick(username) {
        const user = this.getUserInfo(username);
        if (user) {
            updateUserProfile(user);
        }
    }

    // Create message element
    createMessageElement(message) {
        const currentUser = JSON.parse(localStorage.getItem('dominon_current_user'));
        const isOwnMessage = message.senderId === currentUser.username;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
        
        const user = this.getUserInfo(message.senderId);
        
        messageEl.innerHTML = `
            ${!isOwnMessage ? `
                <img src="${user?.avatar || 'assets/default-avatar.png'}" 
                     alt="${message.senderId}"
                     class="user-avatar"
                     title="${message.senderId}">
            ` : ''}
            <div class="message-content">
                ${!isOwnMessage ? `
                    <span class="message-sender" data-username="${message.senderId}">
                        ${message.senderId}
                    </span>
                ` : ''}
                <p>${message.content}</p>
                <span class="message-timestamp">${this.formatTimestamp(message.timestamp)}</span>
                ${isOwnMessage ? `<span class="message-status">${message.status}</span>` : ''}
            </div>
            ${isOwnMessage ? `
                <img src="${currentUser.avatar || 'assets/default-avatar.png'}" 
                     alt="${currentUser.username}"
                     class="user-avatar"
                     title="${currentUser.username}">
            ` : ''}
        `;

        // Add click handler for user profile
        if (!isOwnMessage) {
            const avatar = messageEl.querySelector('.user-avatar');
            const sender = messageEl.querySelector('.message-sender');
            
            [avatar, sender].forEach(el => {
                if (el) {
                    el.style.cursor = 'pointer';
                    el.addEventListener('click', () => this.onUserProfileClick(message.senderId));
                }
            });
        }

        return messageEl;
    }    // Update chat UI
    updateChatUI() {
        const chatContent = document.getElementById('chatContent');
        const chatSection = document.querySelector('.chat-section');
        if (!chatContent || !this.activeChat || chatSection.classList.contains('hidden')) return;

        // Clear existing messages
        chatContent.innerHTML = '';

        // Add all messages
        this.activeChat.messages.forEach(message => {
            chatContent.appendChild(this.createMessageElement(message));
        });

        // Scroll to bottom
        chatContent.scrollTop = chatContent.scrollHeight;

        // Update typing indicator
        this.updateTypingIndicator();
    }

    // Update typing indicator
    updateTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (!typingIndicator || !this.activeChat) return;

        const typingUsers = Array.from(this.activeChat.typing);
        const currentUser = JSON.parse(localStorage.getItem('dominon_current_user'));

        // Filter out current user
        const otherTypingUsers = typingUsers.filter(user => user !== currentUser.username);

        if (otherTypingUsers.length > 0) {
            typingIndicator.textContent = otherTypingUsers.length === 1 
                ? `${otherTypingUsers[0]} is typing...`
                : `${otherTypingUsers.length} people are typing...`;
            typingIndicator.style.display = 'block';
        } else {
            typingIndicator.style.display = 'none';
        }
    }
}

// Export for use in other files
window.MessageManager = MessageManager;
