// Session management
function validateSession() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('dominon_current_user'));
        const sessionActive = localStorage.getItem('dominon_session_active');
        
        if (!currentUser?.isAuthenticated || sessionActive !== 'true') {
            throw new Error('Invalid session');
        }
        
        // Update last active timestamp
        currentUser.lastActive = Date.now();
        localStorage.setItem('dominon_current_user', JSON.stringify(currentUser));
        
        return currentUser;
    } catch (error) {
        console.error('Session validation failed:', error);
        // Clear invalid session
        localStorage.removeItem('dominon_current_user');
        localStorage.removeItem('dominon_session_active');
        window.location.replace('index.html');
        return null;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = validateSession();
    if (!currentUser) return;

    // Initialize message and friend managers
    window.messageManager = new MessageManager();
    window.friendManager = new FriendManager();

    // Update UI with user information
    document.getElementById('username').textContent = currentUser.username;
    
    // Initialize direct messages list
    initializeDMList();    // Initialize the chat interface
    initializeChat();

    // Hide direct messages by default
    document.querySelector('.direct-messages').style.display = 'none';

    // Start status updates
    friendManager.startStatusUpdates();

    // Prevent back navigation
    history.pushState(null, null, document.URL);
    window.addEventListener('popstate', () => {
        history.pushState(null, null, document.URL);
    });

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
        friendManager.stopStatusUpdates();
        messageManager.stopMessageUpdates();
    });

    // Periodically validate session
    setInterval(validateSession, 30000); // Check every 30 seconds
});

function initializeChat() {
    // Initialize navigation
    initializeNavigation();
    
    // Initialize friend tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const tabType = button.textContent.toLowerCase();
            friendManager.updateFriendsUI(tabType);
        });
    });

    // Add Friend button functionality
    const addFriendBtn = document.querySelector('.add-friend-btn');
    addFriendBtn.addEventListener('click', () => {
        const username = prompt('Enter username to add friend:');
        if (username) {
            if (friendManager.sendFriendRequest(username)) {
                alert('Friend request sent!');
            } else {
                alert('Could not send friend request. User may not exist or is already a friend.');
            }
        }
    });

    // Search functionality
    const searchInput = document.querySelector('.search-bar input');
    searchInput.addEventListener('input', (e) => {
        // TODO: Implement search functionality
        console.log('Searching for:', e.target.value);
    });

    // Settings button functionality
    const settingsBtn = document.querySelector('.settings-btn');
    settingsBtn.addEventListener('click', () => handleLogout());

    // Initialize chat input and DM controls
    initializeChatInput();
    initializeDMControls();

    // Initialize friend list
    friendManager.updateFriendsUI('online');
}

function initializeChatInput() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendMessage');
    let typingTimeout;

    if (!messageInput || !sendButton) return;

    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
        // Reset height to auto to correctly calculate scroll height
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
        
        // Enable/disable send button based on content
        sendButton.disabled = !messageInput.value.trim();

        // Handle typing indicator
        if (messageManager.activeChat) {
            messageManager.setTyping(true);
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                messageManager.setTyping(false);
            }, 1000);
        }
    });

    // Handle message sending
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function sendMessage() {
        const content = messageInput.value.trim();
        if (!content || !messageManager.activeChat) return;

        messageManager.sendMessage(content);
        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendButton.disabled = true;
    }
}

function initializeDMList() {
    const dmList = document.getElementById('dmList');
    const friendsList = friendManager.getFriendList('online');
    
    dmList.innerHTML = ''; // Clear existing items
    
    if (friendsList.length === 0) {
        dmList.innerHTML = '<div class="no-dms">No conversations yet</div>';
        return;
    }

    // Get active chat username if any
    const activeChatUsername = document.getElementById('chatUsername')?.textContent;

    friendsList.forEach(friend => {
        const dmElement = document.createElement('div');
        dmElement.className = 'dm-item';
        if (friend.username === activeChatUsername) {
            dmElement.classList.add('selected');
        }
        dmElement.innerHTML = `
            <img src="${friend.avatar || 'assets/default-avatar.png'}" alt="${friend.username}">
            <span>${friend.username}</span>
            <div class="status-indicator ${friend.status}"></div>
        `;
        
        dmElement.addEventListener('click', () => {
            // Deselect all other DMs
            document.querySelectorAll('.dm-item').forEach(item => item.classList.remove('selected'));
            dmElement.classList.add('selected');
            openChat(friend.username);
        });
        dmList.appendChild(dmElement);
    });
}

