// User data storage
let users = [];

// Load users from localStorage or create empty array
function loadUsers() {
    const storedUsers = localStorage.getItem('dominon_users');
    users = storedUsers ? JSON.parse(storedUsers) : [];
}

// Save users to localStorage
function saveUsers() {
    localStorage.setItem('dominon_users', JSON.stringify(users));
}

// Initialize
loadUsers();

function showMessage(message, isError = false) {
    const formContainer = document.querySelector('.form-container:not(.hidden)');
    const existingMessage = formContainer.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageElement = document.createElement('p');
    messageElement.className = `message ${isError ? 'error-message' : 'success-message'}`;
    messageElement.textContent = message;
    formContainer.appendChild(messageElement);

    // Clear message after 3 seconds
    setTimeout(() => messageElement.remove(), 3000);
}

function handleLogin(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Clear any existing sessions first
    localStorage.removeItem('dominon_current_user');
    localStorage.removeItem('dominon_session_active');

    // Simulate network delay for better UX
    setTimeout(() => {
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            try {
                // Create new session
                const sessionData = {
                    username: user.username,
                    email: user.email,
                    sessionToken: Date.now(),
                    isAuthenticated: true,
                    lastActive: Date.now()
                };
                
                localStorage.setItem('dominon_current_user', JSON.stringify(sessionData));
                localStorage.setItem('dominon_session_active', 'true');
                
                showMessage('Login successful! Redirecting...', false);
                
                // Use replace to prevent back navigation
                setTimeout(() => {
                    window.location.replace('chat.html');
                }, 1500);
            } catch (error) {
                console.error('Session creation failed:', error);
                showMessage('Error creating session. Please try again.', true);
                submitBtn.classList.remove('loading');
            }
        } else {
            showMessage('Invalid email or password', true);
            submitBtn.classList.remove('loading');
        }
    }, 800);
}

function handleRegister(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Simulate network delay for better UX
    setTimeout(() => {
        // Validation
        if (password !== confirmPassword) {
            showMessage('Passwords do not match', true);
            submitBtn.classList.remove('loading');
            return;
        }

        if (users.some(u => u.email === email)) {
            showMessage('Email already registered', true);
            submitBtn.classList.remove('loading');
            return;
        }

        if (users.some(u => u.username === username)) {
            showMessage('Username already taken', true);
            submitBtn.classList.remove('loading');
            return;
        }

        // Add new user
        users.push({
            username,
            email,
            password,
            createdAt: new Date().toISOString()
        });

        saveUsers();
        showMessage('Registration successful! Please login.', false);
        setTimeout(() => {
            submitBtn.classList.remove('loading');
            toggleForms();
        }, 1000);
    }, 800);
}

function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    loginForm.classList.toggle('hidden');
    registerForm.classList.toggle('hidden');
    
    // Clear any existing messages
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());
    
    // Clear form inputs
    document.querySelectorAll('input').forEach(input => input.value = '');
}
