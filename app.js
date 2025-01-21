document.addEventListener('DOMContentLoaded', () => {
    // Notification System
    class NotificationSystem {
        static DURATION = 3000; // Default duration in milliseconds
        static container = document.getElementById('notification-container');

        static show(message, type = 'info', duration = this.DURATION) {
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

    // Initialize elements
    const editor = document.getElementById('editor');
    const titleInput = document.getElementById('note-title');
    const notesList = document.getElementById('notes-list');
    const deleteNoteBtn = document.getElementById('delete-note');
    const newNoteBtn = document.getElementById('new-note');
    const saveNoteBtn = document.getElementById('save-note');
    const searchInput = document.getElementById('search-notes');
    const lastEditedSpan = document.getElementById('last-edited');

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

        static saveCurrentNote() {
            if (!currentNoteId) return false;
            
            const notes = this.getNotes();
            const title = titleInput.value.trim() || 'Untitled Note';
            const content = editor.innerHTML;
            
            // Before saving, ensure checkbox states are preserved
            const checkboxes = editor.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.setAttribute('checked', checkbox.checked);
            });

            notes[currentNoteId] = {
                id: currentNoteId,
                title,
                content,
                lastEdited: new Date().toISOString()
            };

            if (this.saveNotes(notes)) {
                NotificationSystem.success('Note saved');
                updateLastEdited();
                return true;
            }
            return false;
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
            notes.sort((a, b) => new Date(b.lastEdited) - new Date(a.lastEdited));

            notesList.innerHTML = notes.length ? notes.map(note => `
                <div class="note-item ${note.id === currentNoteId ? 'active' : ''}" data-id="${note.id}">
                    <div class="note-item-title" title="${note.title || 'Untitled Note'}">
                        ${note.title || 'Untitled Note'}
                    </div>
                    <div class="note-item-preview">
                        ${this.getPreview(note.content)}
                    </div>
                </div>
            `).join('') : '<div class="empty-notes">No notes yet</div>';
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

        editor.addEventListener('input', autoSave);
        titleInput.addEventListener('input', autoSave);
    }

    // Manual save
    saveNoteBtn.addEventListener('click', () => {
        if (NotesManager.saveCurrentNote()) {
            NotificationSystem.success('Note saved manually');
        } else {
            NotificationSystem.error('Failed to save note');
        }
    });

    function updateLastEdited() {
        lastEditedSpan.textContent = `Last edited: ${new Date().toLocaleString()}`;
    }

    function loadNote(id) {
        const notes = NotesManager.getNotes();
        const note = notes[id];
        if (note) {
            currentNoteId = id;
            titleInput.value = note.title;
            editor.innerHTML = note.content;
            updateLastEdited();
            NotesManager.renderNotesList(); // Update active state
        }
    }

    // Event Listeners
    newNoteBtn.addEventListener('click', () => {
        const note = NotesManager.createNote();
        loadNote(note.id);
        titleInput.focus();
    });

    deleteNoteBtn.addEventListener('click', () => {
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

});