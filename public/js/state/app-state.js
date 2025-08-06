/**
 * Centralized Application State Management
 * 
 * Provides a centralized state management system for the frontend
 * with subscription-based updates and state persistence.
 */

/**
 * Application State Manager
 * 
 * Manages global application state with reactive updates
 * and subscription-based notifications.
 */
class AppStateManager {
  constructor() {
    this.state = {
      // User and authentication
      user: null,
      isAuthenticated: false,
      token: null,
      tokenExpiry: null,
      
      // Application settings
      settings: null,
      populations: [],
      selectedPopulation: null,
      
      // Current operation state
      currentOperation: null,
      operationProgress: null,
      operationHistory: [],
      
      // UI state
      ui: {
        loading: false,
        errors: [],
        notifications: [],
        modals: {
          disclaimer: { visible: false },
          credentials: { visible: false },
          settings: { visible: false }
        },
        sidebar: {
          collapsed: false,
          activeItem: 'dashboard'
        }
      },
      
      // Real-time connection state
      connection: {
        status: 'disconnected',
        transport: null,
        lastHeartbeat: null,
        reconnectAttempts: 0
      },
      
      // Feature flags
      features: {
        progressPage: false,
        advancedLogging: false,
        realTimeUpdates: true
      }
    };
    
    this.subscribers = new Map();
    this.middleware = [];
    this.history = [];
    this.maxHistorySize = 50;
    
    // Load persisted state
    this.loadPersistedState();
    
    // Setup auto-save
    this.setupAutoSave();
  }

  /**
   * Subscribe to state changes
   * @param {string|Array} keys - State keys to watch
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(keys, callback) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const subscriptionId = `${Date.now()}_${Math.random()}`;
    
    keyArray.forEach(key => {
      if (!this.subscribers.has(key)) {
        this.subscribers.set(key, new Map());
      }
      this.subscribers.get(key).set(subscriptionId, callback);
    });
    
    // Return unsubscribe function
    return () => {
      keyArray.forEach(key => {
        if (this.subscribers.has(key)) {
          this.subscribers.get(key).delete(subscriptionId);
        }
      });
    };
  }

  /**
   * Update state with new values
   * @param {Object} updates - State updates
   * @param {Object} options - Update options
   */
  setState(updates, options = {}) {
    const { 
      merge = true, 
      notify = true, 
      persist = true,
      source = 'unknown'
    } = options;
    
    const oldState = this.deepClone(this.state);
    
    // Apply middleware
    let processedUpdates = updates;
    for (const middleware of this.middleware) {
      processedUpdates = middleware(processedUpdates, oldState, options);
    }
    
    // Update state
    if (merge) {
      this.state = this.deepMerge(this.state, processedUpdates);
    } else {
      this.state = { ...processedUpdates };
    }
    
    // Add to history
    this.addToHistory({
      timestamp: Date.now(),
      updates: processedUpdates,
      source,
      oldState: this.getRelevantState(processedUpdates, oldState),
      newState: this.getRelevantState(processedUpdates, this.state)
    });
    
    // Notify subscribers
    if (notify) {
      this.notifySubscribers(processedUpdates, oldState, this.state);
    }
    
    // Persist state
    if (persist) {
      this.persistState();
    }
  }

  /**
   * Get current state or specific state slice
   * @param {string} key - State key (optional)
   * @returns {*} State value
   */
  getState(key = null) {
    if (key === null) {
      return this.deepClone(this.state);
    }
    
    return this.getNestedValue(this.state, key);
  }

  /**
   * Add middleware for state updates
   * @param {Function} middleware - Middleware function
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Clear all state and reset to defaults
   */
  reset() {
    const defaultState = {
      user: null,
      isAuthenticated: false,
      token: null,
      tokenExpiry: null,
      settings: null,
      populations: [],
      selectedPopulation: null,
      currentOperation: null,
      operationProgress: null,
      operationHistory: [],
      ui: {
        loading: false,
        errors: [],
        notifications: [],
        modals: {
          disclaimer: { visible: false },
          credentials: { visible: false },
          settings: { visible: false }
        },
        sidebar: {
          collapsed: false,
          activeItem: 'dashboard'
        }
      },
      connection: {
        status: 'disconnected',
        transport: null,
        lastHeartbeat: null,
        reconnectAttempts: 0
      },
      features: {
        progressPage: false,
        advancedLogging: false,
        realTimeUpdates: true
      }
    };
    
    this.setState(defaultState, { merge: false, source: 'reset' });
  }

