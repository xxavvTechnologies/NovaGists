document.addEventListener('DOMContentLoaded', () => {
    // Add constants at the top
    const NOTE_LIMIT = 1000;
    const NOTE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB limit

    // Notification System
    class NotificationSystem {
        static DURATION = 3000; // Default duration in milliseconds
        static container = null;

        static initialize() {
            // Try to get existing container
            this.container = document.getElementById('notification-container');
            
            // Create container if it doesn't exist
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'notification-container';
                document.body.appendChild(this.container);
            }
        }

        static show(message, type = 'info', duration = this.DURATION) {
            try {
                // Initialize if not already done
                if (!this.container) {
                    this.initialize();
                }

                const notification = document.createElement('div');
                notification.className = `notification ${type}`;
                
                const iconMap = {
                    success: 'check-circle',
                    error: 'exclamation-circle',
                    warning: 'exclamation-triangle',
                    info: 'info-circle'
                };

                notification.innerHTML = `
                    <i class="fas fa-${iconMap[type]} notification-icon"></i>
                    <div class="notification-message">${message}</div>
                    <i class="fas fa-times notification-close"></i>
                `;

                this.container.appendChild(notification);

                // Show notification with animation
                setTimeout(() => notification.classList.add('show'), 10);

                // Setup close button
                const closeBtn = notification.querySelector('.notification-close');
                closeBtn.addEventListener('click', () => this.close(notification));

                // Auto close after duration
                if (duration > 0) {
                    setTimeout(() => this.close(notification), duration);
                }
            } catch (error) {
                console.error('Error showing notification:', error);
                // Fallback to console
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        }

        static close(notification) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }

        static success(message, duration) {
            this.show(message, 'success', duration);
        }

        static error(message, duration) {
            this.show(message, 'error', duration);
        }

        static warning(message, duration) {
            this.show(message, 'warning', duration);
        }

        static info(message, duration) {
            this.show(message, 'info', duration);
        }
    }

    // Add right after the NotificationSystem class
    class ContextMenu {
        static menu = null;

        static initialize() {
            // Create context menu element if it doesn't exist
            if (!this.menu) {
                this.menu = document.createElement('div');
                this.menu.className = 'context-menu';
                document.body.appendChild(this.menu);

                // Close menu on window click
                document.addEventListener('click', () => this.hide());
                document.addEventListener('scroll', () => this.hide());
                window.addEventListener('resize', () => this.hide());
            }
        }

        static show(e, items) {
            e.preventDefault();
            this.hide();

            // Position menu at cursor
            this.menu.style.left = `${e.pageX}px`;
            this.menu.style.top = `${e.pageY}px`;

            // Create menu items
            this.menu.innerHTML = items.map(item => `
                <div class="context-menu-item ${item.disabled ? 'disabled' : ''}" 
                     ${item.disabled ? '' : 'data-action="' + item.action + '"'}>
                    <i class="fas fa-${item.icon}"></i>
                    ${item.label}
                </div>
            `).join('');

            // Show menu
            this.menu.style.display = 'block';

            // Adjust position if menu goes off screen
            const bounds = this.menu.getBoundingClientRect();
            if (bounds.right > window.innerWidth) {
                this.menu.style.left = `${e.pageX - bounds.width}px`;
            }
            if (bounds.bottom > window.innerHeight) {
                this.menu.style.top = `${e.pageY - bounds.height}px`;
            }

            // Add click handlers
            this.menu.querySelectorAll('.context-menu-item:not(.disabled)').forEach(item => {
                item.addEventListener('click', () => {
                    const action = item.dataset.action;
                    if (action) {
                        this.handleAction(action, e.target.closest('.note-item'));
                    }
                    this.hide();
                });
            });
        }

        static hide() {
            if (this.menu) {
                this.menu.style.display = 'none';
            }
        }

        static handleAction(action, noteItem) {
            if (!noteItem) return;
            
            const noteId = parseInt(noteItem.dataset.id);
            
            switch (action) {
                case 'pin':
                    NotesManager.pinNote(noteId);
                    break;
                case 'lock':
                    showLockNoteModal(noteId);
                    break;
                case 'delete':
                    if (confirm('Are you sure you want to delete this note?')) {
                        NotesManager.deleteNote(noteId);
                        if (currentNoteId === noteId) {
                            editor.innerHTML = '';
                            titleInput.value = '';
                            currentNoteId = null;
                        }
                    }
                    break;
                case 'duplicate':
                    const notes = NotesManager.getNotes();
                    const note = notes[noteId];
                    if (note) {
                        const newNote = {
                            id: Date.now(),
                            title: `${note.title} (Copy)`,
                            content: note.content,
                            lastEdited: new Date().toISOString()
                        };
                        notes[newNote.id] = newNote;
                        NotesManager.saveNotes(notes);
                        NotificationSystem.success('Note duplicated');
                    }
                    break;
                case 'export':
                    exportNote('txt');
                    break;
            }
        }
    }

    // Initialize notification system when DOM is ready
    NotificationSystem.initialize();

    // Initialize context menu in the main initialization
    ContextMenu.initialize(); // Add this line

    // Initialize elements with null checks
    const editor = document.getElementById('editor');
    const titleInput = document.getElementById('note-title');
    const notesList = document.getElementById('notes-list');
    const deleteNoteBtn = document.getElementById('delete-note');
    const newNoteBtn = document.getElementById('new-note');
    const saveNoteBtn = document.getElementById('save-note');
    const searchInput = document.getElementById('search-notes');
    const lastEditedSpan = document.getElementById('last-edited');
    const noteEditor = document.getElementById('note-editor');

    // Exit if required elements are missing
    if (!editor || !notesList || !newNoteBtn) {
        console.error('Required elements not found');
        return;
    }

    let currentNoteId = null;
    let saveTimeout;

    class NotesManager {
        static STORAGE_KEY = 'novaGists'; // Changed from 'novaNotes'
        
        static createNote() {
            const note = {
                id: Date.now(),
                title: 'Untitled Note',
                content: '',
                lastEdited: new Date().toISOString()
            };
            
            const notes = this.getNotes();
            notes[note.id] = note;
            this.saveNotes(notes);
            return note;
        }

        static getNotes() {
            try {
                const notes = localStorage.getItem(this.STORAGE_KEY);
                return notes ? JSON.parse(notes) : {};
            } catch (error) {
                console.error('Error loading notes:', error);
                return {};
            }
        }

        static saveNotes(notes) {
            try {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notes));
                this.renderNotesList();
                return true;
            } catch (error) {
                console.error('Error saving notes:', error);
                return false;
            }
        }

        static validateNote(note) {
            return {
                id: parseInt(note.id) || Date.now(),
                title: (note.title || '').trim() || 'Untitled Note',
                content: note.content || '',
                lastEdited: note.lastEdited || new Date().toISOString(),
                pinned: !!note.pinned,
                locked: !!note.locked,
                passwordHash: note.passwordHash || null,
                tags: Array.isArray(note.tags) ? note.tags : [],
                versions: Array.isArray(note.versions) ? note.versions : []
            };
        }

        static saveCurrentNote() {
            if (!currentNoteId) return false;
            
            try {
                const notes = this.getNotes();
                const title = titleInput.value.trim() || 'Untitled Note';
                const content = editor.innerHTML;
                
                // Validate content size
                if (content.length > 1000000) { // 1MB limit
                    NotificationSystem.error('Note is too large');
                    return false;
                }

                // Clean and validate note object
                const note = this.validateNote({
                    id: currentNoteId,
                    title,
                    content,
                    lastEdited: new Date().toISOString()
                });

                notes[currentNoteId] = note;

                if (this.saveNotes(notes)) {
                    NotificationSystem.success('Note saved');
                    updateLastEdited();
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Error saving note:', error);
                NotificationSystem.error('Failed to save note');
                return false;
            }
        }

        static deleteNote(id) {
            const notes = this.getNotes();
            delete notes[id];
            this.saveNotes(notes);
            NotificationSystem.info('Note deleted');
        }

        static getPreview(content) {
            const div = document.createElement('div');
            div.innerHTML = content;
            const text = div.textContent || div.innerText || '';
            const words = text.trim().split(/\s+/);
            
            // Limit to 15 words on desktop, 8 on mobile
            const limit = window.innerWidth <= 768 ? 8 : 15;
            const preview = words.slice(0, limit).join(' ');
            
            return preview + (words.length > limit ? '...' : '');
        }

        static renderNotesList() {
            const notes = Object.values(this.getNotes());
            notes.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return new Date(b.lastEdited) - new Date(a.lastEdited);
            });

            notesList.innerHTML = notes.length ? notes.map(note => `
                <div class="note-item ${note.pinned ? 'pinned' : ''} ${note.locked ? 'locked' : ''} ${note.id === currentNoteId ? 'active' : ''}" 
                     data-id="${note.id}">
                    <div class="note-item-title">${note.title || 'Untitled Note'}</div>
                    <div class="note-item-preview">${this.getPreview(note.content)}</div>
                    <div class="note-item-date">Edited ${new Date(note.lastEdited).toLocaleString()}</div>
                    <div class="note-item-actions">
                        <button class="pin-btn" title="Pin note">
                            <i class="fas ${note.pinned ? 'fa-thumbtack' : 'fa-thumbtack'}"></i>
                        </button>
                        ${!note.locked ? `
                            <button class="lock-btn" title="Lock note">
                                <i class="fas fa-lock"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('') : '<div class="empty-notes">No notes yet</div>';

            // Add context menu event listeners
            document.querySelectorAll('.note-item').forEach(noteItem => {
                noteItem.addEventListener('contextmenu', (e) => {
                    const noteId = parseInt(noteItem.dataset.id);
                    const notes = this.getNotes();
                    const note = notes[noteId];
                    
                    ContextMenu.show(e, [
                        {
                            label: note.pinned ? 'Unpin' : 'Pin',
                            icon: 'thumbtack',
                            action: 'pin'
                        },
                        {
                            label: note.locked ? 'Locked' : 'Lock',
                            icon: 'lock',
                            action: 'lock',
                            disabled: note.locked
                        },
                        {
                            label: 'Duplicate',
                            icon: 'copy',
                            action: 'duplicate'
                        },
                        {
                            label: 'Export',
                            icon: 'file-export',
                            action: 'export'
                        },
                        {
                            label: 'Delete',
                            icon: 'trash',
                            action: 'delete'
                        }
                    ]);
                });
            });
        }

        static async lockNote(id, password) {
            const notes = this.getNotes();
            const note = notes[id];
            if (!note) return false;

            const hashedPassword = await NoteSecurityManager.hashPassword(password);
            note.locked = true;
            note.passwordHash = hashedPassword;
            return this.saveNotes(notes);
        }

        static async unlockNote(id, password) {
            const notes = this.getNotes();
            const note = notes[id];
            if (!note || !note.locked) return false;

            return await NoteSecurityManager.verifyPassword(password, note.passwordHash);
        }

        static togglePin(id) {
            const notes = this.getNotes();
            const note = notes[id];
            if (note) {
                note.pinned = !note.pinned;
                this.saveNotes(notes);
                return true;
            }
            return false;
        }

        static addTag(noteId, tag) {
            const notes = this.getNotes();
            const note = notes[noteId];
            if (note) {
                note.tags = note.tags || [];
                if (!note.tags.includes(tag)) {
                    note.tags.push(tag);
                    this.saveNotes(notes);
                }
            }
        }

        static createVersion(noteId) {
            const notes = this.getNotes();
            const note = notes[noteId];
            if (note) {
                note.versions = note.versions || [];
                note.versions.push({
                    content: note.content,
                    title: note.title,
                    timestamp: new Date().toISOString()
                });
                this.saveNotes(notes);
            }
        }

        static validateNoteLimit() {
            const notes = Object.keys(this.getNotes());
            return notes.length < NOTE_LIMIT;
        }

        static validateNoteSize(content) {
            const size = new Blob([content]).size;
            return size <= NOTE_SIZE_LIMIT;
        }

        static createNote() {
            if (!this.validateNoteLimit()) {
                NotificationSystem.error(`Note limit of ${NOTE_LIMIT} reached`);
                return null;
            }

            const note = {
                id: Date.now(),
                title: 'Untitled Note',
                content: '',
                lastEdited: new Date().toISOString(),
                tags: [],
                pinned: false,
                locked: false
            };
            
            const notes = this.getNotes();
            notes[note.id] = note;
            this.saveNotes(notes);
            return note;
        }

        static saveCurrentNote() {
            if (!currentNoteId) return false;
            
            try {
                const content = editor.innerHTML;
                
                if (!this.validateNoteSize(content)) {
                    NotificationSystem.error('Note is too large (max 5MB)');
                    return false;
                }

                // Create a version before saving
                this.createVersion(currentNoteId);

                const notes = this.getNotes();
                const note = this.validateNote({
                    id: currentNoteId,
                    title: titleInput.value.trim() || 'Untitled Note',
                    content: content,
                    lastEdited: new Date().toISOString(),
                    tags: notes[currentNoteId]?.tags || [],
                    pinned: notes[currentNoteId]?.pinned || false,
                    locked: notes[currentNoteId]?.locked || false,
                    passwordHash: notes[currentNoteId]?.passwordHash
                });

                notes[currentNoteId] = note;
                
                if (this.saveNotes(notes)) {
                    NotificationSystem.success('Note saved');
                    updateLastEdited();
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Error saving note:', error);
                NotificationSystem.error('Failed to save note');
                return false;
            }
        }
    }

    // Auto-save functionality
    function setupAutoSave() {
        const autoSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                if (currentNoteId) {
                    NotesManager.saveCurrentNote();
                }
            }, 1000);
        };

        editor?.addEventListener('input', autoSave);
        titleInput?.addEventListener('input', autoSave);
    }

    // Manual save
    saveNoteBtn?.addEventListener('click', () => {
        if (NotesManager.saveCurrentNote()) {
            NotificationSystem.success('Note saved manually');
        } else {
            NotificationSystem.error('Failed to save note');
        }
    });

    function updateLastEdited(date = new Date()) {
        const formattedDate = date.toLocaleString();
        // For note cards
        if (currentNoteId) {
            const noteItem = document.querySelector(`.note-item[data-id="${currentNoteId}"]`);
            if (noteItem) {
                let lastEdited = noteItem.querySelector('.note-item-date');
                if (!lastEdited) {
                    lastEdited = document.createElement('div');
                    lastEdited.className = 'note-item-date';
                    noteItem.appendChild(lastEdited);
                }
                lastEdited.textContent = `Edited ${formattedDate}`;
            }
        }
    }

    function loadNote(id) {
        const notes = NotesManager.getNotes();
        const note = notes[id];
        if (note) {
            currentNoteId = id;
            titleInput.value = note.title;
            editor.innerHTML = note.content;
            showNoteEditor(note);
            updateLastEdited(new Date(note.lastEdited));
            NotesManager.renderNotesList(); // Update active state
        }
    }

    // Event Listeners
    newNoteBtn.addEventListener('click', () => {
        const note = NotesManager.createNote();
        loadNote(note.id);
        titleInput?.focus();
    });

    deleteNoteBtn?.addEventListener('click', () => {
        if (currentNoteId && confirm('Are you sure you want to delete this note?')) {
            NotesManager.deleteNote(currentNoteId);
            currentNoteId = null;
            editor.innerHTML = '';
            titleInput.value = '';
            NotesManager.renderNotesList();
        }
    });

    notesList.addEventListener('click', (e) => {
        const noteItem = e.target.closest('.note-item');
        if (noteItem) {
            loadNote(parseInt(noteItem.dataset.id));
        }
    });

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.note-item').forEach(item => {
            const title = item.querySelector('.note-item-title').textContent.toLowerCase();
            const preview = item.querySelector('.note-item-preview').textContent.toLowerCase();
            item.style.display = title.includes(searchTerm) || preview.includes(searchTerm) ? 'block' : 'none';
        });
    });

    // Initialize
    window.addEventListener('load', () => {
        const notes = NotesManager.getNotes();
        const noteIds = Object.keys(notes);
        
        if (noteIds.length === 0) {
            const note = NotesManager.createNote();
            loadNote(note.id);
            NotificationSystem.info('Welcome! Your first note has been created.');
        } else {
            loadNote(parseInt(noteIds[0]));
        }
    });

    setupAutoSave();
    
    // Apply formatting function with improved error handling
    function applyTextFormat(command) {
        try {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) {
                editor.focus();
                return;
            }

            switch(command) {
                case 'bold':
                    document.execCommand('bold', false, null);
                    break;
                case 'italic':
                    document.execCommand('italic', false, null);
                    break;
                case 'underline':
                    document.execCommand('underline', false, null);
                    break;
                case 'insertUnorderedList':
                    document.execCommand('insertUnorderedList', false, null);
                    break;
                case 'insertOrderedList':
                    document.execCommand('insertOrderedList', false, null);
                    break;
                case 'insertChecklist':
                    insertChecklist();
                    break;
                case 'insertImage':
                    insertImage();
                    break;
                default:
                    console.warn(`Unsupported formatting command: ${command}`);
            }
        } catch (error) {
            console.error('Error applying text format:', error);
        }
    }

    // Add new functions for checklist and image handling
    function insertChecklist() {
        const checklistWrapper = document.createElement('div');
        checklistWrapper.className = 'checklist-wrapper';
        checklistWrapper.innerHTML = `
            <div class="checklist-item">
                <input type="checkbox">
                <span contenteditable="true">New item</span>
            </div>
        `;
        
        const selection = window.getSelection();
        if (selection.rangeCount) {
            const range = selection.getRangeAt(0);
            range.insertNode(checklistWrapper);
            
            // Focus the span for immediate editing
            const span = checklistWrapper.querySelector('span');
            span.focus();
            
            // Handle enter key to create new items
            span.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const newItem = document.createElement('div');
                    newItem.className = 'checklist-item';
                    newItem.innerHTML = `
                        <input type="checkbox">
                        <span contenteditable="true"></span>
                    `;
                    checklistWrapper.appendChild(newItem);
                    newItem.querySelector('span').focus();
                }
            });
        }
    }

    function insertImage() {
        const modal = document.getElementById('imageModal');
        const imageInput = document.getElementById('imageInput');
        const imageUrl = document.getElementById('imageUrl');
        const insertUrlBtn = document.getElementById('imageUrlBtn');
        
        function setupImage(src) {
            const container = document.createElement('div');
            container.className = 'image-container';
            container.innerHTML = `
                <img src="${src}" alt="User uploaded image">
                <div class="image-controls">
                    <button class="image-control-btn resize-btn" title="Resize">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="image-control-btn crop-btn" title="Crop">
                        <i class="fas fa-crop"></i>
                    </button>
                    <button class="image-control-btn delete-btn" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            const img = container.querySelector('img');
            
            // Handle delete
            container.querySelector('.delete-btn').onclick = () => container.remove();
            
            // Handle resize
            container.querySelector('.resize-btn').onclick = () => {
                const width = prompt('Enter new width (in pixels):', img.width);
                if (width && !isNaN(width)) {
                    img.style.width = `${width}px`;
                    img.style.height = 'auto';
                }
            };
            
            // Handle crop
            container.querySelector('.crop-btn').onclick = () => {
                const wrapper = document.createElement('div');
                wrapper.className = 'cropper-wrapper';
                wrapper.innerHTML = `
                    <div class="cropper-container">
                        <img src="${img.src}" style="max-width: 100%">
                    </div>
                    <div class="cropper-controls">
                        <button class="btn-primary apply-crop">Apply</button>
                        <button class="btn-secondary cancel-crop">Cancel</button>
                    </div>
                `;
                
                document.body.appendChild(wrapper);
                const cropperImg = wrapper.querySelector('img');
                
                const cropper = new Cropper(cropperImg, {
                    viewMode: 1,
                    responsive: true,
                    restore: true,
                });

                wrapper.querySelector('.apply-crop').onclick = () => {
                    const canvas = cropper.getCroppedCanvas();
                    img.src = canvas.toDataURL();
                    cropper.destroy();
                    wrapper.remove();
                };

                wrapper.querySelector('.cancel-crop').onclick = () => {
                    cropper.destroy();
                    wrapper.remove();
                };
            };

            return container;
        }

        // Handle file upload
        imageInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const container = setupImage(e.target.result);
                    const selection = window.getSelection();
                    if (selection.rangeCount) {
                        const range = selection.getRangeAt(0);
                        range.insertNode(container);
                    }
                    modal.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        };

        // Handle URL input
        insertUrlBtn.onclick = () => {
            const url = imageUrl.value.trim();
            if (url) {
                const container = setupImage(url);
                const selection = window.getSelection();
                if (selection.rangeCount) {
                    const range = selection.getRangeAt(0);
                    range.insertNode(container);
                }
                modal.style.display = 'none';
            }
        };

        modal.style.display = 'block';
    }

    // Add to the existing initialization code
    editor.addEventListener('click', (e) => {
        if (e.target.type === 'checkbox') {
            e.stopPropagation();
            // Save the note after checkbox state changes
            setTimeout(() => {
                if (currentNoteId) {
                    NotesManager.saveCurrentNote();
                }
            }, 100);
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const shortcuts = {
            'b': () => applyTextFormat('bold'),
            'i': () => applyTextFormat('italic'),
            'u': () => applyTextFormat('underline'),
            'n': () => newNoteBtn.click(),
            's': () => saveNoteBtn.click(),
            'd': () => deleteNoteBtn.click(),
            'l': () => applyTextFormat('insertUnorderedList'),
            'o': () => applyTextFormat('insertOrderedList'),
            'k': () => applyTextFormat('insertChecklist'),
            'm': () => applyTextFormat('insertImage')
        };

        if (e.ctrlKey && shortcuts[e.key]) {
            e.preventDefault();
            shortcuts[e.key]();
        }
    });

    // Add event listeners for formatting buttons
    document.querySelectorAll('.formatting-btn').forEach(button => {
        button.addEventListener('click', () => {
            const command = button.dataset.command;
            applyTextFormat(command);
            editor.focus();
        });
    });

    // Add window resize handler for responsive previews
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            NotesManager.renderNotesList();
        }, 250);
    });

    class LinkPreviewManager {
        static async getPreviewData(url) {
            try {
                const response = await fetch(`https://api.linkpreview.net/?key=02dce54bbc81c0ef516b0a7c46d9a2b4&q=${encodeURIComponent(url)}`);
                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Error fetching link preview:', error);
                return null;
            }
        }

        static createPreviewElement(previewData) {
            const preview = document.createElement('div');
            preview.className = 'link-preview';
            preview.innerHTML = `
                <a href="${previewData.url}" target="_blank" rel="noopener noreferrer">
                    ${previewData.image ? `
                        <div class="preview-image">
                            <img src="${previewData.image}" alt="${previewData.title || 'Link preview'}">
                        </div>
                    ` : ''}
                    <div class="preview-content">
                        <h4>${previewData.title || 'No title'}</h4>
                        ${previewData.description ? `<p>${previewData.description}</p>` : ''}
                        <span class="preview-url">${previewData.url}</span>
                    </div>
                </a>
                <button class="preview-remove" onclick="this.closest('.link-preview').remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            return preview;
        }
    }

    // Add paste event listener to handle links
    editor.addEventListener('paste', async (e) => {
        const text = e.clipboardData.getData('text');
        if (text.match(/^https?:\/\//i)) {
            e.preventDefault();
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const range = selection.getRangeAt(0);
            const loadingPlaceholder = document.createElement('div');
            loadingPlaceholder.className = 'link-preview-loading';
            loadingPlaceholder.textContent = 'Loading preview...';
            range.insertNode(loadingPlaceholder);

            const previewData = await LinkPreviewManager.getPreviewData(text);
            if (previewData) {
                const previewElement = LinkPreviewManager.createPreviewElement(previewData);
                loadingPlaceholder.replaceWith(previewElement);
            } else {
                // If preview fails, just insert the link as text
                loadingPlaceholder.replaceWith(text);
            }
            
            // Trigger autosave
            if (currentNoteId) {
                NotesManager.saveCurrentNote();
            }
        }
    });

    class AstroAI {
        static async getResponse(noteContent, query) {
            try {
                // Add loading state
                const messages = document.querySelector('.astro-messages');
                const loadingId = Date.now();
                messages.insertAdjacentHTML('beforeend', `
                    <div id="loading-${loadingId}" class="astro-message assistant loading">
                        <i class="fas fa-spinner fa-spin"></i> Thinking...
                    </div>
                `);

                // Replace with actual API endpoint
                const response = await fetch('https://api.nova.xxavvgroup.com/astro/chat', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('astro_api_key')
                    },
                    body: JSON.stringify({ 
                        context: noteContent.substring(0, 5000), // Limit context size
                        query: query.substring(0, 500) // Limit query size
                    })
                });

                document.getElementById(`loading-${loadingId}`).remove();

                if (!response.ok) throw new Error('API request failed');
                
                return await response.json();
            } catch (error) {
                console.error('Astro AI Error:', error);
                return { 
                    error: true,
                    message: 'Sorry, I encountered an error. Please try again later.'
                };
            }
        }

        static init() {
            const toggle = document.getElementById('astro-toggle');
            const chat = document.getElementById('astroChat');
            const input = chat.querySelector('input');
            const messages = chat.querySelector('.astro-messages');

            toggle.addEventListener('click', () => {
                chat.classList.toggle('active');
            });

            chat.querySelector('.close-astro').onclick = () => {
                chat.classList.remove('active');
            };

            chat.querySelector('button').onclick = async () => {
                const query = input.value.trim();
                if (!query) return;

                // Add user message
                messages.innerHTML += `
                    <div class="astro-message user">${query}</div>
                `;

                input.value = '';
                const noteContent = editor.innerHTML;
                
                // Get AI response
                const response = await this.getResponse(noteContent, query);
                
                messages.innerHTML += `
                    <div class="astro-message assistant">${response.message}</div>
                `;
                
                messages.scrollTop = messages.scrollHeight;
            };
        }
    }

    class NoteSecurityManager {
        static async hashPassword(password) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hash = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }

        static async lockNote(noteId, password) {
            const notes = NotesManager.getNotes();
            const note = notes[noteId];
            if (!note) return false;

            const hashedPassword = await this.hashPassword(password);
            note.locked = true;
            note.passwordHash = hashedPassword;
            NotesManager.saveNotes(notes);
            return true;
        }

        static async unlockNote(noteId, password) {
            const notes = NotesManager.getNotes();
            const note = notes[noteId];
            if (!note || !note.locked) return false;

            const hashedPassword = await this.hashPassword(password);
            return hashedPassword === note.passwordHash;
        }
    }

    // Modify NotesManager class to include pinning
    NotesManager.pinNote = function(id) {
        const notes = this.getNotes();
        const note = notes[id];
        if (note) {
            note.pinned = !note.pinned;
            this.saveNotes(notes);
            this.renderNotesList();
        }
    };

    // Modify the renderNotesList method to handle pinned notes
    NotesManager.renderNotesList = function() {
        const notes = Object.values(this.getNotes());
        notes.sort((a, b) => {
            // Sort by pinned status first
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            // Then by last edited date
            return new Date(b.lastEdited) - new Date(a.lastEdited);
        });

        notesList.innerHTML = notes.length ? notes.map(note => `
            <div class="note-item ${note.pinned ? 'pinned' : ''} ${note.locked ? 'locked' : ''} ${note.id === currentNoteId ? 'active' : ''}" 
                 data-id="${note.id}">
                <div class="note-item-title">${note.title || 'Untitled Note'}</div>
                <div class="note-item-preview">${this.getPreview(note.content)}</div>
                <div class="note-item-date">Edited ${new Date(note.lastEdited).toLocaleString()}</div>
                <div class="note-item-actions">
                    <button onclick="NotesManager.pinNote(${note.id})" class="pin-btn">
                        <i class="fas ${note.pinned ? 'fa-thumbtack' : 'fa-thumbtack'}"></i>
                    </button>
                    ${!note.locked ? `
                        <button onclick="showLockNoteModal(${note.id})" class="lock-btn">
                            <i class="fas fa-lock"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('') : '<div class="empty-notes">No notes yet</div>';

        // Add context menu event listeners
        document.querySelectorAll('.note-item').forEach(noteItem => {
            noteItem.addEventListener('contextmenu', (e) => {
                const noteId = parseInt(noteItem.dataset.id);
                const notes = this.getNotes();
                const note = notes[noteId];
                
                ContextMenu.show(e, [
                    {
                        label: note.pinned ? 'Unpin' : 'Pin',
                        icon: 'thumbtack',
                        action: 'pin'
                    },
                    {
                        label: note.locked ? 'Locked' : 'Lock',
                        icon: 'lock',
                        action: 'lock',
                        disabled: note.locked
                    },
                    {
                        label: 'Duplicate',
                        icon: 'copy',
                        action: 'duplicate'
                    },
                    {
                        label: 'Export',
                        icon: 'file-export',
                        action: 'export'
                    },
                    {
                        label: 'Delete',
                        icon: 'trash',
                        action: 'delete'
                    }
                ]);
            });
        });
    };

    // Initialize new features
    AstroAI.init();

    // Modify note creation/editing
    function showNoteEditor(note = null) {
        noteEditor.style.display = 'block';
        if (note) {
            titleInput.value = note.title;
            editor.innerHTML = note.content;
            noteEditor.dataset.noteId = note.id;
        } else {
            titleInput.value = '';
            editor.innerHTML = '';
            noteEditor.dataset.noteId = '';
        }
        titleInput.focus();
    }

    // Close note editor with null check
    document.querySelector('.close-btn')?.addEventListener('click', () => {
        if (noteEditor) {
            noteEditor.style.display = 'none';
            NotesManager.saveCurrentNote();
        }
    });

    // Modify click handlers
    notesList.addEventListener('click', (e) => {
        const noteItem = e.target.closest('.note-item');
        if (noteItem) {
            const noteId = parseInt(noteItem.dataset.id);
            const note = NotesManager.getNotes()[noteId];
            if (note) {
                showNoteEditor(note);
            }
        }
    });

    // Update new note button
    newNoteBtn.addEventListener('click', () => {
        showNoteEditor();
    });

    class ImageHandler {
        static async handleImageUpload(file) {
            try {
                // Validate file size
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    NotificationSystem.error('Image size must be less than 5MB');
                    return null;
                }

                // Validate file type
                if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
                    NotificationSystem.error('Unsupported image format');
                    return null;
                }

                // Add loading indicator
                const loadingId = Date.now();
                editor.insertAdjacentHTML('beforeend', `
                    <div id="loading-${loadingId}" class="image-loading">
                        <i class="fas fa-spinner fa-spin"></i> Uploading image...
                    </div>
                `);

                const formData = new FormData();
                formData.append('image', file);
                
                const response = await fetch('https://api.nova.xxavvgroup.com/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Upload failed');
                
                const { url } = await response.json();
                document.getElementById(`loading-${loadingId}`).remove();
                return url;
            } catch (error) {
                console.error('Error uploading image:', error);
                NotificationSystem.error('Failed to upload image');
                return null;
            }
        }

        static setupImageHandlers(editor) {
            // Handle drag & drop
            editor.addEventListener('dragover', e => {
                e.preventDefault();
                editor.classList.add('drag-over');
            });

            editor.addEventListener('dragleave', () => {
                editor.classList.remove('drag-over');
            });

            editor.addEventListener('drop', async e => {
                e.preventDefault();
                editor.classList.remove('drag-over');
                
                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                for (const file of files) {
                    const url = await this.handleImageUpload(file);
                    if (url) this.insertImage(url, editor);
                }
            });

            // Handle paste
            editor.addEventListener('paste', async e => {
                const items = Array.from(e.clipboardData.items);
                const imageItem = items.find(item => item.type.startsWith('image/'));
                
                if (imageItem) {
                    e.preventDefault();
                    const file = imageItem.getAsFile();
                    const url = await this.handleImageUpload(file);
                    if (url) this.insertImage(url, editor);
                }
            });
        }

        static insertImage(url, editor) {
            const img = document.createElement('img');
            img.src = url;
            img.className = 'note-image';
            img.addEventListener('click', () => this.showImageControls(img));
            editor.appendChild(img);
        }

        static showImageControls(img) {
            const controls = document.createElement('div');
            controls.className = 'image-controls';
            controls.innerHTML = `
                <button onclick="ImageHandler.resizeImage(this)"><i class="fas fa-expand"></i></button>
                <button onclick="ImageHandler.alignImage(this, 'left')"><i class="fas fa-align-left"></i></button>
                <button onclick="ImageHandler.alignImage(this, 'center')"><i class="fas fa-align-center"></i></button>
                <button onclick="ImageHandler.alignImage(this, 'right')"><i class="fas fa-align-right"></i></button>
                <button onclick="ImageHandler.removeImage(this)"><i class="fas fa-trash"></i></button>
            `;
            img.parentElement.appendChild(controls);
        }

        // Add image control methods
    }

    class FeatureManager {
        static init(editor) {
            this.setupAutoformatting(editor);
            this.setupTableOfContents();
            this.setupCodeBlocks();
            this.setupMarkdownSupport();
            this.setupCollaborativeEditing();
        }

        static setupAutoformatting(editor) {
            editor.addEventListener('input', e => {
                const text = editor.innerText;
                
                // Auto-detect and format URLs
                const urlRegex = /https?:\/\/\S+/g;
                if (text.match(urlRegex)) {
                    this.formatUrls(editor, urlRegex);
                }

                // Auto-format lists
                const listRegex = /^[\*\-]\s/gm;
                if (text.match(listRegex)) {
                    this.formatLists(editor, listRegex);
                }

                // Auto-format code blocks
                const codeRegex = /^```(\w+)?\n([\s\S]*?)\n```$/gm;
                if (text.match(codeRegex)) {
                    this.formatCodeBlocks(editor, codeRegex);
                }
            });
        }

        static formatUrls(editor, regex) {
            const content = editor.innerHTML;
            editor.innerHTML = content.replace(regex, url => 
                `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
            );
        }

        static formatLists(editor, regex) {
            const content = editor.innerHTML;
            editor.innerHTML = content.replace(regex, match => 
                `<ul><li>${match.replace(/[\*\-]\s/, '')}</li></ul>`
            );
        }

        static formatCodeBlocks(editor, regex) {
            const content = editor.innerHTML;
            editor.innerHTML = content.replace(regex, (match, lang, code) => `
                <pre class="code-block ${lang || ''}">
                    <div class="code-block-header">
                        <span>${lang || 'plain'}</span>
                        <button onclick="this.parentElement.parentElement.querySelector('code').select()">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <code>${code.trim()}</code>
                </pre>
            `);
        }

        static setupTableOfContents() {
            const toc = document.createElement('div');
            toc.className = 'table-of-contents';
            
            function updateTOC() {
                const headings = editor.querySelectorAll('h1, h2, h3, h4, h5, h6');
                toc.innerHTML = '<h3>Table of Contents</h3>';
                const list = document.createElement('ul');
                
                headings.forEach(heading => {
                    const li = document.createElement('li');
                    const link = document.createElement('a');
                    const level = parseInt(heading.tagName.charAt(1));
                    
                    link.textContent = heading.textContent;
                    link.href = `#${heading.id || (heading.id = `heading-${Math.random().toString(36).substr(2, 9)}`)}`;
                    link.style.marginLeft = `${(level - 1) * 15}px`;
                    
                    li.appendChild(link);
                    list.appendChild(li);
                });
                
                toc.appendChild(list);
            }

            editor.addEventListener('input', updateTOC);
            document.body.appendChild(toc);
        }

        static setupCodeBlocks() {
            const codeBlocks = editor.querySelectorAll('pre code');
            codeBlocks.forEach(block => {
                block.addEventListener('keydown', e => {
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        document.execCommand('insertText', false, '    ');
                    }
                });
            });
        }

        static setupMarkdownSupport() {
            editor.addEventListener('input', () => {
                const text = editor.innerText;
                
                // Headers
                text.replace(/^(#{1,6})\s(.+)$/gm, (match, hashes, content) => {
                    const level = hashes.length;
                    return `<h${level}>${content}</h${level}>`;
                });

                // Bold
                text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

                // Italic
                text.replace(/\*(.+?)\*/g, '<em>$1</em>');

                // Code
                text.replace(/`(.+?)`/g, '<code>$1</code>');
            });
        }

        static async setupCollaborativeEditing() {
            try {
                let reconnectAttempts = 0;
                const maxReconnectAttempts = 5;

                const connect = () => {
                    const ws = new WebSocket('wss://api.nova.xxavvgroup.com/ws');
                    
                    ws.onopen = () => {
                        reconnectAttempts = 0;
                        NotificationSystem.success('Connected to collaboration server');
                    };

                    ws.onclose = () => {
                        if (reconnectAttempts < maxReconnectAttempts) {
                            reconnectAttempts++;
                            setTimeout(connect, 1000 * reconnectAttempts);
                        } else {
                            NotificationSystem.error('Collaboration server connection lost');
                        }
                    };

                    ws.onerror = (error) => {
                        console.error('WebSocket error:', error);
                    };

                    // Add heartbeat to keep connection alive
                    const heartbeat = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'ping' }));
                        }
                    }, 30000);

                    ws.onmessage = event => {
                        try {
                            const { type, data } = JSON.parse(event.data);
                            
                            switch(type) {
                                case 'change':
                                    if (data && data.noteId && data.content) {
                                        this.applyChange(data);
                                    }
                                    break;
                                case 'cursor':
                                    if (data && typeof data.x === 'number' && typeof data.y === 'number') {
                                        this.updateCursor(data);
                                    }
                                    break;
                                case 'error':
                                    NotificationSystem.error(data.message || 'Collaboration error');
                                    break;
                            }
                        } catch (error) {
                            console.error('Error processing message:', error);
                        }
                    };

                    return () => {
                        clearInterval(heartbeat);
                        ws.close();
                    };
                };

                return connect();
            } catch (error) {
                console.error('Collaborative editing setup failed:', error);
                NotificationSystem.error('Collaborative editing is currently unavailable');
            }
        }

        static applyChange(data) {
            if (data.noteId === currentNoteId) {
                const currentCursor = window.getSelection().getRangeAt(0);
                editor.innerHTML = data.content;
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(currentCursor);
            }
        }

        static updateCursor(data) {
            const cursor = document.createElement('div');
            cursor.className = 'remote-cursor';
            cursor.style.left = `${data.x}px`;
            cursor.style.top = `${data.y}px`;
            cursor.textContent = data.user;
            editor.appendChild(cursor);
            
            setTimeout(() => cursor.remove(), 2000);
        }
    }

    // Initialize all features
    document.addEventListener('DOMContentLoaded', () => {
        try {
            if (!editor) throw new Error('Editor element not found');

            // Initialize features
            FeatureManager.init(editor);
            ImageHandler.setupImageHandlers(editor);
            NotesManager.renderNotesList();
            AstroAI.init();

            // Add error boundaries
            window.addEventListener('error', (event) => {
                console.error('Global error:', event.error);
                NotificationSystem.error('An error occurred. Please refresh the page.');
            });

            window.addEventListener('unhandledrejection', (event) => {
                console.error('Unhandled promise rejection:', event.reason);
                NotificationSystem.error('An error occurred. Please try again.');
            });

        } catch (error) {
            console.error('Initialization error:', error);
            document.body.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <h1>Error</h1>
                    <p>Failed to initialize the application. Please refresh the page or contact support.</p>
                </div>
            `;
        }
    });

    // Export functionality
    window.exportNote = async function(format) {
        if (!currentNoteId) return;

        const note = NotesManager.getNotes()[currentNoteId];
        if (!note) return;

        try {
            const response = await fetch('https://api.nova.xxavvgroup.com/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: note.title,
                    content: note.content,
                    format
                })
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${note.title || 'Untitled'}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            NotificationSystem.success(`Note exported as ${format.toUpperCase()}`);
        } catch (error) {
            console.error('Export failed:', error);
            NotificationSystem.error('Failed to export note');
        }
    };

    // Add Modal Manager
    class ModalManager {
        static show(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'block';
            }
        }

        static hide(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        }

        static init() {
            // Close modals when clicking outside
            window.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    e.target.style.display = 'none';
                }
            });

            // Close modals when clicking close button
            document.querySelectorAll('.modal .close').forEach(closeBtn => {
                closeBtn.addEventListener('click', () => {
                    const modal = closeBtn.closest('.modal');
                    if (modal) modal.style.display = 'none';
                });
            });
        }
    }

    // Initialize all features
    function initializeFeatures() {
        if (!editor) {
            console.error('Editor not found');
            return;
        }

        // Initialize modals
        ModalManager.init();

        // Initialize formatting buttons
        document.querySelectorAll('.formatting-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.dataset.command;
                if (command === 'insertTable') {
                    ModalManager.show('tableModal');
                } else if (command === 'showShortcuts') {
                    ModalManager.show('shortcuts-lightbox');
                } else {
                    applyTextFormat(command);
                }
            });
        });

        // Initialize table insertion
        document.getElementById('insertTableBtn')?.addEventListener('click', () => {
            const rows = parseInt(document.getElementById('tableRows').value) || 3;
            const cols = parseInt(document.getElementById('tableCols').value) || 3;
            
            const table = document.createElement('table');
            for (let i = 0; i < rows; i++) {
                const tr = document.createElement('tr');
                for (let j = 0; j < cols; j++) {
                    const cell = i === 0 ? document.createElement('th') : document.createElement('td');
                    cell.contentEditable = true;
                    cell.textContent = 'Cell';
                    tr.appendChild(cell);
                }
                table.appendChild(tr);
            }
            
            editor.appendChild(table);
            ModalManager.hide('tableModal');
        });

        // Initialize image handlers
        ImageHandler.setupImageHandlers(editor);

        // Initialize collaborative features
        FeatureManager.init(editor);

        // Initialize Astro AI
        AstroAI.init();
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        try {
            NotificationSystem.initialize();
            initializeFeatures();
            NotesManager.renderNotesList();

            // Show welcome message
            if (!localStorage.getItem('welcomeShown')) {
                NotificationSystem.info('Welcome to Nova Gists 2.0! Check out the new features.');
                localStorage.setItem('welcomeShown', 'true');
            }
        } catch (error) {
            console.error('Initialization error:', error);
            NotificationSystem.error('Failed to initialize application');
        }
    });

    // Add keyboard shortcuts initialization
    function initializeShortcuts() {
        const shortcuts = {
            'n': () => newNoteBtn.click(),
            's': () => NotesManager.saveCurrentNote(),
            'd': () => deleteNoteBtn.click(),
            'b': () => applyTextFormat('bold'),
            'i': () => applyTextFormat('italic'),
            'u': () => applyTextFormat('underline'),
            'l': () => applyTextFormat('insertUnorderedList'),
            'o': () => applyTextFormat('insertOrderedList'),
            'k': () => applyTextFormat('insertChecklist'),
            'm': () => ModalManager.show('imageModal'),
            '/': () => ModalManager.show('shortcuts-lightbox')
        };

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && shortcuts[e.key]) {
                e.preventDefault();
                shortcuts[e.key]();
            }
        });
    }

    // Initialize shortcuts
    initializeShortcuts();

    // Add the missing showLockNoteModal function
    window.showLockNoteModal = function(noteId) {
        const modal = document.getElementById('lockNoteModal');
        const passwordInput = document.getElementById('noteLockPassword');
        const confirmButton = document.getElementById('confirmLockNote');
        
        modal.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();

        const handleLock = async () => {
            const password = passwordInput.value.trim();
            if (!password) {
                NotificationSystem.error('Please enter a password');
                return;
            }

            try {
                await NoteSecurityManager.lockNote(noteId, password);
                NotificationSystem.success('Note locked successfully');
                modal.style.display = 'none';
                NotesManager.renderNotesList();
            } catch (error) {
                NotificationSystem.error('Failed to lock note');
                console.error('Lock error:', error);
            }
        };

        // Remove existing event listener if any
        confirmButton.removeEventListener('click', handleLock);
        // Add new event listener
        confirmButton.addEventListener('click', handleLock);

        // Handle enter key
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLock();
            }
        });
    };

    // ...existing code...
});