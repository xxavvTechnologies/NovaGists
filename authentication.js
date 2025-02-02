let auth0 = null;

// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await configureAuth0();
        
        // Handle authentication redirect
        if (window.location.search.includes("code=") || 
            window.location.search.includes("state=")) {
            await handleAuthRedirect();
        }
        
        await updateUI();
        setupEventListeners();
    } catch (error) {
        console.error("Authentication initialization error:", error);
    }
});

const configureAuth0 = async () => {
    auth0 = await createAuth0Client({
        domain: "auth.novawerks.xxavvgroup.com",
        client_id: "RGfDMp59V4UhqLIBZYwVZqHQwKly3lQ3",
        redirect_uri: window.location.origin,
        useRefreshTokens: true,
        cacheLocation: "localstorage"
    });
};

const handleAuthRedirect = async () => {
    try {
        await auth0.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
        console.error("Error handling redirect:", error);
    }
};

const updateUI = async () => {
    try {
        const isAuthenticated = await auth0.isAuthenticated();
        
        // Create dropdown if it doesn't exist
        let dropdownMenu = document.getElementById('dropdown-menu');
        if (!dropdownMenu) {
            const userDropdown = document.createElement('div');
            userDropdown.className = 'user-dropdown';
            userDropdown.innerHTML = `
                <button id="profile-button" class="dropbtn">
                    <i class="fas fa-user-circle"></i>
                </button>
                <div id="dropdown-menu" class="dropdown-content"></div>
            `;
            document.querySelector('header .header-actions')?.insertBefore(
                userDropdown,
                document.querySelector('header .header-actions').firstChild
            );
            dropdownMenu = document.getElementById('dropdown-menu');
        }

        if (!dropdownMenu) return; // Safety check

        // Update dropdown content
        if (isAuthenticated) {
            const user = await auth0.getUser();
            dropdownMenu.innerHTML = `
                <div class="user-info">
                    <img src="${user.picture || 'default-avatar.png'}" alt="Avatar" class="user-avatar">
                    <span>${user.name || 'User'}</span>
                </div>
                <a href="#" id="logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
            
            // Setup logout handler
            document.getElementById('logout-btn')?.addEventListener('click', () => {
                auth0.logout({
                    returnTo: window.location.origin
                });
            });
        } else {
            dropdownMenu.innerHTML = `
                <a href="#" id="login-btn">
                    <i class="fas fa-sign-in-alt"></i> Login
                </a>
            `;
            
            // Setup login handler
            document.getElementById('login-btn')?.addEventListener('click', async () => {
                await auth0.loginWithRedirect();
            });
        }
    } catch (error) {
        console.error("Error updating UI:", error);
    }
};

const setupEventListeners = () => {
    // Handle dropdown toggle
    document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.user-dropdown');
        const dropdownMenu = document.getElementById('dropdown-menu');
        const profileButton = document.getElementById('profile-button');
        
        if (!dropdown || !dropdownMenu || !profileButton) return;

        if (e.target === profileButton || profileButton.contains(e.target)) {
            dropdownMenu.style.display = 
                dropdownMenu.style.display === 'block' ? 'none' : 'block';
        } else if (!dropdown.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });
};