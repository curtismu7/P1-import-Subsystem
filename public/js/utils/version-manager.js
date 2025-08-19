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
      // Get version from server (standardized API response)
      // The backend exposes /api/version => { success, message, data: { version } }
      const response = await fetch('/api/version');
      const payload = await response.json();

      // Prefer payload.data.version, fallback to payload.version for legacy
      const resolved = (payload && payload.data && payload.data.version) || payload.version;
      this.version = resolved || '7.4.6.0';
      this.updateVersionDisplays();
      this.updatePageTitle();
      this.initialized = true;
      
      console.log(`Version Manager initialized: ${this.version}`);
    } catch (error) {
      console.warn('Failed to load version info:', error);
      // Fallback to known app version if server call fails
      this.version = '7.4.6.0';
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