function openChat(username) {
    // Hide all other sections and show chat section
    const friendsSection = document.querySelector('.friends-section');
    const messagesSection = document.getElementById('messages-section');
    const exploreSection = document.getElementById('explore-section');
    const userProfileSection = document.querySelector('.active-now');
    
    friendsSection.classList.add('hidden');
    if (messagesSection) messagesSection.classList.add('hidden');
    if (exploreSection) exploreSection.classList.add('hidden');
    
    const chatSection = document.querySelector('.chat-section');
    chatSection.classList.remove('hidden');
    document.querySelector('.direct-messages').style.display = 'flex';
    
    // Hide user profile section when in active chat
    userProfileSection.style.display = 'none';

    // Get user data
    const user = friendManager.getFriendByUsername(username);
    
    // Update chat header
    document.getElementById('chatUsername').textContent = username;
    document.getElementById('chatUserStatus').textContent = user ? user.status : 'Offline';

    // Initialize chat
    messageManager.initializeChat(username);

    // Update UI to show selected chat in DM list
    document.querySelectorAll('.dm-item').forEach(item => {
        item.classList.remove('selected');
        if (item.querySelector('span').textContent === username) {
            item.classList.add('selected');
        }
    });

    // Update user profile section
    updateUserProfile(user);

    // Make sure message input is ready
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.focus();
    }
}

// Update user profile section
function updateUserProfile(user) {
    if (!user) return;
    
    // Update profile header
    document.getElementById('profileAvatar').src = user.avatar || 'assets/default-avatar.png';
    document.getElementById('profileUsername').textContent = user.username;
    document.getElementById('profileStatus').textContent = user.status;
    document.getElementById('profileStatus').className = `status ${user.status.toLowerCase()}`;

    // Update about section
    document.getElementById('profileAbout').textContent = user.about || 'No bio yet';
    
    // Update join date
    const joinDate = new Date(user.joinDate || Date.now());
    document.getElementById('profileJoinDate').textContent = joinDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    // Update mutual friends
    const mutualFriends = friendManager.getMutualFriends(user.username);
    const mutualFriendsContainer = document.getElementById('profileMutualFriends');
    
    if (mutualFriends.length === 0) {
        mutualFriendsContainer.innerHTML = '<p>No mutual friends yet</p>';
    } else {
        mutualFriendsContainer.innerHTML = mutualFriends
            .map(friend => `
                <img src="${friend.avatar || 'assets/default-avatar.png'}" 
                     alt="${friend.username}" 
                     title="${friend.username}">
            `).join('');
    }

    // Setup profile actions
    const messageBtn = document.querySelector('.profile-actions .message-btn');
    const moreBtn = document.querySelector('.profile-actions .more-btn');
    
    messageBtn.onclick = () => openChat(user.username);
    moreBtn.onclick = (e) => showUserOptions(user, e.target);
}

// Show user options menu
function showUserOptions(user, buttonEl) {
    const existingMenu = document.querySelector('.user-options-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'user-options-menu';
    menu.innerHTML = `
        <button data-action="block">
            <i class="fas fa-ban"></i>
            Block
        </button>
        <button data-action="remove">
            <i class="fas fa-user-minus"></i>
            Remove Friend
        </button>
    `;

    // Position menu
    const rect = buttonEl.getBoundingClientRect();
    menu.style.top = rect.bottom + 'px';
    menu.style.left = rect.left + 'px';

    // Add event listeners
    menu.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            if (action === 'block') {
                if (confirm(`Are you sure you want to block ${user.username}?`)) {
                    friendManager.blockUser(user.username);
                }
            } else if (action === 'remove') {
                if (confirm(`Are you sure you want to remove ${user.username} from your friends?`)) {
                    friendManager.removeFriend(user.username);
                }
            }
            menu.remove();
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

// Handle navigation item clicks
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Handle section visibility
            const type = item.querySelector('span').textContent.toLowerCase();
            handleSectionVisibility(type);
            
            // Reset active chat when switching sections
            if (type !== 'messages') {
                window.messageManager.activeChat = null;
                window.messageManager.stopMessageUpdates();
            }
        });
    });
}

