
class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeIcon = this.themeToggle.querySelector('i');
        this.darkStylesheet = document.getElementById('dark-theme');
        this.currentTheme = localStorage.getItem('theme') || 'auto';
        
        this.init();
    }

    init() {
        // Add event listeners
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Watch for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (this.currentTheme === 'auto') {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });

        // Initial theme setup
        this.setTheme(this.currentTheme);
    }

    toggleTheme() {
        const themes = ['light', 'dark', 'auto'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.setTheme(themes[nextIndex]);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        
        // Update icon
        this.themeIcon.className = `fas fa-${
            theme === 'auto' ? 'adjust' : 
            theme === 'dark' ? 'moon' : 'sun'
        }`;
        
        // Apply theme
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.applyTheme(prefersDark ? 'dark' : 'light');
        } else {
            this.applyTheme(theme);
        }
    }

    applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            this.darkStylesheet.disabled = false;
        } else {
            document.body.classList.remove('dark-theme');
            this.darkStylesheet.disabled = true;
        }
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
});