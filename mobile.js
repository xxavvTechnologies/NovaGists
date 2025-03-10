class MobileUIManager {
    constructor() {
        this.sidebar = document.getElementById('mobile-sidebar');
        this.menuBtn = document.getElementById('mobile-menu-btn');
        this.closeBtn = document.getElementById('mobile-close-btn');
        this.editor = document.getElementById('editor');
        this.notesList = document.getElementById('notes-list');
        this.mobileNotesList = document.getElementById('mobile-notes-list');
        
        this.setupEventListeners();
        this.setupTouchGestures();
        this.setupBottomNav();
        this.setupAuthHandlers();
    }

    setupEventListeners() {
        // Menu controls
        this.menuBtn?.addEventListener('click', () => this.openSidebar());
        this.closeBtn?.addEventListener('click', () => this.closeSidebar());
        
        // Handle backdrop clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mobile-sidebar-backdrop')) {
                this.closeSidebar();
            }
        });

        // Sync mobile search with main search
        const mobileSearch = document.getElementById('mobile-search');
        const mainSearch = document.getElementById('search-notes');
        
        mobileSearch?.addEventListener('input', (e) => {
            if (mainSearch) mainSearch.value = e.target.value;
            mainSearch.dispatchEvent(new Event('input'));
        });
    }

    setupTouchGestures() {
        let startX, startY, moved;

        // Add touch handlers to editor
        this.editor?.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            moved = false;
        }, { passive: true });

        this.editor?.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;
            
            const diffX = startX - e.touches[0].clientX;
            const diffY = startY - e.touches[0].clientY;
            
            // If horizontal swipe is greater than vertical, prevent scrolling
            if (Math.abs(diffX) > Math.abs(diffY)) {
                moved = true;
                e.preventDefault();
            }
        });

        this.editor?.addEventListener('touchend', (e) => {
            if (!moved) return;
            
            const diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) { // Minimum swipe distance
                if (diff > 0) {
                    // Swipe left - Close editor
                    document.querySelector('.close-btn')?.click();
                }
            }
            
            startX = null;
            startY = null;
            moved = false;
        });

        // Add swipe to delete/archive for note items
        document.querySelectorAll('.note-item').forEach(item => {
            this.addNoteItemGestures(item);
        });
    }

    addNoteItemGestures(item) {
        let startX, startY, moved;
        const actions = document.createElement('div');
        actions.className = 'note-item-swipe-actions';
        actions.innerHTML = `
            <button class="swipe-action delete">
                <i class="ri-delete-bin-line"></i>
            </button>
            <button class="swipe-action archive">
                <i class="ri-archive-line"></i>
            </button>
        `;
        
        item.appendChild(actions);

        item.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            moved = false;
        }, { passive: true });

        item.addEventListener('touchmove', (e) => {
            if (!startX) return;
            
            const diff = startX - e.touches[0].clientX;
            if (Math.abs(diff) > 10) {
                moved = true;
                item.style.transform = `translateX(${-diff}px)`;
            }
        });

        item.addEventListener('touchend', (e) => {
            if (!moved) return;
            
            const diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 100) {
                item.style.transform = 'translateX(-100px)';
                actions.classList.add('visible');
            } else {
                item.style.transform = '';
                actions.classList.remove('visible');
            }
            
            startX = null;
            moved = false;
        });
    }

    setupBottomNav() {
        const nav = document.createElement('nav');
        nav.className = 'mobile-bottom-nav';
        nav.innerHTML = `
            <a href="#" class="nav-item active">
                <i class="ri-file-list-line"></i>
                <span>Notes</span>
            </a>
            <a href="#" class="nav-item">
                <i class="ri-search-line"></i>
                <span>Search</span>
            </a>
            <button id="mobile-new-note" class="nav-item">
                <i class="ri-add-circle-line"></i>
                <span>New</span>
            </button>
            <a href="#" class="nav-item">
                <i class="ri-price-tag-3-line"></i>
                <span>Tags</span>
            </a>
            <a href="#" class="nav-item">
                <i class="ri-settings-3-line"></i>
                <span>Settings</span>
            </a>
        `;
        
        document.body.appendChild(nav);

        // Handle new note button
        document.getElementById('mobile-new-note')?.addEventListener('click', () => {
            document.getElementById('new-note')?.click();
        });
    }

    setupAuthHandlers() {
        const loginBtn = document.querySelector('.nova-login-btn');
        const mobileAuthContainer = document.createElement('div');
        mobileAuthContainer.className = 'mobile-auth-container';

        loginBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showMobileAuth();
        });

        // Add swipe to close for auth modal
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            let startY = 0;
            let currentTransform = 0;

            loginModal.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
            }, { passive: true });

            loginModal.addEventListener('touchmove', (e) => {
                const deltaY = e.touches[0].clientY - startY;
                if (deltaY > 0) { // Only allow swipe down
                    currentTransform = deltaY;
                    loginModal.style.transform = `translateY(${deltaY}px)`;
                    loginModal.style.opacity = 1 - (deltaY / window.innerHeight);
                }
            });

            loginModal.addEventListener('touchend', (e) => {
                if (currentTransform > 100) { // Threshold for closing
                    loginModal.style.transform = `translateY(100%)`;
                    setTimeout(() => {
                        loginModal.style.display = 'none';
                        loginModal.style.transform = '';
                        loginModal.style.opacity = '';
                    }, 300);
                } else {
                    loginModal.style.transform = '';
                    loginModal.style.opacity = '';
                }
                currentTransform = 0;
            });
        }
    }

    showMobileAuth() {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.style.display = 'flex';
            loginModal.querySelector('input')?.focus();
            
            // Add slide up animation
            loginModal.style.transform = 'translateY(100%)';
            requestAnimationFrame(() => {
                loginModal.style.transition = 'transform 0.3s ease-out';
                loginModal.style.transform = 'translateY(0)';
            });
        }
    }

    openSidebar() {
        this.sidebar?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeSidebar() {
        this.sidebar?.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    let mobileUI = null;
    
    function handleViewportChange(e) {
        if (window.matchMedia('(max-width: 768px)').matches) {
            if (!mobileUI) {
                mobileUI = new MobileUIManager();
            }
        } else {
            // Clean up mobile UI elements when switching to desktop
            if (mobileUI) {
                document.querySelector('.mobile-bottom-nav')?.remove();
                document.body.style.overflow = '';
                mobileUI = null;
            }
        }
    }

    // Initial check and setup viewport change listener
    handleViewportChange();
    window.matchMedia('(max-width: 768px)').addListener(handleViewportChange);
});
