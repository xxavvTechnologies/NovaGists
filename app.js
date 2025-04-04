// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAeNLHp2EO50B0PrZuBchOJvxhxHlVuVu4",
    authDomain: "novasuite-e4257.firebaseapp.com",
    databaseURL: "https://novasuite-e4257-default-rtdb.firebaseio.com",
    projectId: "novasuite-e4257",
    storageBucket: "novasuite-e4257.firebasestorage.app",
    messagingSenderId: "349176160657",
    appId: "1:349176160657:web:5eccf6cc8e49b315f63a30",
    measurementId: "G-P71MSVYL3V"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Initialize providers
const googleProvider = new firebase.auth.GoogleAuthProvider();
const githubProvider = new firebase.auth.GithubAuthProvider();

// DOM Elements
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const authForm = document.getElementById('authForm');
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const signOutBtn = document.getElementById('signOutBtn');
const noteTitle = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const addNoteBtn = document.getElementById('addNoteBtn');
const notesGrid = document.getElementById('notesGrid');

// Additional DOM Elements
const googleAuthBtn = document.getElementById('googleAuthBtn');
const githubAuthBtn = document.getElementById('githubAuthBtn');
const userAvatar = document.getElementById('userAvatar');

// Modal Elements
const editModal = document.getElementById('editModal');
const editTitle = document.getElementById('editTitle');
const editContent = document.getElementById('editContent');
const saveEditBtn = document.getElementById('saveEdit');
const cancelEditBtn = document.getElementById('cancelEdit');
const closeModalBtn = document.querySelector('.close-modal');

let currentEditId = null;
let astroAI;

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful');
        }).catch(err => {
            console.error('ServiceWorker registration failed:', err);
        });
    });
}

// Initialize services
window.addEventListener('load', () => {
    astroAI = new AstroAI();
});

// Add mobile touch handlers
function setupMobileHandlers() {
    // Enable passive event listeners for better scroll performance
    document.addEventListener('touchstart', {}, { passive: true });
    document.addEventListener('touchmove', {}, { passive: true });

    // Add pull-to-refresh prevention
    document.body.addEventListener('touchmove', (e) => {
        if (window.scrollY === 0) {
            e.preventDefault();
        }
    }, { passive: false });

    // Handle PWA display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.body.classList.add('standalone');
    }
}

// Initialize mobile handlers
setupMobileHandlers();

// Auth state observer
auth.onAuthStateChanged(user => {
    if (user) {
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        updateUserUI(user);
        loadNotes();
        // Initialize the editor after the containers are visible
        window.editor = new RichTextEditor();
        window.search = new SearchModal(); // Initialize search

        // Add mobile initialization
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    // Request persistent storage for offline support
                    if (navigator.storage && navigator.storage.persist) {
                        navigator.storage.persist();
                    }
                });
        }
        setupWelcomeBanner(); // Add this line
    } else {
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
        userAvatar.src = '';
    }
});

// Welcome banner logic
function setupWelcomeBanner() {
    const welcomeBanner = document.getElementById('welcomeBanner');
    const closeBannerBtn = welcomeBanner.querySelector('.close-banner');
    
    // Check if user has seen this version's banner
    const hasSeenBanner = localStorage.getItem('novaGists_v3.1_banner_dismissed');
    
    if (!hasSeenBanner) {
        welcomeBanner.style.display = 'flex';
    }
    
    closeBannerBtn.addEventListener('click', () => {
        welcomeBanner.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => {
            welcomeBanner.style.display = 'none';
        }, 300);
        localStorage.setItem('novaGists_v3.1_banner_dismissed', 'true');
    });
}

// Update user UI
function updateUserUI(user) {
    const avatar = user.photoURL || 'https://www.gravatar.com/avatar/?d=mp';
    userAvatar.src = avatar;
    document.getElementById('menuAvatar').src = avatar;
    document.getElementById('userName').textContent = user.displayName || 'User';
    document.getElementById('userEmail').textContent = user.email;
}

// Add dropdown toggle functionality
const profileDropdown = document.querySelector('.profile-dropdown');
userAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
    profileDropdown.classList.remove('active');
});

// Prevent dropdown from closing when clicking inside
document.querySelector('.dropdown-menu').addEventListener('click', (e) => {
    e.stopPropagation();
});

// Add loading states
function setLoading(isLoading) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = isLoading;
        if (isLoading) {
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    });
}

// Auth form handler
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(true);
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error('Sign in error:', error.message);
        const errorMessages = {
            'auth/user-not-found': 'No Nova ID found with this email. Create one at account.novasuite.one',
            'auth/wrong-password': 'Incorrect password for this Nova ID',
            'auth/invalid-email': 'Please enter a valid email address'
        };
        alert(errorMessages[error.code] || error.message);
    }
    setLoading(false);
});

// Sign up handler
signUpBtn?.remove(); // Remove the sign up button since we're not using it

