// Simplified Settings Manager for Import Maps prototype
class SettingsManager {
    constructor() {
        this.settings = new Map();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('SettingsManager: Initializing...');
        await this.loadSettings();
        this.initialized = true;
        console.log('SettingsManager: Initialized successfully');
    }

    async loadSettings() {
        try {
            // Simulate loading settings from API
            const response = await fetch('/api/settings');
            if (response.ok) {
                const settings = await response.json();
                Object.entries(settings).forEach(([key, value]) => {
                    this.settings.set(key, value);
                });
                console.log('SettingsManager: Settings loaded from API');
            } else {
                console.warn('SettingsManager: Failed to load settings from API, using defaults');
                this.loadDefaultSettings();
            }
        } catch (error) {
            console.error('SettingsManager: Error loading settings:', error);
            this.loadDefaultSettings();
        }
    }

    loadDefaultSettings() {
        this.settings.set('environmentId', '');
        this.settings.set('clientId', '');
        this.settings.set('clientSecret', '');
        this.settings.set('region', 'NA');
        this.settings.set('populationId', '');
        console.log('SettingsManager: Default settings loaded');
    }

    get(key) {
        return this.settings.get(key);
    }

    set(key, value) {
        this.settings.set(key, value);
        console.log(`SettingsManager: Setting ${key} updated`);
    }

    async save() {
        try {
            const settingsObj = Object.fromEntries(this.settings);
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settingsObj)
            });
            
            if (response.ok) {
                console.log('SettingsManager: Settings saved successfully');
                return true;
            } else {
                console.error('SettingsManager: Failed to save settings');
                return false;
            }
        } catch (error) {
            console.error('SettingsManager: Error saving settings:', error);
            return false;
        }
    }

    getAll() {
        return Object.fromEntries(this.settings);
    }
}

export default SettingsManager;
