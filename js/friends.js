// Friend Management System
class FriendManager {
    constructor() {
        this.currentUser = null;
        this.statusUpdateInterval = null;
        this.loadCurrentUser();
    }

    // Load current user data
    loadCurrentUser() {
        const userData = JSON.parse(localStorage.getItem('dominon_current_user'));
        if (userData) {
            this.currentUser = Database.getUser(userData.username) || null;
        }
    }

    // Send friend request
    sendFriendRequest(username) {
        if (!this.currentUser) return false;

        const targetUser = Database.getUserByEmail(username);
        if (!targetUser) return false;

        // Check if already friends or blocked
        if (this.currentUser.friends.has(targetUser.id) ||
            this.currentUser.blocked.has(targetUser.id) ||
            targetUser.blocked.has(this.currentUser.id)) {
            return false;
        }

        // Send request
        this.currentUser.sendFriendRequest(targetUser.id);
        return true;
    }

    // Accept friend request
    acceptFriendRequest(username) {
        if (!this.currentUser) return false;

        const targetUser = Database.getUserByEmail(username);
        if (!targetUser) return false;

        // Verify request exists
        if (!this.currentUser.friendRequests.received.has(targetUser.id)) {
            return false;
        }

        // Accept request
        this.currentUser.acceptFriendRequest(targetUser.id);
        targetUser.addFriend(this.currentUser.id);
        return true;
    }

    // Reject friend request
    rejectFriendRequest(username) {
        if (!this.currentUser) return false;

        const targetUser = Database.getUserByEmail(username);
        if (!targetUser) return false;

        // Remove request
        this.currentUser.friendRequests.received.delete(targetUser.id);
        targetUser.friendRequests.sent.delete(this.currentUser.id);
        
        this.currentUser.saveToStorage();
        targetUser.saveToStorage();
        return true;
    }

    // Remove friend
    removeFriend(username) {
        if (!this.currentUser) return false;

        const targetUser = Database.getUserByEmail(username);
        if (!targetUser) return false;

        // Remove from both users' friend lists
        this.currentUser.removeFriend(targetUser.id);
        targetUser.removeFriend(this.currentUser.id);
        return true;
    }

    // Block user
    blockUser(username) {
        if (!this.currentUser) return false;

        const targetUser = Database.getUserByEmail(username);
        if (!targetUser) return false;

        // Block user and remove from friends if necessary
        this.currentUser.blockUser(targetUser.id);
        return true;
    }

    // Unblock user
    unblockUser(username) {
        if (!this.currentUser) return false;

        const targetUser = Database.getUserByEmail(username);
        if (!targetUser) return false;

        this.currentUser.unblockUser(targetUser.id);
        return true;
    }

    // Get friend list
    getFriendList(filter = 'all') {
        if (!this.currentUser) return [];

        const users = JSON.parse(localStorage.getItem('dominon_users') || '{}');
        const friendIds = Array.from(this.currentUser.friends);
        
        const friends = friendIds.map(id => users[id]).filter(Boolean);

        switch (filter.toLowerCase()) {
            case 'online':
                return friends.filter(friend => friend.status === 'online');
            case 'blocked':
                return Array.from(this.currentUser.blocked)
                    .map(id => users[id])
                    .filter(Boolean);
            case 'pending':
                const received = Array.from(this.currentUser.friendRequests.received)
                    .map(id => users[id])
                    .filter(Boolean);
                const sent = Array.from(this.currentUser.friendRequests.sent)
                    .map(id => users[id])
                    .filter(Boolean);
                return { received, sent };
            default:
                return friends;
        }
    }