  /**
   * Get state history
   * @param {number} limit - Number of history entries to return
   * @returns {Array} State history
   */
  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }

  /**
   * Notify subscribers of state changes
   * @param {Object} updates - State updates
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   */
  notifySubscribers(updates, oldState, newState) {
    const changedKeys = this.getChangedKeys(updates);
    
    changedKeys.forEach(key => {
      if (this.subscribers.has(key)) {
        const callbacks = this.subscribers.get(key);
        callbacks.forEach(callback => {
          try {
            callback(newState, oldState, key);
          } catch (error) {
            console.error('State subscriber error:', error);
          }
        });
      }
    });
  }

  /**
   * Get all keys that changed in the update
   * @param {Object} updates - State updates
   * @param {string} prefix - Key prefix
   * @returns {Array} Changed keys
   */
  getChangedKeys(updates, prefix = '') {
    const keys = [];
    
    for (const [key, value] of Object.entries(updates)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...this.getChangedKeys(value, fullKey));
      }
    }
    
    return keys;
  }

  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.deepMerge(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Deep clone an object
   * @param {*} obj - Object to clone
   * @returns {*} Cloned object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }
    
    const cloned = {};
    for (const [key, value] of Object.entries(obj)) {
      cloned[key] = this.deepClone(value);
    }
    
    return cloned;
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to search
   * @param {string} path - Dot notation path
   * @returns {*} Value at path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Get relevant state slice for history
   * @param {Object} updates - State updates
   * @param {Object} state - Full state
   * @returns {Object} Relevant state slice
   */
  getRelevantState(updates, state) {
    const relevant = {};
    
    for (const key of Object.keys(updates)) {
      if (state[key] !== undefined) {
        relevant[key] = state[key];
      }
    }
    
    return relevant;
  }

  /**
   * Add entry to state history
   * @param {Object} entry - History entry
   */
  addToHistory(entry) {
    this.history.push(entry);
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Load persisted state from localStorage
   */
  loadPersistedState() {
    try {
      const persistedState = localStorage.getItem('appState');
      if (persistedState) {
        const parsed = JSON.parse(persistedState);
        
        // Only restore certain parts of state
        const restorableState = {
          settings: parsed.settings,
          ui: {
            sidebar: parsed.ui?.sidebar
          },
          features: parsed.features
        };
        
        this.setState(restorableState, { 
          notify: false, 
          persist: false, 
          source: 'persistence' 
        });
      }
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
    }
  }

  /**
   * Persist state to localStorage
   */
  persistState() {
    try {
      // Only persist certain parts of state
      const persistableState = {
        settings: this.state.settings,
        ui: {
          sidebar: this.state.ui.sidebar
        },
        features: this.state.features
      };
      
      localStorage.setItem('appState', JSON.stringify(persistableState));
    } catch (error) {
      console.warn('Failed to persist state:', error);
    }
  }

  /**
   * Setup automatic state persistence
   */
  setupAutoSave() {
    // Debounced save function
    let saveTimeout;
    const debouncedSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        this.persistState();
      }, 1000);
    };
    
    // Subscribe to all state changes for auto-save
    this.subscribe('*', debouncedSave);
  }
}

// Create global state instance
export const appState = new AppStateManager();

// State action creators for common operations
export const actions = {
  // Authentication actions
  setUser(user) {
    appState.setState({
      user,
      isAuthenticated: !!user
    }, { source: 'auth' });
  },

  setToken(token, expiry) {
    appState.setState({
      token,
      tokenExpiry: expiry
    }, { source: 'auth' });
  },

  // UI actions
  setLoading(loading) {
    appState.setState({
      ui: { loading }
    }, { source: 'ui' });
  },

  addError(error) {
    const currentErrors = appState.getState('ui.errors') || [];
    appState.setState({
      ui: {
        errors: [...currentErrors, {
          id: Date.now(),
          message: error,
          timestamp: new Date().toISOString()
        }]
      }
    }, { source: 'ui' });
  },

  removeError(errorId) {
    const currentErrors = appState.getState('ui.errors') || [];
    appState.setState({
      ui: {
        errors: currentErrors.filter(error => error.id !== errorId)
      }
    }, { source: 'ui' });
  },

  addNotification(notification) {
    const currentNotifications = appState.getState('ui.notifications') || [];
    appState.setState({
      ui: {
        notifications: [...currentNotifications, {
          id: Date.now(),
          ...notification,
          timestamp: new Date().toISOString()
        }]
      }
    }, { source: 'ui' });
  },

  // Operation actions
  setCurrentOperation(operation) {
    appState.setState({
      currentOperation: operation
    }, { source: 'operation' });
  },

  updateProgress(progress) {
    appState.setState({
      operationProgress: progress
    }, { source: 'operation' });
  },

  // Connection actions
  setConnectionStatus(status, transport = null) {
    appState.setState({
      connection: {
        status,
        transport,
        lastHeartbeat: status === 'connected' ? Date.now() : null
      }
    }, { source: 'connection' });
  }
};

// Export state selectors for common queries
export const selectors = {
  isAuthenticated: () => appState.getState('isAuthenticated'),
  getCurrentUser: () => appState.getState('user'),
  getToken: () => appState.getState('token'),
  isLoading: () => appState.getState('ui.loading'),
  getErrors: () => appState.getState('ui.errors') || [],
  getNotifications: () => appState.getState('ui.notifications') || [],
  getCurrentOperation: () => appState.getState('currentOperation'),
  getProgress: () => appState.getState('operationProgress'),
  getConnectionStatus: () => appState.getState('connection.status'),
  getSettings: () => appState.getState('settings'),
  getPopulations: () => appState.getState('populations') || [],
  getSelectedPopulation: () => appState.getState('selectedPopulation')
};

export default appState;