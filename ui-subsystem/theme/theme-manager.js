/**
 * Theme Manager
 * 
 * Manages application themes and styling with support for multiple themes,
 * dynamic theme switching, and CSS custom properties.
 * 
 * Features:
 * - Multiple theme support
 * - Dynamic theme switching
 * - CSS custom properties
 * - Theme persistence
 * - System theme detection
 */

/**
 * Theme Manager
 * 
 * Manages application themes and styling.
 */
class ThemeManager {
    /**
     * Create a new ThemeManager
     * @param {Object} options - Configuration options
     * @param {Object} options.themes - Available themes
     * @param {string} options.defaultTheme - Default theme name
     * @param {boolean} options.persistent - Whether to persist theme selection
     * @param {string} options.storageKey - localStorage key for theme persistence
     * @param {boolean} options.detectSystemTheme - Whether to detect system theme preference
     */
    constructor(options = {}) {
        const {
            themes = {},
            defaultTheme = 'light',
            persistent = true,
            storageKey = 'app_theme',
            detectSystemTheme = true
        } = options;
        
        // Configuration
        this.themes = {
            light: {
                name: 'Light',
                colors: {
                    primary: '#007bff',
                    secondary: '#6c757d',
                    success: '#28a745',
                    danger: '#dc3545',
                    warning: '#ffc107',
                    info: '#17a2b8',
                    light: '#f8f9fa',
                    dark: '#343a40',
                    background: '#ffffff',
                    surface: '#f8f9fa',
                    text: '#212529',
                    textSecondary: '#6c757d',
                    border: '#dee2e6'
                }
            },
            dark: {
                name: 'Dark',
                colors: {
                    primary: '#0d6efd',
                    secondary: '#6c757d',
                    success: '#198754',
                    danger: '#dc3545',
                    warning: '#fd7e14',
                    info: '#0dcaf0',
                    light: '#f8f9fa',
                    dark: '#212529',
                    background: '#121212',
                    surface: '#1e1e1e',
                    text: '#ffffff',
                    textSecondary: '#adb5bd',
                    border: '#495057'
                }
            },
            ...themes
        };
        
        this.defaultTheme = defaultTheme;
        this.persistent = persistent;
        this.storageKey = storageKey;
        this.detectSystemTheme = detectSystemTheme;
        
        // Current theme
        this.currentTheme = null;
        
        // Change listeners
        this.listeners = new Set();
        
        // Initialize
        this._initialize();
    }

    /**
     * Initialize theme manager
     * @private
     */
    _initialize() {
        // Determine initial theme
        let initialTheme = this.defaultTheme;
        
        // Check for persisted theme
        if (this.persistent) {
            const persistedTheme = localStorage.getItem(this.storageKey);
            if (persistedTheme && this.themes[persistedTheme]) {
                initialTheme = persistedTheme;
            }
        }
        
        // Check for system theme preference
        if (this.detectSystemTheme && !this.persistent) {
            const systemTheme = this._getSystemTheme();
            if (systemTheme && this.themes[systemTheme]) {
                initialTheme = systemTheme;
            }
        }
        
        // Apply initial theme
        this.setTheme(initialTheme);
        
        // Listen for system theme changes
        if (this.detectSystemTheme) {
            this._listenForSystemThemeChanges();
        }
    }

    /**
     * Set the current theme
     * @param {string} themeName - Theme name
     * @returns {boolean} Whether theme was set successfully
     */
    setTheme(themeName) {
        // Check if theme exists
        if (!this.themes[themeName]) {
            console.warn(`Theme '${themeName}' not found`);
            return false;
        }
        
        const oldTheme = this.currentTheme;
        this.currentTheme = themeName;
        
        // Apply theme
        this._applyTheme(this.themes[themeName]);
        
        // Persist theme
        if (this.persistent) {
            localStorage.setItem(this.storageKey, themeName);
        }
        
        // Notify listeners
        this._notifyListeners(themeName, oldTheme);
        
        return true;
    }

    /**
     * Get the current theme name
     * @returns {string} Current theme name
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Get available themes
     * @returns {Object} Available themes
     */
    getThemes() {
        return { ...this.themes };
    }

    /**
     * Get theme names
     * @returns {Array<string>} Theme names
     */
    getThemeNames() {
        return Object.keys(this.themes);
    }

    /**
     * Add a new theme
     * @param {string} name - Theme name
     * @param {Object} theme - Theme configuration
     * @returns {ThemeManager} This theme manager for chaining
     */
    addTheme(name, theme) {
        this.themes[name] = theme;
        return this;
    }

    /**
     * Remove a theme
     * @param {string} name - Theme name
     * @returns {ThemeManager} This theme manager for chaining
     */
    removeTheme(name) {
        if (name === this.currentTheme) {
            this.setTheme(this.defaultTheme);
        }
        
        delete this.themes[name];
        return this;
    }

    /**
     * Toggle between light and dark themes
     * @returns {string} New theme name
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        return newTheme;
    }

    /**
     * Add theme change listener
     * @param {Function} listener - Listener function
     * @returns {Function} Function to remove the listener
     */
    addListener(listener) {
        this.listeners.add(listener);
        
        // Return function to remove listener
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Remove theme change listener
     * @param {Function} listener - Listener function
     * @returns {ThemeManager} This theme manager for chaining
     */
    removeListener(listener) {
        this.listeners.delete(listener);
        return this;
    }

    /**
     * Remove all listeners
     * @returns {ThemeManager} This theme manager for chaining
     */
    removeAllListeners() {
        this.listeners.clear();
        return this;
    }

    /**
     * Apply theme to DOM
     * @param {Object} theme - Theme configuration
     * @private
     */
    _applyTheme(theme) {
        const root = document.documentElement;
        
        // Apply colors as CSS custom properties
        if (theme.colors) {
            for (const [key, value] of Object.entries(theme.colors)) {
                root.style.setProperty(`--color-${key}`, value);
            }
        }
        
        // Apply other theme properties
        if (theme.fonts) {
            for (const [key, value] of Object.entries(theme.fonts)) {
                root.style.setProperty(`--font-${key}`, value);
            }
        }
        
        if (theme.spacing) {
            for (const [key, value] of Object.entries(theme.spacing)) {
                root.style.setProperty(`--spacing-${key}`, value);
            }
        }
        
        if (theme.shadows) {
            for (const [key, value] of Object.entries(theme.shadows)) {
                root.style.setProperty(`--shadow-${key}`, value);
            }
        }
        
        // Update body class
        document.body.className = document.body.className
            .replace(/theme-\w+/g, '')
            .trim();
        document.body.classList.add(`theme-${this.currentTheme}`);
    }

    /**
     * Get system theme preference
     * @returns {string|null} System theme name
     * @private
     */
    _getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        
        return null;
    }

    /**
     * Listen for system theme changes
     * @private
     */
    _listenForSystemThemeChanges() {
        if (!window.matchMedia) {
            return;
        }
        
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        darkModeQuery.addEventListener('change', (event) => {
            // Only auto-switch if not using persistent theme
            if (!this.persistent) {
                const systemTheme = event.matches ? 'dark' : 'light';
                if (this.themes[systemTheme]) {
                    this.setTheme(systemTheme);
                }
            }
        });
    }

    /**
     * Notify listeners of theme change
     * @param {string} newTheme - New theme name
     * @param {string} oldTheme - Old theme name
     * @private
     */
    _notifyListeners(newTheme, oldTheme) {
        for (const listener of this.listeners) {
            try {
                listener(newTheme, oldTheme);
            } catch (error) {
                console.warn('Error in theme change listener:', error);
            }
        }
    }
}

export default ThemeManager;