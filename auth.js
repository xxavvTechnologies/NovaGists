import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js';
import { 
    getAuth, 
    signInWithPopup,
    GoogleAuthProvider,
    GithubAuthProvider,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAeNLHp2EO50B0PrZuBchOJvxhxHlVuVu4",
    authDomain: "novasuite-e4257.firebaseapp.com",
    projectId: "novasuite-e4257",
    storageBucket: "novasuite-e4257.appspot.com",
    messagingSenderId: "349176160657",
    appId: "1:349176160657:web:5eccf6cc8e49b315f63a30",
    measurementId: "G-P71MSVYL3V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize notifications if they exist
const NotificationSystem = window.NotificationSystem || {
    success: (msg) => console.log('Success:', msg),
    error: (msg) => console.error('Error:', msg)
};

// Auth Manager Class
class AuthManager {
    static async loginWithEmail(email, password) {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            this.updateUI(result.user);
            NotificationSystem.success('Logged in successfully');
            return result.user;
        } catch (error) {
            console.error('Email login failed:', error);
            NotificationSystem.error(error.message || 'Login failed');
            throw error;
        }
    }

    static async loginWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            this.updateUI(result.user);
            NotificationSystem.success('Logged in with Google');
            return result.user;
        } catch (error) {
            console.error('Google login failed:', error);
            NotificationSystem.error(error.message || 'Google login failed');
            throw error;
        }
    }

    static async loginWithGithub() {
        try {
            const provider = new GithubAuthProvider();
            const result = await signInWithPopup(auth, provider);
            this.updateUI(result.user);
            NotificationSystem.success('Logged in with GitHub');
            return result.user;
        } catch (error) {
            console.error('GitHub login failed:', error);
            NotificationSystem.error(error.message || 'GitHub login failed');
            throw error;
        }
    }

    static async logout() {
        try {
            await signOut(auth);
            this.updateUI(null);
            NotificationSystem.success('Logged out successfully');
        } catch (error) {
            console.error('Logout failed:', error);
            NotificationSystem.error(error.message || 'Logout failed');
            throw error;
        }
    }

    static updateUI(user) {
        const authButtons = document.getElementById('auth-buttons');
        const userProfile = document.getElementById('user-profile');
        const userAvatar = document.getElementById('user-avatar');
        const welcomeMessage = document.getElementById('welcome-message');
        const loginModal = document.getElementById('loginModal');

        if (user) {
            authButtons.classList.add('hidden');
            userProfile.classList.remove('hidden');
            userAvatar.src = user.photoURL || 'https://d2zcpib8duehag.cloudfront.net/default-avatar.png';
            welcomeMessage.textContent = `Welcome, ${user.displayName || user.email}`;
            loginModal.style.display = 'none';
        } else {
            authButtons.classList.remove('hidden');
            userProfile.classList.add('hidden');
            userAvatar.src = '';
            welcomeMessage.textContent = '';
        }
    }

    static init() {
        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => this.updateUI(user));

        // Setup event listeners
        const loginForm = document.getElementById('loginForm');
        const googleAuthBtn = document.getElementById('google-auth-btn');
        const githubAuthBtn = document.getElementById('github-auth-btn');
        const signOutBtn = document.getElementById('sign-out-btn');

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                await this.loginWithEmail(email, password);
                loginForm.reset();
            } catch (error) {
                // Error is already handled in loginWithEmail
            }
        });

        googleAuthBtn?.addEventListener('click', () => this.loginWithGoogle());
        githubAuthBtn?.addEventListener('click', () => this.loginWithGithub());
        signOutBtn?.addEventListener('click', () => this.logout());
    }
}

// Initialize auth when DOM is ready
document.addEventListener('DOMContentLoaded', () => AuthManager.init());

export default AuthManager;
