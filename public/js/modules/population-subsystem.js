/**
 * Population Subsystem
 * Centralized population management system for dropdown handling and population operations
 * Provides population loading, caching, filtering, and event integration
 */

export class PopulationSubsystem {
    constructor(eventBus, settingsSubsystem, loggingSubsystem, apiClient) {
        this.eventBus = eventBus;
        this.settingsSubsystem = settingsSubsystem;
        this.loggingSubsystem = loggingSubsystem;
        this.apiClient = apiClient;
        
        // Population cache
        this.populationCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.lastCacheUpdate = null;
        
        // Population loading state
        this.isLoading = false;
        this.loadingPromise = null;
        
        // Dropdown management
        this.managedDropdowns = new Set();
        this.dropdownConfigs = new Map();
        
        // Initialize subsystem
        this.init();
        
        if (this.loggingSubsystem) {
            this.loggingSubsystem.info('PopulationSubsystem initialized successfully', {}, 'system');
        }
    }
    
    /**
     * Initialize the population subsystem
     */
    async init() {
        try {
            // Set up event listeners
            this.setupEventListeners();
            
            // Load cached populations if available
            this.loadCachedPopulations();
            
            if (this.loggingSubsystem) {
                this.loggingSubsystem.info('PopulationSubsystem initialization complete', {
                    cachedPopulations: this.populationCache.size
                }, 'system');
            }
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error('Failed to initialize PopulationSubsystem', error, 'system');
            }
            throw error;
        }
    }
    
    /**
     * Set up event listeners for cross-subsystem communication
     */
    setupEventListeners() {
        if (this.eventBus) {
            // Listen for settings changes that might affect populations
            this.eventBus.on('settingsChanged', () => {
                this.invalidateCache();
            });
            
            // Listen for authentication events
            this.eventBus.on('authenticationSuccess', () => {
                this.refreshPopulations();
            });
            
            this.eventBus.on('authenticationFailed', () => {
                this.clearCache();
            });
            
            // Listen for population refresh requests
            this.eventBus.on('refreshPopulations', (data) => {
                this.refreshPopulations(data.force);
            });
            
            // Listen for dropdown registration
            this.eventBus.on('registerDropdown', (data) => {
                this.registerDropdown(data.dropdownId, data.config);
            });
        }
    }
    
    /**
     * Load populations from API with caching
     */
    async loadPopulations(options = {}) {
        const { force = false, useCache = true } = options;
        if (this.loggingSubsystem) {
            this.loggingSubsystem.info(`[Startup] 🌐 Attempting to load populations...`, { force, useCache }, 'system');
        }
        try {
            // Check cache first if not forcing refresh
            if (!force && useCache && this.isCacheValid()) {
                const cached = this.getCachedPopulations();
                if (cached && cached.length > 0) {
                    if (this.loggingSubsystem) {
                        this.loggingSubsystem.info(`[Startup] 🌐 Populations loaded from cache: ${cached.length} entries`, {}, 'system');
                    }
                    return cached;
                }
            }
            
            // Prevent multiple simultaneous loads
            if (this.isLoading && this.loadingPromise) {
                if (this.loggingSubsystem) {
                    this.loggingSubsystem.info(`[Startup] 🌐 Population loading already in progress...`, {}, 'system');
                }
                return await this.loadingPromise;
            }
            
            this.isLoading = true;
            this.loadingPromise = this.performPopulationLoad();
            
            const populations = await this.loadingPromise;
            if (this.loggingSubsystem) {
                this.loggingSubsystem.info(`[Startup] 🌐 Populations loaded: ${populations.length} entries`, {}, 'system');
            }
            
            // Cache the results
            this.cachePopulations(populations);
            
            // Emit event for UI updates
            if (this.eventBus) {
                this.eventBus.emit('populationsLoaded', {
                    populations,
                    count: populations.length,
                    cached: false
                });
            }
            
            if (this.loggingSubsystem) {
                this.loggingSubsystem.info('Populations loaded successfully', {
                    count: populations.length
                }, 'system');
            }
            
            return populations;
            
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error('Failed to load populations', error, 'system');
            }
            
            // Emit error event
            if (this.eventBus) {
                this.eventBus.emit('populationsLoadFailed', {
                    error: error.message
                });
            }
            
            throw error;
        } finally {
            this.isLoading = false;
            this.loadingPromise = null;
        }
    }
    
    /**
     * Perform the actual population loading from API
     */
    async performPopulationLoad() {
        if (this.loggingSubsystem) {
            this.loggingSubsystem.debug('Starting performPopulationLoad', {}, 'system');
        }
        
        if (!this.apiClient) {
            const error = 'API client not available for population loading';
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error(error, {}, 'system');
            }
            throw new Error(error);
        }
        
        // Check if API client has the required method
        if (typeof this.apiClient.get !== 'function') {
            const error = 'API client does not support HTTP GET requests';
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error(error, { apiClientType: typeof this.apiClient }, 'system');
            }
            throw new Error(error);
        }
        
        if (this.loggingSubsystem) {
            this.loggingSubsystem.debug('Making API call to /api/populations', {}, 'system');
        }
        
        try {
            // Load populations from API using the /api/populations endpoint
            const response = await this.apiClient.get('/api/populations');
            
            if (this.loggingSubsystem) {
                this.loggingSubsystem.debug('API response received', { 
                    hasResponse: !!response, 
                    hasPopulations: !!(response && response.populations),
                    populationsIsArray: !!(response && Array.isArray(response.populations)),
                    populationCount: response && response.populations ? response.populations.length : 0
                }, 'system');
            }
            
            if (!response || !Array.isArray(response.populations)) {
                const error = 'Invalid populations response from API';
                if (this.loggingSubsystem) {
                    this.loggingSubsystem.error(error, { response }, 'system');
                }
                throw new Error(error);
            }
            
            if (this.loggingSubsystem) {
                this.loggingSubsystem.info(`Successfully loaded ${response.populations.length} populations from API`, {}, 'system');
            }
            
            return response.populations;
            
        } catch (apiError) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error('API call to /api/populations failed', { 
                    error: apiError.message,
                    stack: apiError.stack 
                }, 'system');
            }
            throw apiError;
        }
    }
    
    /**
     * Populate a dropdown with populations
     */
    async populateDropdown(dropdownId, config = {}) {
        try {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.debug(`[DIAG] Starting population dropdown population for: ${dropdownId}`, config, 'system');
            }
            this.hideDropdownError(dropdownId);
            const {
                includeEmpty = true,
                emptyText = 'Select a population',
                emptyValue = '',
                filter = null,
                sortBy = 'name',
                sortOrder = 'asc'
            } = config;
            
            // Register dropdown for management
            this.registerDropdown(dropdownId, config);
            
            const dropdown = document.getElementById(dropdownId);
            if (!dropdown) {
                const error = `Dropdown element not found: ${dropdownId}`;
                if (this.loggingSubsystem) {
                    this.loggingSubsystem.error(error, {}, 'system');
                }
                throw new Error(error);
            }
            
            if (this.loggingSubsystem) {
                this.loggingSubsystem.debug(`Dropdown element found, showing loading state for: ${dropdownId}`, {}, 'system');
            }
            
            // Show loading state
            this.showDropdownLoading(dropdown);
            
            if (this.loggingSubsystem) {
                this.loggingSubsystem.debug(`Loading populations for dropdown: ${dropdownId}`, {}, 'system');
            }
            
            // Load populations
            const populations = await this.loadPopulations();
            if (this.loggingSubsystem) {
                this.loggingSubsystem.info(`[DIAG] Populations data for dropdown ${dropdownId}:`, { populations }, 'system');
            }
            // Filter populations if needed
            let filteredPopulations = populations;
            if (filter && typeof filter === 'function') {
                filteredPopulations = populations.filter(filter);
            }
            
            // Sort populations
            filteredPopulations = this.sortPopulations(filteredPopulations, sortBy, sortOrder);
            
            // Clear existing options
            dropdown.innerHTML = '';
            
            // Add empty option if requested
            if (includeEmpty) {
                const emptyOption = document.createElement('option');
                emptyOption.value = emptyValue;
                emptyOption.textContent = emptyText;
                dropdown.appendChild(emptyOption);
            }
            
            // Add population options
            filteredPopulations.forEach(population => {
                const option = document.createElement('option');
                option.value = population.id;
                option.textContent = population.name;
                option.dataset.populationId = population.id;
                option.dataset.populationName = population.name;
                dropdown.appendChild(option);
            });
            
            // Hide loading state
            this.hideDropdownLoading(dropdown);
            
            // Emit event for UI updates
            if (this.eventBus) {
                this.eventBus.emit('dropdownPopulated', {
                    dropdownId,
                    populationCount: filteredPopulations.length
                });
            }
            
            if (this.loggingSubsystem) {
                this.loggingSubsystem.debug('Dropdown populated successfully', {
                    dropdownId,
                    populationCount: filteredPopulations.length
                }, 'system');
            }
            
            return true;
            
        } catch (error) {
            this.showDropdownError(dropdownId, error.message);
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error(`[DIAG] Failed to populate dropdown: ${dropdownId} - ${error.message}`, {}, 'system');
            }
            return false;
        }
    }
    
    /**
     * Register a dropdown for management
     */
    registerDropdown(dropdownId, config = {}) {
        this.managedDropdowns.add(dropdownId);
        this.dropdownConfigs.set(dropdownId, config);
        
        if (this.loggingSubsystem) {
            this.loggingSubsystem.debug('Dropdown registered', { dropdownId }, 'system');
        }
    }
    
    /**
     * Refresh all managed dropdowns
     */
    async refreshAllDropdowns() {
        try {
            const refreshPromises = Array.from(this.managedDropdowns).map(dropdownId => {
                const config = this.dropdownConfigs.get(dropdownId) || {};
                return this.populateDropdown(dropdownId, config);
            });
            
            await Promise.all(refreshPromises);
            
            if (this.loggingSubsystem) {
                this.loggingSubsystem.info('All dropdowns refreshed', {
                    count: this.managedDropdowns.size
                }, 'system');
            }
            
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error('Failed to refresh all dropdowns', error, 'system');
            }
        }
    }
    
    /**
     * Refresh populations and update all dropdowns
     */
    async refreshPopulations(force = false) {
        try {
            // Load fresh populations
            await this.loadPopulations({ force: true });
            
            // Refresh all managed dropdowns
            await this.refreshAllDropdowns();
            
            if (this.loggingSubsystem) {
                this.loggingSubsystem.info('Populations refreshed successfully', {}, 'system');
            }
            
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error('Failed to refresh populations', error, 'system');
            }
        }
    }
    
    /**
     * Sort populations by specified criteria
     */
    sortPopulations(populations, sortBy = 'name', sortOrder = 'asc') {
        return populations.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];
            
            // Handle string comparison
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            let comparison = 0;
            if (aValue < bValue) {
                comparison = -1;
            } else if (aValue > bValue) {
                comparison = 1;
            }
            
            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }
    
    /**
     * Show loading state for dropdown
     */
    showDropdownLoading(dropdown) {
        let spinner = dropdown.parentElement.querySelector('.dropdown-spinner');
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.className = 'dropdown-spinner';
            spinner.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
            dropdown.parentElement.insertBefore(spinner, dropdown);
            if (this.loggingSubsystem) {
                this.loggingSubsystem.debug(`[DIAG] Spinner created for dropdown: ${dropdown.id}`, {}, 'system');
            }
        } else {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.debug(`[DIAG] Spinner already exists for dropdown: ${dropdown.id}`, {}, 'system');
            }
        }
        spinner.style.display = 'inline-block';
        dropdown.disabled = true;
        if (this.loggingSubsystem) {
            this.loggingSubsystem.debug(`[DIAG] Spinner shown for dropdown: ${dropdown.id}`, {}, 'system');
        }
    }

    /**
     * Hide loading state for dropdown
     */
    hideDropdownLoading(dropdown) {
        const spinner = dropdown.parentElement.querySelector('.dropdown-spinner');
        if (spinner) {
            spinner.style.display = 'none';
            if (this.loggingSubsystem) {
                this.loggingSubsystem.debug(`[DIAG] Spinner hidden for dropdown: ${dropdown.id}`, {}, 'system');
            }
        }
        dropdown.disabled = false;
    }

    /**
     * Show error state for dropdown
     */
    showDropdownError(dropdownId, errorMsg) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error(`[DIAG] Dropdown not found for error banner: ${dropdownId}`, {}, 'system');
            }
            return;
        }
        let errorBanner = dropdown.parentElement.querySelector('.dropdown-error-banner');
        if (errorBanner) errorBanner.remove();
        errorBanner = document.createElement('div');
        errorBanner.className = 'dropdown-error-banner alert alert-danger';
        errorBanner.textContent = `Population load failed: ${errorMsg}`;
        dropdown.parentElement.insertBefore(errorBanner, dropdown);
        dropdown.disabled = true;
        if (this.loggingSubsystem) {
            this.loggingSubsystem.error(`[DIAG] Error banner shown for dropdown: ${dropdownId} - ${errorMsg}`, {}, 'system');
        }
    }

    hideDropdownError(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;
        let errorBanner = dropdown.parentElement.querySelector('.dropdown-error-banner');
        if (errorBanner) {
            errorBanner.remove();
            if (this.loggingSubsystem) {
                this.loggingSubsystem.debug(`[DIAG] Error banner removed for dropdown: ${dropdownId}`, {}, 'system');
            }
        }
        dropdown.disabled = false;
    }

    /**
     * Cache populations with timestamp
     */
    cachePopulations(populations) {
        this.populationCache.set('populations', populations);
        this.lastCacheUpdate = Date.now();
        
        // Save to localStorage for persistence
        try {
            localStorage.setItem('pingone-populations-cache', JSON.stringify({
                populations,
                timestamp: this.lastCacheUpdate
            }));
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.warn('Failed to save populations to localStorage', error, 'system');
            }
        }
    }
    
    /**
     * Get cached populations
     */
    getCachedPopulations() {
        return this.populationCache.get('populations') || [];
    }
    
    /**
     * Check if cache is valid
     */
    isCacheValid() {
        if (!this.lastCacheUpdate) {
            return false;
        }
        
        const age = Date.now() - this.lastCacheUpdate;
        return age < this.cacheExpiry;
    }
    
    /**
     * Load cached populations from localStorage
     */
    loadCachedPopulations() {
        try {
            const cached = localStorage.getItem('pingone-populations-cache');
            if (cached) {
                const { populations, timestamp } = JSON.parse(cached);
                
                // Check if cache is still valid
                const age = Date.now() - timestamp;
                if (age < this.cacheExpiry) {
                    this.populationCache.set('populations', populations);
                    this.lastCacheUpdate = timestamp;
                    
                    if (this.loggingSubsystem) {
                        this.loggingSubsystem.debug('Loaded populations from localStorage cache', {
                            count: populations.length,
                            age: Math.round(age / 1000)
                        }, 'system');
                    }
                }
            }
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.warn('Failed to load populations from localStorage', error, 'system');
            }
        }
    }
    
    /**
     * Invalidate cache
     */
    invalidateCache() {
        this.populationCache.clear();
        this.lastCacheUpdate = null;
        
        // Clear localStorage cache
        try {
            localStorage.removeItem('pingone-populations-cache');
        } catch (error) {
            // Ignore localStorage errors
        }
        
        if (this.loggingSubsystem) {
            this.loggingSubsystem.debug('Population cache invalidated', {}, 'system');
        }
    }
    
    /**
     * Clear cache completely
     */
    clearCache() {
        this.invalidateCache();
        
        if (this.loggingSubsystem) {
            this.loggingSubsystem.debug('Population cache cleared', {}, 'system');
        }
    }
    
    /**
     * Get population by ID
     */
    async getPopulationById(populationId) {
        try {
            const populations = await this.loadPopulations();
            return populations.find(pop => pop.id === populationId) || null;
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error('Failed to get population by ID', {
                    populationId,
                    error: error.message
                }, 'system');
            }
            return null;
        }
    }
    
    /**
     * Search populations by name
     */
    async searchPopulations(searchTerm) {
        try {
            const populations = await this.loadPopulations();
            const searchLower = searchTerm.toLowerCase();
            
            return populations.filter(pop => 
                pop.name.toLowerCase().includes(searchLower) ||
                (pop.description && pop.description.toLowerCase().includes(searchLower))
            );
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error('Failed to search populations', {
                    searchTerm,
                    error: error.message
                }, 'system');
            }
            return [];
        }
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            isValid: this.isCacheValid(),
            lastUpdate: this.lastCacheUpdate,
            age: this.lastCacheUpdate ? Date.now() - this.lastCacheUpdate : null,
            populationCount: this.getCachedPopulations().length,
            managedDropdowns: this.managedDropdowns.size
        };
    }
}

// Export for use in other modules
export default PopulationSubsystem;
