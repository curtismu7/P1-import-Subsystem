// Version Manager - Handles dynamic version and build information
class VersionManager {
    constructor() {
        this.version = '6.5.2.4';
        this.buildNumber = 'bundle-1754041167';
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.updateVersionElements();
        });
    }

    updateVersionElements() {
        // Update all version displays
        const versionElements = document.querySelectorAll('.version-display, .build-display, .version-text');
        versionElements.forEach(el => {
            if (el.classList.contains('version-display')) {
                el.textContent = `v${this.version} | Build: ${this.buildNumber}`;
            } else if (el.classList.contains('build-display')) {
                el.textContent = this.buildNumber;
            } else if (el.classList.contains('version-text')) {
                el.textContent = `v${this.version}`;
            }
        });

        // Update page title if it contains version
        if (document.title.includes('v')) {
            document.title = document.title.replace(/v\d+\.\d+\.\d+\.\d+/, `v${this.version}`);
        }
    }

    // Public method to get version info
    getVersionInfo() {
        return {
            version: this.version,
            build: this.buildNumber,
            fullVersion: `v${this.version} (${this.buildNumber})`
        };
    }
}

// Initialize the version manager
window.versionManager = new VersionManager();