    // Start status updates
    startStatusUpdates() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
        }

        this.updateUserStatus('online');
        
        this.statusUpdateInterval = setInterval(() => {
            this.updateUserStatus('online');
        }, 30000); // Update every 30 seconds
    }

    // Stop status updates
    stopStatusUpdates() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
        }

        this.updateUserStatus('offline');
    }

    // Update user status
    updateUserStatus(status) {
        if (!this.currentUser) return;

        this.currentUser.status = status;
        this.currentUser.lastSeen = Date.now();
        this.currentUser.saveToStorage();
    }

    // Create friend list item element
    createFriendElement(user, type = 'friend') {
        const friendEl = document.createElement('div');
        friendEl.className = 'friend-item';
        
        friendEl.innerHTML = `
            <img src="assets/default-avatar.png" alt="${user.username}">
            <div class="friend-info">
                <span class="friend-name">${user.username}</span>
                <span class="friend-status">${user.status}</span>
            </div>
            <div class="friend-actions">
                ${this.getFriendActionButtons(user, type)}
            </div>
        `;

        return friendEl;
    }

    // Get action buttons based on friend type
    getFriendActionButtons(user, type) {
        switch (type) {
            case 'pending-received':
                return `
                    <button class="action-btn accept" data-username="${user.username}">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn reject" data-username="${user.username}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            case 'pending-sent':
                return `
                    <button class="action-btn cancel" data-username="${user.username}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            case 'blocked':
                return `
                    <button class="action-btn unblock" data-username="${user.username}">
                        <i class="fas fa-unlock"></i>
                    </button>
                `;
            default:
                return `
                    <button class="action-btn message" data-username="${user.username}">
                        <i class="fas fa-comment"></i>
                    </button>
                    <button class="action-btn more" data-username="${user.username}">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                `;
        }
    }

    // Update friends list UI
    updateFriendsUI(filter = 'all') {
        const friendsList = document.getElementById('friendsList');
        if (!friendsList) return;

        // Clear existing list
        friendsList.innerHTML = '';

        if (filter === 'pending') {
            const { received, sent } = this.getFriendList('pending');
            
            if (received.length > 0 || sent.length > 0) {
                if (received.length > 0) {
                    const receivedSection = document.createElement('div');
                    receivedSection.className = 'friends-section';
                    receivedSection.innerHTML = '<h3>Pending Requests</h3>';
                    received.forEach(user => {
                        receivedSection.appendChild(this.createFriendElement(user, 'pending-received'));
                    });
                    friendsList.appendChild(receivedSection);
                }

                if (sent.length > 0) {
                    const sentSection = document.createElement('div');
                    sentSection.className = 'friends-section';
                    sentSection.innerHTML = '<h3>Sent Requests</h3>';
                    sent.forEach(user => {
                        sentSection.appendChild(this.createFriendElement(user, 'pending-sent'));
                    });
                    friendsList.appendChild(sentSection);
                }
            } else {
                friendsList.innerHTML = '<div class="no-friends">No pending requests</div>';
            }
        } else {
            const friends = this.getFriendList(filter);
            if (friends.length > 0) {
                friends.forEach(friend => {
                    friendsList.appendChild(this.createFriendElement(friend, filter));
                });
            } else {
                friendsList.innerHTML = `<div class="no-friends">No ${filter} friends</div>`;
            }
        }

        this.attachFriendActionHandlers();
    }

    // Attach event handlers to friend action buttons
    attachFriendActionHandlers() {
        document.querySelectorAll('.friend-actions button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const username = button.dataset.username;
                const action = button.className.split(' ')[1];

                switch (action) {
                    case 'accept':
                        this.acceptFriendRequest(username);
                        break;
                    case 'reject':
                    case 'cancel':
                        this.rejectFriendRequest(username);
                        break;
                    case 'unblock':
                        this.unblockUser(username);
                        break;
                    case 'message':
                        // Open chat with this friend
                        if (window.messageManager) {
                            window.messageManager.initializeChat(username);
                        }
                        break;
                    case 'more':
                        this.showFriendOptions(username, button);
                        break;
                }

                this.updateFriendsUI(document.querySelector('.tab-btn.active').textContent.toLowerCase());
            });
        });
    }

    // Show friend options menu
    showFriendOptions(username, buttonEl) {
        const existingMenu = document.querySelector('.friend-options-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'friend-options-menu';
        menu.innerHTML = `
            <button data-action="remove" data-username="${username}">
                <i class="fas fa-user-minus"></i> Remove Friend
            </button>
            <button data-action="block" data-username="${username}">
                <i class="fas fa-ban"></i> Block
            </button>
        `;

        // Position menu
        const rect = buttonEl.getBoundingClientRect();
        menu.style.top = `${rect.bottom}px`;
        menu.style.left = `${rect.left}px`;

        // Add event listeners
        menu.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                if (action === 'remove') {
                    this.removeFriend(username);
                } else if (action === 'block') {
                    this.blockUser(username);
                }
                menu.remove();
                this.updateFriendsUI(document.querySelector('.tab-btn.active').textContent.toLowerCase());
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && !buttonEl.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });

        document.body.appendChild(menu);
    }

    // Get mutual friends between current user and target user
    getMutualFriends(targetUsername) {
        const currentUser = JSON.parse(localStorage.getItem('dominon_current_user'));
        if (!currentUser) return [];

        const users = JSON.parse(localStorage.getItem('dominon_users') || '{}');
        const targetUser = users[targetUsername];
        
        if (!targetUser || !targetUser.friends) return [];

        const currentUserFriends = new Set(this.getFriendList('all').map(f => f.username));
        return targetUser.friends
            .filter(friendUsername => currentUserFriends.has(friendUsername))
            .map(friendUsername => ({
                username: friendUsername,
                status: this.getUserStatus(friendUsername),
                avatar: users[friendUsername]?.avatar
            }));
    }

    // Get user profile data
    getFriendByUsername(username) {
        const users = JSON.parse(localStorage.getItem('dominon_users') || '{}');
        const user = users[username];
        
        if (!user) return null;

        return {
            username: user.username,
            status: this.getUserStatus(username),
            avatar: user.avatar || 'assets/default-avatar.png',
            about: user.about || 'No bio yet',
            joinDate: user.joinDate || Date.now(),
            mutualFriends: this.getMutualFriends(username).length
        };
    }

    // Block a user
    blockUser(username) {
        const currentUser = JSON.parse(localStorage.getItem('dominon_current_user'));
        if (!currentUser) return false;

        const users = JSON.parse(localStorage.getItem('dominon_users') || '{}');
        if (!users[username]) return false;

        // Remove from friends if they are friends
        this.removeFriend(username);

        // Add to blocked list
        if (!currentUser.blocked) currentUser.blocked = [];
        if (!currentUser.blocked.includes(username)) {
            currentUser.blocked.push(username);
        }

        localStorage.setItem('dominon_current_user', JSON.stringify(currentUser));
        return true;
    }

    // Remove friend
    removeFriend(username) {
        const currentUser = JSON.parse(localStorage.getItem('dominon_current_user'));
        if (!currentUser) return false;

        const users = JSON.parse(localStorage.getItem('dominon_users') || '{}');
        if (!users[username]) return false;

        // Remove from current user's friends list
        if (currentUser.friends) {
            currentUser.friends = currentUser.friends.filter(friend => friend !== username);
        }

        // Remove current user from target user's friends list
        if (users[username].friends) {
            users[username].friends = users[username].friends.filter(friend => friend !== currentUser.username);
        }

        localStorage.setItem('dominon_current_user', JSON.stringify(currentUser));
        localStorage.setItem('dominon_users', JSON.stringify(users));
        
        // Refresh UI
        this.updateFriendsUI(document.querySelector('.tab-btn.active')?.textContent.toLowerCase() || 'online');
        
        return true;
    }

    // Get user's online status
    getUserStatus(username) {
        const users = JSON.parse(localStorage.getItem('dominon_users') || '{}');
        const user = users[username];
        
        if (!user) return 'offline';

        const lastActive = user.lastActive || 0;
        const now = Date.now();
        const timeDiff = now - lastActive;

        if (timeDiff < 60000) { // Less than 1 minute
            return 'online';
        } else if (timeDiff < 300000) { // Less than 5 minutes
            return 'idle';
        } else {
            return 'offline';
        }
    }
}
