/**
 * Version Manager - Import Maps Compatible
 * 
 * Manages version display and updates across the application
 * Works with ES modules and import maps
 */

export class VersionManager {
  constructor() {
    this.version = null;
    this.initialized = false;
  }

  async init() {
    try {
      // Get version from server
      const response = await fetch('/api/module-info');
      const data = await response.json();
      
      this.version = data.version || '7.1.0';
      this.updateVersionDisplays();
      this.updatePageTitle();
      this.initialized = true;
      
      console.log(`Version Manager initialized: ${this.version}`);
    } catch (error) {
      console.warn('Failed to load version info:', error);
      this.version = '7.1.0'; // Fallback version
      this.updateVersionDisplays();
      this.updatePageTitle();
    }
  }

  updateVersionDisplays() {
    const versionElements = document.querySelectorAll('[data-version]');
    versionElements.forEach(element => {
      element.textContent = `v${this.version}`;
    });
  }

  updatePageTitle() {
    const title = document.title;
    if (!title.includes('v')) {
      document.title = `${title} v${this.version}`;
    }
  }

  getVersion() {
    return this.version;
  }

  isInitialized() {
    return this.initialized;
  }
}

// Export singleton instance
export const versionManager = new VersionManager();

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    versionManager.init();
  });
}

export default VersionManager;