// Google auth handler
googleAuthBtn.addEventListener('click', async () => {
    const loadingId = notifications.loading('Signing in with Google...');
    try {
        await auth.signInWithPopup(googleProvider);
        notifications.updateLoading(loadingId, 'Signed in successfully!');
    } catch (error) {
        console.error('Google sign in error:', error.message);
        if (error.code === 'auth/popup-closed-by-user') {
            notifications.updateLoading(loadingId, 'Sign in cancelled', 'info');
        } else {
            notifications.updateLoading(loadingId, 'Failed to sign in with Google', 'error');
        }
    }
});

// GitHub auth handler
githubAuthBtn.addEventListener('click', async () => {
    const loadingId = notifications.loading('Signing in with GitHub...');
    try {
        await auth.signInWithPopup(githubProvider);
        notifications.updateLoading(loadingId, 'Signed in successfully!');
    } catch (error) {
        console.error('GitHub sign in error:', error.message);
        if (error.code === 'auth/popup-closed-by-user') {
            notifications.updateLoading(loadingId, 'Sign in cancelled', 'info');
        } else {
            notifications.updateLoading(loadingId, 'Failed to sign in with GitHub', 'error');
        }
    }
});

// Sign out handler
signOutBtn.addEventListener('click', () => auth.signOut());

// Remove addNoteBtn event listener and add autosave functionality
let autoSaveTimeout;
const AUTOSAVE_DELAY = 1000; // 1 second delay

function handleInputChange() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(saveNote, AUTOSAVE_DELAY);
    autoResizeTextarea(this); // Add auto-resize on input
}

noteTitle.addEventListener('input', handleInputChange);
noteContent.addEventListener('input', handleInputChange);

async function saveNote() {
    if (!window.editor) return;
    
    const title = noteTitle.value.trim();
    const content = window.editor.sanitize(window.editor.getContent());
    
    if (!content) {
        notifications.warning('Please write something before saving');
        return;
    }

    const tempId = Date.now().toString();
    const noteData = {
        userId: auth.currentUser.uid,
        title,
        content,
        timestamp: Date.now()
    };

    addNoteToUI(tempId, noteData);
    
    const loadingId = notifications.loading('Saving gist...');
    try {
        const serverNote = {
            ...noteData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('notes').add(serverNote);
        notifications.updateLoading(loadingId, 'Gist saved successfully');
        
        // Clear inputs
        noteTitle.value = '';
        window.editor.clearContent();
        
        loadNotes();
    } catch (error) {
        console.error('Save note error:', error.message);
        notifications.updateLoading(loadingId, 'Failed to save gist', 'error');
        document.getElementById(`note-${tempId}`)?.remove();
    }
}

// Update note display functions to handle both Date objects and timestamps
function formatDate(timestamp) {
    if (!timestamp) return 'Just now';
    
    // Handle Firestore Timestamp
    if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
    }
    
    // Handle regular timestamps
    return new Date(timestamp).toLocaleDateString();
}

// Update addNoteToUI to handle optional titles and add click handler
function addNoteToUI(id, note) {
    const noteElement = document.createElement('div');
    noteElement.className = 'note';
    noteElement.id = `note-${id}`;
    
    // Store note data for editing
    noteElement.dataset.note = JSON.stringify(note);
    
    noteElement.innerHTML = `
        <div class="note-header">
            ${note.title ? `<h3>${note.title}</h3>` : ''}
            <button class="btn btn-icon delete-btn" onclick="event.stopPropagation(); deleteNote('${id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="note-content content-preview">${note.content}</div>
        <div class="note-footer">
            <span class="note-date">${formatDate(note.timestamp)}</span>
        </div>
    `;
    
    // Add click handler for editing
    noteElement.addEventListener('click', () => {
        openModal(id, note);
    });
    
    notesGrid.insertBefore(noteElement, notesGrid.firstChild);
}

// Load notes
async function loadNotes() {
    notesGrid.innerHTML = '';
    
    try {
        const snapshot = await db.collection('notes')
            .where('userId', '==', auth.currentUser.uid)
            .orderBy('timestamp', 'desc')
            .get();

        snapshot.forEach(doc => {
            const note = doc.data();
            const noteElement = document.createElement('div');
            noteElement.className = 'note';
            noteElement.id = `note-${doc.id}`;
            noteElement.dataset.note = JSON.stringify(note);
            noteElement.innerHTML = `
                <div class="note-header">
                    ${note.title ? `<h3>${note.title}</h3>` : ''}
                    <button class="btn btn-icon delete-btn" onclick="event.stopPropagation(); deleteNote('${doc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="note-content content-preview">${note.content}</div>
                <div class="note-footer">
                    <span class="note-date">${formatDate(note.timestamp)}</span>
                </div>
            `;
            
            noteElement.addEventListener('click', () => {
                openModal(doc.id, note);
            });
            
            notesGrid.appendChild(noteElement);
        });
    } catch (error) {
        console.error('Load notes error:', error.message);
    }
}

