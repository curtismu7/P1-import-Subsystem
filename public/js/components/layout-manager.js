/**
 * Layout Manager
 * 
 * Manages responsive layout, sidebar toggling, and adaptive header heights.
 * Provides consistent layout behavior across the application.
 */

class LayoutManager {
    constructor() {
        this.sidebar = null;
        this.sidebarToggle = null;
        this.mainContent = null;
        this.mobileOverlay = null;
        this.isInitialized = false;
        this.isMobile = false;
        this.sidebarCollapsed = false;
        
        // Breakpoints
        this.breakpoints = {
            mobile: 768,
            tablet: 992,
            desktop: 1200
        };
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupLayout());
        } else {
            this.setupLayout();
        }
        
        this.isInitialized = true;
    }
    
    setupLayout() {
        this.findElements();
        this.createMobileElements();
        this.bindEvents();
        this.checkScreenSize();
        this.updateLayout();
        this.removeDuplicateNavItems();
        this.optimizeHeaderHeight();
        
        console.log('✅ Layout Manager initialized');
    }
    
    findElements() {
        this.sidebar = document.querySelector('.sidebar');
        this.sidebarToggle = document.querySelector('.sidebar-toggle');
        this.mainContent = document.querySelector('.main-content');
        this.appHeader = document.querySelector('.app-header');
        this.contentBody = document.querySelector('.content-body');
    }
    
    createMobileElements() {
        // Create sidebar toggle if it doesn't exist
        if (!this.sidebarToggle && this.sidebar) {
            this.sidebarToggle = document.createElement('button');
            this.sidebarToggle.className = 'sidebar-toggle';
            this.sidebarToggle.innerHTML = '☰';
            this.sidebarToggle.setAttribute('aria-label', 'Toggle sidebar');
            document.body.appendChild(this.sidebarToggle);
        }
        
        // Create mobile overlay
        if (!this.mobileOverlay) {
            this.mobileOverlay = document.createElement('div');
            this.mobileOverlay.className = 'mobile-overlay';
            document.body.appendChild(this.mobileOverlay);
        }
    }
    
    bindEvents() {
        // Sidebar toggle
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Mobile overlay click
        if (this.mobileOverlay) {
            this.mobileOverlay.addEventListener('click', () => this.closeSidebar());
        }
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Escape key to close sidebar on mobile
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobile && !this.sidebar?.classList.contains('mobile-hidden')) {
                this.closeSidebar();
            }
        });
        
        // Focus management for accessibility
        if (this.sidebar) {
            this.sidebar.addEventListener('keydown', (e) => this.handleSidebarKeydown(e));
        }
    }
    
    handleResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.checkScreenSize();
            this.updateLayout();
        }, 150);
    }
    
    checkScreenSize() {
        const width = window.innerWidth;
        const wasMobile = this.isMobile;
        
        this.isMobile = width < this.breakpoints.mobile;
        
        // If switching from mobile to desktop, ensure sidebar is visible
        if (wasMobile && !this.isMobile) {
            this.showSidebar();
            this.hideMobileOverlay();
        }
        
        // If switching from desktop to mobile, hide sidebar
        if (!wasMobile && this.isMobile) {
            this.hideSidebar();
        }
    }
    
    updateLayout() {
        if (!this.sidebar || !this.mainContent) return;
        
        if (this.isMobile) {
            // Mobile layout
            this.sidebar.classList.remove('collapsed');
            this.mainContent.style.marginLeft = '0';
            
            if (this.sidebarToggle) {
                this.sidebarToggle.style.display = 'block';
            }
        } else {
            // Desktop layout
            this.sidebar.classList.remove('mobile-hidden');
            this.hideMobileOverlay();
            
            if (this.sidebarCollapsed) {
                this.sidebar.classList.add('collapsed');
                this.mainContent.style.marginLeft = '60px';
            } else {
                this.sidebar.classList.remove('collapsed');
                this.mainContent.style.marginLeft = '280px';
            }
            
            if (this.sidebarToggle) {
                this.sidebarToggle.style.display = 'block';
            }
        }
    }
    
    toggleSidebar() {
        if (this.isMobile) {
            this.toggleMobileSidebar();
        } else {
            this.toggleDesktopSidebar();
        }
    }
    
    toggleMobileSidebar() {
        const isHidden = this.sidebar?.classList.contains('mobile-hidden');
        
        if (isHidden) {
            this.showSidebar();
            this.showMobileOverlay();
        } else {
            this.closeSidebar();
        }
    }
    
    toggleDesktopSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        this.updateLayout();
        
        // Save preference
        localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed.toString());
        
        // Update toggle button icon
        if (this.sidebarToggle) {
            this.sidebarToggle.innerHTML = this.sidebarCollapsed ? '☰' : '✕';
        }
    }
    
    showSidebar() {
        if (this.sidebar) {
            this.sidebar.classList.remove('mobile-hidden');
        }
    }
    
    hideSidebar() {
        if (this.sidebar) {
            this.sidebar.classList.add('mobile-hidden');
        }
    }
    
    closeSidebar() {
        this.hideSidebar();
        this.hideMobileOverlay();
    }
    
    showMobileOverlay() {
        if (this.mobileOverlay) {
            this.mobileOverlay.classList.add('active');
        }
    }
    
    hideMobileOverlay() {
        if (this.mobileOverlay) {
            this.mobileOverlay.classList.remove('active');
        }
    }
    
    handleSidebarKeydown(e) {
        // Handle keyboard navigation in sidebar
        if (e.key === 'Tab') {
            const focusableElements = this.sidebar.querySelectorAll(
                'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
    
    removeDuplicateNavItems() {
        // Remove duplicate navigation items (e.g., Analytics appearing twice)
        const navItems = document.querySelectorAll('.nav-item');
        const seenItems = new Set();
        
        navItems.forEach(item => {
            const link = item.querySelector('.nav-link');
            if (link) {
                const text = link.textContent.trim();
                const href = link.getAttribute('href');
                const key = `${text}-${href}`;
                
                if (seenItems.has(key)) {
                    console.log(`🗑️ Removing duplicate nav item: ${text}`);
                    item.remove();
                } else {
                    seenItems.add(key);
                }
            }
        });
    }
    
    optimizeHeaderHeight() {
        if (!this.appHeader || !this.contentBody) return;
        
        // Measure actual header height
        const headerHeight = this.appHeader.offsetHeight;
        
        // Apply reduced padding to content body
        this.contentBody.classList.add('reduced-padding');
        
        // Make header compact if it's too tall
        if (headerHeight > 100) {
            this.appHeader.classList.add('compact');
            console.log('📏 Applied compact header styling');
        }
        
        console.log(`📏 Header height optimized: ${headerHeight}px`);
    }
    
    // Public API methods
    getSidebarState() {
        return {
            collapsed: this.sidebarCollapsed,
            mobile: this.isMobile,
            visible: !this.sidebar?.classList.contains('mobile-hidden')
        };
    }
    
    setSidebarCollapsed(collapsed) {
        this.sidebarCollapsed = collapsed;
        this.updateLayout();
    }
    
    // Load saved preferences
    loadPreferences() {
        const savedCollapsed = localStorage.getItem('sidebarCollapsed');
        if (savedCollapsed !== null) {
            this.sidebarCollapsed = savedCollapsed === 'true';
        }
    }
    
    // Initialize with saved preferences
    initWithPreferences() {
        this.loadPreferences();
        this.updateLayout();
    }
}

// Auto-initialize layout manager
const layoutManager = new LayoutManager();

// Make it globally available
window.LayoutManager = layoutManager;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LayoutManager;
}