// Data structures
class Message {
    constructor(id, senderId, content, timestamp, type = 'text') {
        this.id = id;
        this.senderId = senderId;
        this.content = content;
        this.timestamp = timestamp;
        this.type = type; // text, image, file
        this.status = 'sent'; // sent, delivered, read
    }
}

class Chat {
    constructor(id, participants, type = 'direct') {
        this.id = id;
        this.participants = participants; // array of user IDs
        this.type = type; // direct or group
        this.messages = [];
        this.lastActivity = Date.now();
        this.typing = new Set(); // users currently typing
    }

    addMessage(message) {
        this.messages.push(message);
        this.lastActivity = Date.now();
        this.saveToStorage();
    }

    markAsRead(userId) {
        this.messages.forEach(msg => {
            if (msg.senderId !== userId) {
                msg.status = 'read';
            }
        });
        this.saveToStorage();
    }

    saveToStorage() {
        const chats = JSON.parse(localStorage.getItem('dominon_chats') || '{}');
        chats[this.id] = this;
        localStorage.setItem('dominon_chats', JSON.stringify(chats));
    }
}

class User {
    constructor(id, username, email) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.status = 'offline';
        this.lastSeen = Date.now();
        this.friends = new Set();
        this.friendRequests = {
            sent: new Set(),
            received: new Set()
        };
        this.blocked = new Set();
    }

    addFriend(userId) {
        this.friends.add(userId);
        this.friendRequests.sent.delete(userId);
        this.friendRequests.received.delete(userId);
        this.saveToStorage();
    }

    removeFriend(userId) {
        this.friends.delete(userId);
        this.saveToStorage();
    }

    blockUser(userId) {
        this.blocked.add(userId);
        this.friends.delete(userId);
        this.saveToStorage();
    }

    unblockUser(userId) {
        this.blocked.delete(userId);
        this.saveToStorage();
    }

    sendFriendRequest(userId) {
        this.friendRequests.sent.add(userId);
        this.saveToStorage();
    }

    acceptFriendRequest(userId) {
        this.addFriend(userId);
        this.saveToStorage();
    }

    saveToStorage() {
        const users = JSON.parse(localStorage.getItem('dominon_users') || '{}');
        users[this.id] = this;
        localStorage.setItem('dominon_users', JSON.stringify(users));
    }
}

// Database simulation using localStorage
class Database {
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static getUser(userId) {
        const users = JSON.parse(localStorage.getItem('dominon_users') || '{}');
        return users[userId];
    }

    static getChat(chatId) {
        const chats = JSON.parse(localStorage.getItem('dominon_chats') || '{}');
        return chats[chatId];
    }

    static createUser(username, email, password) {
        const userId = this.generateId();
        const user = new User(userId, username, email);
        // Store password securely (in reality, you'd hash it)
        const auth = JSON.parse(localStorage.getItem('dominon_auth') || '{}');
        auth[email] = { userId, password };
        localStorage.setItem('dominon_auth', JSON.stringify(auth));
        user.saveToStorage();
        return userId;
    }

    static createChat(participants) {
        const chatId = this.generateId();
        const chat = new Chat(chatId, participants);
        chat.saveToStorage();
        return chatId;
    }

    static getUserByEmail(email) {
        const auth = JSON.parse(localStorage.getItem('dominon_auth') || '{}');
        const userId = auth[email]?.userId;
        return userId ? this.getUser(userId) : null;
    }

    static validateCredentials(email, password) {
        const auth = JSON.parse(localStorage.getItem('dominon_auth') || '{}');
        return auth[email]?.password === password ? auth[email].userId : null;
    }

    static getUserData(username) {
        const users = JSON.parse(localStorage.getItem('dominon_users') || '{}');
        return users[username] || null;
    }

    static updateUserData(username, data) {
        const users = JSON.parse(localStorage.getItem('dominon_users') || '{}');
        users[username] = { ...users[username], ...data };
        localStorage.setItem('dominon_users', JSON.stringify(users));
    }

    static removeFriendship(user1, user2) {
        const users = JSON.parse(localStorage.getItem('dominon_users') || '{}');
        
        if (users[user1] && users[user1].friends) {
            users[user1].friends = users[user1].friends.filter(friend => friend !== user2);
        }
        
        if (users[user2] && users[user2].friends) {
            users[user2].friends = users[user2].friends.filter(friend => friend !== user1);
        }
        
        localStorage.setItem('dominon_users', JSON.stringify(users));
    }

    static addToBlocked(username, blockedUser) {
        const users = JSON.parse(localStorage.getItem('dominon_users') || '{}');
        if (!users[username]) return;
        
        if (!users[username].blocked) {
            users[username].blocked = [];
        }
        
        if (!users[username].blocked.includes(blockedUser)) {
            users[username].blocked.push(blockedUser);
            this.removeFriendship(username, blockedUser);
        }
        
        localStorage.setItem('dominon_users', JSON.stringify(users));
    }
}

// Export for use in other files
window.Database = Database;
window.User = User;
window.Chat = Chat;
window.Message = Message;