// Delete note
async function deleteNote(noteId) {
    const loadingId = notifications.loading('Deleting gist...');
    try {
        await db.collection('notes').doc(noteId).delete();
        notifications.updateLoading(loadingId, 'Gist deleted successfully');
        loadNotes();
    } catch (error) {
        console.error('Delete note error:', error.message);
        notifications.updateLoading(loadingId, 'Failed to delete gist', 'error');
    }
}

// Modal handlers
function openModal(id, note) {
    if (!window.editor) return;
    
    currentEditId = id;
    editTitle.value = note.title || '';
    document.getElementById('isPublic').checked = note.isPublic || false;
    window.editor.setModalContent(note.content || '');
    currentTags = note.tags || [];
    renderTags();
    editModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const originalNote = JSON.parse(document.getElementById(`note-${currentEditId}`).dataset.note);
    const hasChanges = originalNote.title !== editTitle.value || originalNote.content !== editContent.value;
    
    if (hasChanges) {
        notifications.info('Changes discarded');
    }
    
    editModal.style.display = 'none';
    document.body.style.overflow = '';
    currentEditId = null;
}

[closeModalBtn, cancelEditBtn].forEach(btn => {
    btn.addEventListener('click', closeModal);
});

window.addEventListener('click', (e) => {
    if (e.target === editModal) closeModal();
});

// Save edit handler
saveEditBtn.addEventListener('click', async () => {
    if (!currentEditId || !window.editor) return;
    
    const content = window.editor.sanitize(window.editor.getModalContent());
    if (!content) {
        notifications.warning('Please write something before saving');
        return;
    }

    const loadingId = notifications.loading('Updating gist...');
    
    try {
        const updatedNote = {
            title: editTitle.value.trim(),
            content: content,
            isPublic: document.getElementById('isPublic').checked,
            tags: currentTags,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add AI analysis if enabled
        if (document.getElementById('enableAI').checked) {
            try {
                const analysis = await astroAI.analyze(content);
                updatedNote.aiInsights = analysis;
                
                // Add insights to the modal
                const aiContainer = document.createElement('div');
                aiContainer.innerHTML = astroAI.formatInsights(analysis);
                document.querySelector('.modal-body').appendChild(aiContainer);
            } catch (error) {
                console.error('AI analysis failed:', error);
                notifications.warning('AI analysis failed, saving note without insights');
            }
        }

        await db.collection('notes').doc(currentEditId).update(updatedNote);
        notifications.updateLoading(loadingId, 'Gist updated successfully');
        closeModal();
        loadNotes();
    } catch (error) {
        console.error('Update note error:', error);
        notifications.updateLoading(loadingId, 'Failed to update gist', 'error');
    }
});

// Add auto-resize functionality for textareas
function autoResizeTextarea() {} // No-op

// Add resize listeners to textareas
[noteContent, editContent].forEach(textarea => {
    if (!textarea) return;
    
    // Initial size adjustment
    autoResizeTextarea(textarea);
    
    // Resize on input
    textarea.addEventListener('input', () => autoResizeTextarea(textarea));
    
    // Resize on window resize
    window.addEventListener('resize', () => autoResizeTextarea(textarea));
});

// Tag Management
const tagInput = document.getElementById('tagInput');
const tagsList = document.getElementById('tagsList');
let currentTags = [];

tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const tag = tagInput.value.trim().toLowerCase();
        if (tag && !currentTags.includes(tag)) {
            currentTags.push(tag);
            renderTags();
        }
        tagInput.value = '';
    }
});

function renderTags() {
    tagsList.innerHTML = currentTags.map(tag => `
        <span class="tag">
            #${tag}
            <button onclick="removeTag('${tag}')" class="remove-tag">×</button>
        </span>
    `).join('');
}

function removeTag(tag) {
    currentTags = currentTags.filter(t => t !== tag);
    renderTags();
}

// Export to PDF
document.getElementById('exportPDF').addEventListener('click', async () => {
    const loadingId = notifications.loading('Generating PDF...');
    try {
        const content = window.editor.getModalContent();
        const title = editTitle.value;
        
        const response = await fetch('/.netlify/functions/generate-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, title })
        });
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'gist'}.pdf`;
        a.click();
        
        notifications.updateLoading(loadingId, 'PDF downloaded successfully');
    } catch (error) {
        console.error('PDF generation failed:', error);
        notifications.updateLoading(loadingId, 'Failed to generate PDF', 'error');
    }
});

// Share via URL
document.getElementById('shareLink').addEventListener('click', async () => {
    if (!document.getElementById('isPublic').checked) {
        notifications.warning('Make the gist public first to share it');
        return;
    }
    
    const shareUrl = `${window.location.origin}/gist/${currentEditId}`;
    try {
        await navigator.clipboard.writeText(shareUrl);
        notifications.success('Share link copied to clipboard');
    } catch (error) {
        notifications.error('Failed to copy share link');
        console.error('Share link copy failed:', error);
    }
});
