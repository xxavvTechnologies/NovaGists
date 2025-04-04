class SearchModal {
    constructor() {
        this.createSearchModal();
        this.setupKeyboardListeners();
        this.currentMode = 'personal'; // 'personal' or 'community'
        this.debounceTimer = null;

        // Add search button handler
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.show());
        }
    }

    createSearchModal() {
        const modal = document.createElement('div');
        modal.className = 'search-modal';
        modal.id = 'searchModal';
        modal.innerHTML = `
            <div class="search-container">
                <div class="search-header">
                    <div class="search-input-wrapper">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchInput" placeholder="Search your gists..." />
                    </div>
                    <div class="search-mode">
                        <button class="mode-btn active" data-mode="personal">Personal</button>
                        <button class="mode-btn" data-mode="community">Community
                            <i class="fas fa-info-circle help-icon" title="Search public notes from the community"></i>
                        </button>
                    </div>
                </div>
                <div class="search-results" id="searchResults"></div>
            </div>
        `;
        document.body.appendChild(modal);

        this.modal = modal;
        this.input = modal.querySelector('#searchInput');
        this.results = modal.querySelector('#searchResults');
        
        // Setup mode switching
        modal.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchMode(btn.dataset.mode));
        });

        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hide();
        });

        // Setup info icon tooltip
        const helpIcon = modal.querySelector('.help-icon');
        helpIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open('https://help.novasuite.one/gists/community-search', '_blank');
        });
    }

    setupKeyboardListeners() {
        // Global shortcut (Cmd/Ctrl + K)
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                this.hide();
            }
        });

        // Search input handler
        this.input.addEventListener('input', () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.performSearch(), 300);
        });

        // Handle mobile keyboard
        if ('virtualKeyboard' in navigator) {
            navigator.virtualKeyboard.overlaysContent = true;
            navigator.virtualKeyboard.addEventListener('geometrychange', this.handleKeyboardChange.bind(this));
        } else {
            // Fallback for browsers without Virtual Keyboard API
            window.addEventListener('resize', this.handleResize.bind(this));
        }
    }

    handleKeyboardChange(event) {
        const keyboardHeight = event.target.boundingRect.height;
        this.modal.classList.toggle('keyboard-open', keyboardHeight > 0);
        if (keyboardHeight > 0) {
            this.results.style.maxHeight = `${window.innerHeight - keyboardHeight - 200}px`;
        } else {
            this.results.style.maxHeight = '';
        }
    }

    handleResize() {
        const wasKeyboardShown = window.innerHeight < window.outerHeight;
        this.modal.classList.toggle('keyboard-open', wasKeyboardShown);
        if (wasKeyboardShown) {
            this.results.style.maxHeight = `${window.innerHeight - 200}px`;
        } else {
            this.results.style.maxHeight = '';
        }
    }

    async performSearch() {
        const query = this.input.value.trim().toLowerCase();
        if (!query) {
            this.results.innerHTML = '';
            return;
        }

        const loadingId = notifications.loading('Searching...');
        try {
            let queryRef = db.collection('notes');
            
            if (this.currentMode === 'personal') {
                queryRef = queryRef.where('userId', '==', auth.currentUser.uid);
            } else {
                queryRef = queryRef.where('isPublic', '==', true);
            }

            const snapshot = await queryRef.get();
            const results = [];

            snapshot.forEach(doc => {
                const note = doc.data();
                const content = note.content.toLowerCase();
                const title = (note.title || '').toLowerCase();

                if (content.includes(query) || title.includes(query)) {
                    results.push({ id: doc.id, ...note });
                }
            });

            this.displayResults(results);
            notifications.updateLoading(loadingId, `Found ${results.length} results`);
        } catch (error) {
            console.error('Search error:', error);
            notifications.updateLoading(loadingId, 'Search failed', 'error');
        }
    }

    displayResults(results) {
        if (results.length === 0) {
            this.results.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No gists found</p>
                </div>
            `;
            return;
        }

        this.results.innerHTML = results.map(note => `
            <div class="search-result" data-id="${note.id}">
                <div class="result-header">
                    <h3>${note.title || 'Untitled'}</h3>
                    ${this.currentMode === 'community' ? 
                        `<span class="author">${note.authorName || 'Anonymous'}</span>` : ''}
                </div>
                <p class="result-preview">${this.truncateContent(note.content)}</p>
                <div class="result-meta">
                    <span class="date">${formatDate(note.timestamp)}</span>
                </div>
            </div>
        `).join('');

        // Add click handlers
        this.results.querySelectorAll('.search-result').forEach(result => {
            result.addEventListener('click', () => {
                const noteId = result.dataset.id;
                this.hide();
                openModal(noteId, results.find(r => r.id === noteId));
            });
        });
    }

    truncateContent(content) {
        const stripped = content.replace(/<[^>]*>/g, '');
        return stripped.length > 150 ? stripped.slice(0, 150) + '...' : stripped;
    }

    switchMode(mode) {
        this.currentMode = mode;
        const btns = this.modal.querySelectorAll('.mode-btn');
        btns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        this.input.placeholder = mode === 'personal' ? 
            'Search your gists...' : 
            'Search community gists...';
        this.performSearch();
    }

    toggle() {
        if (this.modal.style.display === 'flex') {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.modal.style.display = 'flex';
        this.input.value = '';
        this.input.focus();
        document.body.classList.add('modal-open');
        // Store the scroll position
        this.scrollPos = window.scrollY;
    }

    hide() {
        this.modal.style.display = 'none';
        this.results.innerHTML = '';
        document.body.classList.remove('modal-open');
        // Restore the scroll position
        window.scrollTo(0, this.scrollPos || 0);
    }
}
