/**
 * Unified Population Loader Service
 * Provides consistent population loading across all pages
 */

export class PopulationLoader {
  constructor() {
    this.loadingStates = new Map(); // Track loading state per dropdown
    this.cache = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.lastCacheTime = null;
  }

  /**
   * Load populations for a specific dropdown
   * @param {string} dropdownId - The ID of the dropdown element
   * @param {object} options - Loading options
   */
  async loadPopulations(dropdownId, options = {}) {
    const {
      useCache = true,
      showLoading = true,
      onSuccess = null,
      onError = null
    } = options;

    // Prevent concurrent loading for the same dropdown
    if (this.loadingStates.get(dropdownId)) {
      console.log(`🔄 Already loading populations for ${dropdownId}, skipping...`);
      return;
    }

    this.loadingStates.set(dropdownId, true);
    console.log(`🔄 Loading populations for dropdown: ${dropdownId}`);

    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
      console.warn(`❌ Dropdown element not found: ${dropdownId}`);
      this.loadingStates.set(dropdownId, false);
      return;
    }

    try {
      // Show loading state with inline spinner
      if (showLoading) {
        dropdown.innerHTML = '<option value="">Loading populations…</option>';
        dropdown.disabled = true;
        // Insert a small spinner element next to the dropdown if a sibling button exists
        try {
          const container = dropdown.parentElement;
          if (container && !container.querySelector('.pop-spinner')) {
            const spinner = document.createElement('span');
            spinner.className = 'pop-spinner';
            spinner.style.cssText = 'display:inline-block;width:16px;height:16px;margin-left:8px;border:2px solid #93c5fd;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;';
            container.appendChild(spinner);
          }
        } catch (_) { /* non-blocking */ }
      }

      // Check cache first
      if (useCache && this.isCacheValid()) {
        console.log(`📦 Using cached populations for ${dropdownId}`);
        this.populateDropdown(dropdown, this.cache);
        if (onSuccess) {onSuccess(this.cache);}
        return;
      }

      // Fetch from server (primary)
      console.log(`🌐 Fetching populations from server for ${dropdownId}`);
      let populations = [];
      try {
        const response = await fetch('/api/populations');
        if (response.ok) {
          const result = await response.json();
          console.log(`📊 Populations response for ${dropdownId}:`, result);
          populations = result?.data?.message?.populations
                        || result?.message?.populations
                        || result?.data?.populations
                        || result?.populations
                        || [];
        } else {
          console.warn(`⚠️ /api/populations returned ${response.status}`);
        }
      } catch (e) {
        console.warn('⚠️ /api/populations request failed:', e.message);
      }

      // Fallback: /api/settings (may include cache)
      if (!Array.isArray(populations) || populations.length === 0) {
        try {
          const resp = await fetch('/api/settings');
          if (resp.ok) {
            const payload = await resp.json().catch(() => ({}));
            // Standardized API shape { success, data }
            const settings = payload && (payload.success ? (payload.data || {}) : payload);
            populations = (settings && (settings.populationCache || settings.populations || (settings.data && settings.data.populations))) || [];
            console.log('📦 Populations from /api/settings:', populations?.length || 0);
          }
        } catch (_) { /* ignore */ }
      }

      // Fallback 3: injected window.settingsJson
      if ((!Array.isArray(populations) || populations.length === 0) && typeof window !== 'undefined' && window.settingsJson) {
        const injected = window.settingsJson;
        populations = injected.populations || injected.populationCache || [];
        console.log('📦 Populations from window.settingsJson:', populations?.length || 0);
      }

      console.log(`📊 Extracted ${populations.length} populations for ${dropdownId}`);

      if (populations.length === 0) {
        dropdown.innerHTML = '<option value="">No populations found</option>';
        dropdown.disabled = false;
        if (onError) {onError(new Error('No populations found'));}
        return;
      }

      // Cache the populations
      this.cache = populations;
      this.lastCacheTime = Date.now();

      // Populate dropdown
      this.populateDropdown(dropdown, populations);

      if (onSuccess) {onSuccess(populations);}
      console.log(`✅ Successfully loaded ${populations.length} populations for ${dropdownId}`);

    } catch (error) {
      console.error(`❌ Error loading populations for ${dropdownId}:`, error);
      dropdown.innerHTML = '<option value="">Error loading populations</option>';
      dropdown.disabled = false;
      if (onError) {onError(error);}
    } finally {
      this.loadingStates.set(dropdownId, false);
      // Remove spinner if present
      try {
        const container = dropdown.parentElement;
        const sp = container && container.querySelector('.pop-spinner');
        if (sp) { sp.remove(); }
      } catch (_) {}
    }
  }

  /**
   * Populate a dropdown with populations
   * @param {HTMLSelectElement} dropdown - The dropdown element
   * @param {Array} populations - Array of population objects
   */
  populateDropdown(dropdown, populations) {
    dropdown.innerHTML = '<option value="">Select a population...</option>';

    populations.forEach((population, index) => {
      console.log(`📝 Adding population ${index + 1} to ${dropdown.id}:`, population);
      const option = document.createElement('option');
      option.value = population.id || population.populationId || population.value || '';
      const name = population.name || population.label || population.text || 'Unnamed Population';
      option.textContent = `${name}${population.userCount ? ` (${population.userCount} users)` : ''}`;
      option.dataset.population = JSON.stringify(population);
      dropdown.appendChild(option);
    });

    dropdown.disabled = false;
    console.log(`✅ Dropdown ${dropdown.id} populated with ${populations.length} populations`);
  }

  /**
   * Check if cache is valid
   */
  isCacheValid() {
    if (!this.cache || !this.lastCacheTime) {
      return false;
    }
    return (Date.now() - this.lastCacheTime) < this.cacheExpiry;
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache = null;
    this.lastCacheTime = null;
    console.log('🗑️ Population cache cleared');
  }

  /**
   * Refresh populations for all managed dropdowns
   */
  async refreshAll() {
    this.clearCache();
    const dropdownIds = Array.from(this.loadingStates.keys());
    console.log(`🔄 Refreshing populations for ${dropdownIds.length} dropdowns`);

    for (const dropdownId of dropdownIds) {
      await this.loadPopulations(dropdownId, { useCache: false });
    }
  }

  /**
   * Get cached populations
   */
  getCachedPopulations() {
    return this.isCacheValid() ? this.cache : null;
  }
}

// Create singleton instance
export const populationLoader = new PopulationLoader();
export default populationLoader;
