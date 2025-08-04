/**
 * Settings Loader
 * 
 * This script loads settings from the server API and makes them available
 * as window.settingsJson before the application initializes.
 * 
 * @version 1.0.0
 */

(function() {
    // Execute immediately on script load
    loadSettingsFromAPI();

    /**
     * Load settings from the API and set them as window.settingsJson
     */
    async function loadSettingsFromAPI() {
        try {
            console.log('[SETTINGS_LOADER_CRITICAL] 🔄 Fetching settings from API...');
            
            // Fetch settings from the credentials endpoint which includes all data
            const response = await fetch('/api/settings/credentials');
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success || !data.credentials) {
                throw new Error('Invalid response format from settings API');
            }
            
            // Set the credentials as window.settingsJson for the SettingsManager to use
            window.settingsJson = {
                // Standardized keys (primary)
                pingone_environment_id: data.credentials.environmentId,
                pingone_client_id: data.credentials.clientId,
                pingone_client_secret: data.credentials.clientSecret,
                pingone_region: data.credentials.region,
                
                // Legacy keys for backward compatibility
                environmentId: data.credentials.environmentId,
                apiClientId: data.credentials.clientId,
                apiSecret: data.credentials.clientSecret,
                region: data.credentials.region
            };
            
            console.log('[SETTINGS_LOADER_CRITICAL] ✅ Settings loaded successfully', {
                hasEnvironmentId: !!window.settingsJson.pingone_environment_id,
                hasClientId: !!window.settingsJson.pingone_client_id,
                hasClientSecret: !!window.settingsJson.pingone_client_secret,
                hasRegion: !!window.settingsJson.pingone_region
            });
            
        } catch (error) {
            console.error('[SETTINGS_LOADER_CRITICAL] ❌ Failed to load settings from API', error);
            // Initialize with empty object to prevent errors
            window.settingsJson = {};
        }
    }
})();
