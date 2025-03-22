class RichTextEditor {
    constructor() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.setupEditors();
        this.setupLinkPreviews();
    }

    setupEditors() {
        const noteContent = document.getElementById('noteContent');
        const editContent = document.getElementById('editContent');
        
        if (!noteContent || !editContent) {
            console.warn('Editor containers not found');
            return;
        }

        const editorConfig = {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'header': 1 }, { 'header': 2 }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'image'],
                    ['clean']
                ],
                clipboard: {
                    matchVisual: false
                },
                keyboard: {
                    bindings: {
                        tab: false
                    }
                },
                history: {
                    delay: 1000,
                    maxStack: 500
                }
            },
            placeholder: 'Write your gist here...',
            bounds: 'self',
            readOnly: false,
            formats: [
                'bold', 'italic', 'underline', 'strike',
                'blockquote', 'code-block', 'header',
                'list', 'link', 'image'
            ]
        };

        try {
            // Initialize editors with modern configuration
            this.mainEditor = new Quill(noteContent, editorConfig);
            this.modalEditor = new Quill(editContent, editorConfig);

            // Use IntersectionObserver instead of scroll events
            const observer = new IntersectionObserver(
                entries => {
                    entries.forEach(entry => {
                        if (entry.target.classList.contains('ql-editor')) {
                            entry.target.style.minHeight = entry.isIntersecting ? 
                                '150px' : 'auto';
                        }
                    });
                },
                { threshold: 0.1 }
            );

            [this.mainEditor.root, this.modalEditor.root].forEach(editor => {
                observer.observe(editor);
            });

            // Text change handler using RAF
            this.mainEditor.on('text-change', () => {
                requestAnimationFrame(() => {
                    noteContent.dispatchEvent(new Event('input'));
                });
            });

            // Setup mobile handlers
            this.setupMobileHandlers();

        } catch (error) {
            console.error('Editor initialization error:', error);
            notifications?.error('Failed to initialize editor. Please refresh the page.');
        }
    }

    setupMobileHandlers() {
        if ('ontouchstart' in window) {
            this.mainEditor.container.addEventListener('touchstart', this.handleTouchStart.bind(this));
            this.modalEditor.container.addEventListener('touchstart', this.handleTouchStart.bind(this));
        }
    }

    handleTouchStart(e) {
        // Prevent zoom on double tap
        if (e.touches.length > 1) {
            e.preventDefault();
        }

        // Fix iOS cursor positioning
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target && target.classList.contains('ql-editor')) {
                e.preventDefault();
                const rect = target.getBoundingClientRect();
                const y = touch.clientY - rect.top;
                const line = Math.floor(y / 24); // Approximate line height
                this.mainEditor.setSelection(line * 5, 0); // Approximate character position
            }
        }
    }

    setupLinkPreviews() {
        // Use MutationObserver to watch for new links
        const config = { 
            childList: true, 
            subtree: true,
            characterData: true
        };
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check for links in the added node
                            const links = node.matches('a[href]') ? [node] : 
                                        node.querySelectorAll('a[href]');
                            links.forEach(link => this.handleLink(link));
                        }
                    });
                }
            });
        });

        // Start observing both editors
        [this.mainEditor?.root, this.modalEditor?.root]
            .filter(Boolean)
            .forEach(editor => observer.observe(editor, config));
    }

    async handleLink(link) {
        // Skip if already processed or is an internal link
        if (link.classList.contains('processed-link') || 
            link.href.startsWith(window.location.origin)) {
            return;
        }

        try {
            // Mark as processed to avoid duplicate previews
            link.classList.add('processed-link');
            
            // Check if URL is valid
            const url = new URL(link.href);
            
            // Don't preview certain types of links
            if (url.protocol === 'mailto:' || 
                url.protocol === 'tel:' || 
                url.protocol === 'javascript:') {
                return;
            }

            // Generate and insert preview
            const preview = await this.generateLinkPreview(url.href);
            if (preview) {
                // Insert after the paragraph containing the link
                const container = link.closest('p') || link;
                container.insertAdjacentHTML('afterend', preview);
            }

        } catch (error) {
            console.warn('Link preview failed:', error);
            // Don't show error to user as link previews are non-critical
        }
    }

    async generateLinkPreview(url) {
        try {
            // Use signal to abort fetch if it takes too long
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Microlink API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success || !data.data) {
                return null;
            }

            const { title, description, image, url: finalUrl } = data.data;
            
            // Only generate preview if we have at least a title or description
            if (!title && !description) {
                return null;
            }

            const domain = new URL(finalUrl).hostname;
            
            return `
                <div class="link-preview" data-url="${finalUrl}">
                    ${image?.url ? `
                        <div class="preview-image">
                            <img src="${image.url}" alt="${title || 'Link preview'}" 
                                 loading="lazy" onerror="this.style.display='none'">
                        </div>
                    ` : ''}
                    <div class="link-preview-content">
                        ${title ? `<div class="link-preview-title">${title}</div>` : ''}
                        ${description ? `<div class="link-preview-description">${description}</div>` : ''}
                        <div class="link-preview-domain">
                            <i class="fas fa-link"></i>
                            ${domain}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Link preview timed out:', url);
            } else {
                console.error('Link preview error:', error);
            }
            return null;
        }
    }

    getContent() {
        return this.mainEditor.root.innerHTML;
    }

    setContent(content) {
        this.mainEditor.root.innerHTML = content;
    }

    getModalContent() {
        return this.modalEditor.root.innerHTML;
    }

    setModalContent(content) {
        this.modalEditor.root.innerHTML = content;
    }

    sanitize(content) {
        return DOMPurify.sanitize(content, {
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3',
                'h4', 'h5', 'h6', 'ol', 'ul', 'li', 'a', 'img', 'pre',
                'code', 'blockquote', 'div', 'span'
            ],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'class']
        });
    }

    clearContent() {
        this.mainEditor.setText('');
    }
}
