export class VersionManager {
    constructor() {
        this.version = '5.5'; // Update this with each new version
        console.log(`Version Manager initialized with version ${this.version}`);
    }

    getVersion() {
        return this.version;
    }

    getFormattedVersion() {
        return `v${this.version}`;
    }

    updateTitle() {
        // Update the main title
        const title = document.querySelector('h1');
        if (title) {
            // Remove any existing version number
            const baseTitle = title.textContent.replace(/\s*\(v\d+\.\d+\.\d+\)\s*$/, '').trim();
            title.textContent = `${baseTitle} (${this.getFormattedVersion()})`;
        }

        // Update the document title
        document.title = `PingOne User Import ${this.getFormattedVersion()}`;

        // Update the import button text
        this.updateImportButton();

        // Update the top version badge
        this.updateTopVersionBadge();

        // Add version badge to the sidebar above the Ping Identity logo
        this.addSidebarVersionBadge();
    }
    
    updateImportButton() {
        const importButton = document.getElementById('start-import-btn');
        if (importButton) {
            const baseText = importButton.textContent.replace(/\s*\(v\d+\.\d+\.\d+\)\s*$/, '').trim();
            importButton.innerHTML = `<i class="pi pi-upload"></i> ${baseText} (${this.getFormattedVersion()})`;
        }
    }

    updateTopVersionBadge() {
        const versionText = document.getElementById('version-text');
        if (versionText) {
            versionText.textContent = this.getFormattedVersion();
        }
    }

    addSidebarVersionBadge() {
        // Remove existing badges if they exist
        const existingTopLeftBadge = document.getElementById('top-left-version-badge');
        if (existingTopLeftBadge) {
            existingTopLeftBadge.remove();
        }

        const existingSidebarBadge = document.getElementById('sidebar-version-badge');
        if (existingSidebarBadge) {
            existingSidebarBadge.remove();
        }

        // Check if sidebar version badge already exists
        if (document.getElementById('sidebar-version-badge')) {
            return;
        }

        // Create sidebar version badge
        const badge = document.createElement('div');
        badge.id = 'sidebar-version-badge';
        badge.className = 'sidebar-version-badge';
        badge.textContent = this.getFormattedVersion();
        
        // Find the footer and insert the badge in the footer-left section, after the logo and trademark
        const footer = document.querySelector('.ping-footer');
        if (footer) {
            const footerLeft = footer.querySelector('.footer-left');
            if (footerLeft) {
                // Insert the badge after the footer-logo div
                const logoDiv = footerLeft.querySelector('.footer-logo');
                if (logoDiv) {
                    // Insert after the logo div
                    footerLeft.insertBefore(badge, logoDiv.nextSibling);
                } else {
                    // Fallback: insert at the beginning of footer-left
                    footerLeft.insertBefore(badge, footerLeft.firstChild);
                }
            } else {
                // Fallback: insert at the end of the footer
                footer.appendChild(badge);
            }
        } else {
            // Fallback: add to body if footer not found
            document.body.appendChild(badge);
        }
    }
}

// ES Module export