function handleSectionVisibility(type) {
    const friendsSection = document.querySelector('.friends-section');
    const chatSection = document.querySelector('.chat-section');
    const dmList = document.querySelector('.direct-messages');
    const messagesSection = document.getElementById('messages-section');
    const exploreSection = document.getElementById('explore-section');
    const userProfileSection = document.querySelector('.active-now');
    
    // First hide all sections
    friendsSection.classList.add('hidden');
    chatSection.classList.add('hidden');
    if (messagesSection) messagesSection.classList.add('hidden');
    if (exploreSection) exploreSection.classList.add('hidden');
    
    // Reset activity section visibility based on section
    userProfileSection.style.display = type === 'friends' ? 'block' : 'none';    // Handle DM list visibility - hidden by default, only show in messages section
    dmList.style.display = type === 'messages' ? 'flex' : 'none';

    switch(type) {
    case 'friends':
            friendsSection.classList.remove('hidden');
            chatSection.classList.add('hidden');
            friendManager.updateFriendsUI('online');
            break;
            
        case 'messages':
            // Create messages section if it doesn't exist
            if (!messagesSection) {
                const section = document.createElement('div');
                section.id = 'messages-section';
                section.innerHTML = `
                    <div class="section-header">
                        <div class="header-tabs">
                            <button class="tab-btn active" data-tab="all">All Messages</button>
                            <button class="tab-btn" data-tab="requests">Message Requests</button>
                            <button class="tab-btn" data-tab="spam">Spam</button>
                        </div>
                    </div>
                    <div class="search-bar">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Search messages...">
                    </div>
                    <div class="messages-container">
                        <div class="no-messages">
                            <i class="fas fa-inbox"></i>
                            <p>No new messages</p>
                            <span>Start a conversation with your friends!</span>
                        </div>
                    </div>
                `;
                friendsSection.parentNode.insertBefore(section, friendsSection);
                setupMessageTabs();
            }
            messagesSection.classList.remove('hidden');
            break;
            
        case 'explore':
            // Create explore section if it doesn't exist
            if (!exploreSection) {
                const section = document.createElement('div');
                section.id = 'explore-section';
                section.innerHTML = `
                    <div class="section-header">
                        <h2>Explore Communities</h2>
                        <button class="add-community-btn">
                            <i class="fas fa-plus"></i>
                            Create Community
                        </button>
                    </div>
                    <div class="search-bar">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Search for communities...">
                    </div>
                    <div class="explore-categories">
                        <button class="category-btn active">Popular</button>
                        <button class="category-btn">Gaming</button>
                        <button class="category-btn">Music</button>
                        <button class="category-btn">Art</button>
                        <button class="category-btn">Science</button>
                    </div>
                    <div class="explore-content">
                        <div class="community-card">
                            <div class="community-banner">
                                <img src="assets/default-avatar.png" alt="Space Gaming">
                            </div>
                            <div class="community-info">
                                <h3>Space Gaming</h3>
                                <p>A community for space game enthusiasts</p>
                                <span class="member-count">1.2k members</span>
                            </div>
                            <button class="join-btn">Join</button>
                        </div>
                        <div class="community-card">
                            <div class="community-banner">
                                <img src="assets/default-avatar.png" alt="Starship Engineers">
                            </div>
                            <div class="community-info">
                                <h3>Starship Engineers</h3>
                                <p>Design and discuss space vessels</p>
                                <span class="member-count">842 members</span>
                            </div>
                            <button class="join-btn">Join</button>
                        </div>
                    </div>
                `;
                friendsSection.parentNode.insertBefore(section, friendsSection);
                setupExploreHandlers();
            }
            exploreSection.classList.remove('hidden');
            break;
    }
}

// Add DM button handler
function initializeDMControls() {
    const addDMButton = document.querySelector('.dm-add');
    if (addDMButton) {
        addDMButton.addEventListener('click', () => {
            const username = prompt('Enter username to start a conversation:');
            if (username) {
                const friend = friendManager.getFriendByUsername(username);
                if (friend) {
                    openChat(username);
                } else {
                    alert('User not found in your friends list.');
                }
            }
        });
    }
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all session data
        localStorage.removeItem('dominon_current_user');
        localStorage.removeItem('dominon_session_active');
        sessionStorage.clear();
        
        // Redirect to login page
        window.location.replace('index.html');
    }
}

function setupMessageTabs() {
    const tabButtons = document.querySelectorAll('.header-tabs .tab-btn');
    const messagesContainer = document.querySelector('.messages-container');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Get messages for the selected tab
            const tabType = button.dataset.tab;
            const messages = getMessagesByType(tabType);

            // Update messages container
            if (messages.length === 0) {
                messagesContainer.innerHTML = `
                    <div class="no-messages">
                        <i class="fas fa-inbox"></i>
                        <p>No ${tabType === 'requests' ? 'message requests' : tabType === 'spam' ? 'spam messages' : 'messages'}</p>
                        <span>${getEmptyStateMessage(tabType)}</span>
                    </div>
                `;
            } else {
                messagesContainer.innerHTML = messages.map(msg => createMessageElement(msg)).join('');
            }
        });
    });
}

function getMessagesByType(type) {
    // This will be replaced with real data from messageManager
    return [];
}

function getEmptyStateMessage(type) {
    switch(type) {
        case 'requests':
            return 'Message requests from people you haven\'t added will appear here';
        case 'spam':
            return 'Messages marked as spam will be shown here';
        default:
            return 'Start a conversation with your friends!';
    }
}

function createMessageElement(message) {
    // This will be replaced with real message rendering
    return '';
}

function setupExploreHandlers() {
    const searchInput = document.querySelector('.explore-content input');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const joinButtons = document.querySelectorAll('.join-btn');
    const createCommunityBtn = document.querySelector('.add-community-btn');

    // Category selection
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            // TODO: Load communities for selected category
        });
    });

    // Join community
    joinButtons.forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.community-card');
            const communityName = card.querySelector('h3').textContent;
            button.textContent = button.textContent === 'Join' ? 'Leave' : 'Join';
            // TODO: Implement join/leave functionality
        });
    });

    // Create community
    if (createCommunityBtn) {
        createCommunityBtn.addEventListener('click', () => {
            // TODO: Implement community creation
            alert('Community creation coming soon!');
        });
    }

    // Search
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            // TODO: Implement community search
            console.log('Searching communities:', e.target.value);
        });
    }
}