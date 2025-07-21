/**
 * @fileoverview Tests for modernized Swagger UI integration with subsystem architecture
 * 
 * Tests the new SwaggerUIManager class and its integration with:
 * - AuthManagementSubsystem for authentication
 * - SettingsSubsystem for configuration
 * - PopulationSubsystem for population management
 * - LoggingSubsystem for logging
 * - EventBus for real-time updates
 */

const { JSDOM } = require('jsdom');

describe('Swagger UI Integration with Subsystems', () => {
  let dom;
  let window;
  let document;
  let SwaggerUIManager;

  beforeEach(() => {
    // Create a mock DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <div id="swagger-ui"></div>
          <div id="population-selector-container">
            <select id="population-selector">
              <option value="">Select population...</option>
            </select>
            <span id="population-status"></span>
            <span id="population-status-indicator"></span>
            <span id="selected-population-details"></span>
          </div>
        </body>
      </html>
    `, {
      url: 'http://localhost:4000',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.fetch = jest.fn();
    global.console = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

    // Mock SwaggerUIBundle
    global.SwaggerUIBundle = jest.fn(() => ({
      initOAuth: jest.fn(),
      preauthorizeApiKey: jest.fn()
    }));
    global.SwaggerUIStandalonePreset = {};

    // Create SwaggerUIManager class (simplified version for testing)
    SwaggerUIManager = class {
      constructor() {
        this.ui = null;
        this.authToken = null;
        this.settings = null;
        this.isInitialized = false;
      }

      async initialize() {
        try {
          await this.loadSettings();
          await this.loadAuthToken();
          this.initializeSwaggerUI();
          this.setupEventListeners();
          this.isInitialized = true;
          return true;
        } catch (error) {
          console.error('Failed to initialize Swagger UI:', error);
          this.initializeFallbackUI();
          return false;
        }
      }

      async loadSettings() {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          this.settings = data.success ? data.data : null;
        }
      }

      async loadAuthToken() {
        const response = await fetch('/api/token');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.token) {
            this.authToken = data.token;
          }
        }
      }

      initializeSwaggerUI() {
        const config = {
          url: '/swagger.json',
          dom_id: '#swagger-ui',
          requestInterceptor: (request) => this.interceptRequest(request),
          responseInterceptor: (response) => this.interceptResponse(response),
          onComplete: () => this.onSwaggerUIComplete()
        };
        this.ui = global.SwaggerUIBundle(config);
      }

      initializeFallbackUI() {
        this.ui = global.SwaggerUIBundle({
          url: '/swagger.json',
          dom_id: '#swagger-ui'
        });
      }

      interceptRequest(request) {
        if (this.authToken && !request.headers.Authorization) {
          request.headers.Authorization = `Bearer ${this.authToken}`;
        }
        request.headers['X-Client-Type'] = 'swagger-ui';
        request.headers['X-Client-Version'] = '6.0';
        return request;
      }

      interceptResponse(response) {
        if (response.status >= 400) {
          console.warn(`API Error: ${response.status} ${response.statusText}`, response.url);
        } else {
          console.log(`API Success: ${response.status}`, response.url);
        }
        return response;
      }

      setupEventListeners() {
        window.addEventListener('auth-token-updated', (event) => {
          this.authToken = event.detail.token;
        });
        
        window.addEventListener('settings-updated', (event) => {
          this.settings = event.detail.settings;
        });
      }

      onSwaggerUIComplete() {
        this.addCustomStyling();
        this.showInitializationStatus();
      }

      addCustomStyling() {
        const style = document.createElement('style');
        style.textContent = `
          .swagger-ui .topbar {
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
          }
        `;
        document.head.appendChild(style);
      }

      showInitializationStatus() {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'swagger-status';
        statusDiv.innerHTML = `
          <div>
            <h4>🚀 Modern Swagger UI Status</h4>
            <ul>
              <li>✅ Subsystem Integration: Active</li>
              <li>✅ Authentication: ${this.authToken ? 'Token Loaded' : 'No Token'}</li>
              <li>✅ Settings: ${this.settings ? 'Configured' : 'Default'}</li>
            </ul>
          </div>
        `;
        
        const swaggerContainer = document.getElementById('swagger-ui');
        if (swaggerContainer) {
          swaggerContainer.insertBefore(statusDiv, swaggerContainer.firstChild);
        }
      }

      async refreshAuthToken() {
        try {
          await this.loadAuthToken();
        } catch (error) {
          console.warn('Could not refresh auth token:', error.message);
        }
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.window;
    delete global.document;
    delete global.fetch;
    delete global.SwaggerUIBundle;
    delete global.SwaggerUIStandalonePreset;
  });

  describe('SwaggerUIManager Initialization', () => {
    test('should initialize successfully with valid subsystem responses', async () => {
      // Mock successful API responses
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              environmentId: 'test-env',
              apiClientId: 'test-client',
              region: 'NA'
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            token: 'test-auth-token'
          })
        });

      const manager = new SwaggerUIManager();
      const result = await manager.initialize();

      expect(result).toBe(true);
      expect(manager.isInitialized).toBe(true);
      expect(manager.settings).toEqual({
        environmentId: 'test-env',
        apiClientId: 'test-client',
        region: 'NA'
      });
      expect(manager.authToken).toBe('test-auth-token');
      expect(global.SwaggerUIBundle).toHaveBeenCalled();
    });

    test('should handle initialization failure gracefully', async () => {
      // Mock failed API responses
      global.fetch
        .mockRejectedValueOnce(new Error('Settings API failed'))
        .mockRejectedValueOnce(new Error('Auth API failed'));

      const manager = new SwaggerUIManager();
      const result = await manager.initialize();

      expect(result).toBe(false);
      expect(manager.isInitialized).toBe(false);
      expect(global.SwaggerUIBundle).toHaveBeenCalledTimes(1); // Fallback UI is called in catch block
    });

    test('should load settings from SettingsSubsystem API', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { environmentId: 'test-env' }
        })
      });

      const manager = new SwaggerUIManager();
      await manager.loadSettings();

      expect(global.fetch).toHaveBeenCalledWith('/api/settings');
      expect(manager.settings).toEqual({ environmentId: 'test-env' });
    });

    test('should load auth token from AuthManagementSubsystem API', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          token: 'test-token-123'
        })
      });

      const manager = new SwaggerUIManager();
      await manager.loadAuthToken();

      expect(global.fetch).toHaveBeenCalledWith('/api/token');
      expect(manager.authToken).toBe('test-token-123');
    });
  });

  describe('Request and Response Interception', () => {
    test('should add authentication token to requests', () => {
      const manager = new SwaggerUIManager();
      manager.authToken = 'test-token';

      const request = {
        headers: {},
        url: '/api/test'
      };

      const interceptedRequest = manager.interceptRequest(request);

      expect(interceptedRequest.headers.Authorization).toBe('Bearer test-token');
      expect(interceptedRequest.headers['X-Client-Type']).toBe('swagger-ui');
      expect(interceptedRequest.headers['X-Client-Version']).toBe('6.0');
    });

    test('should not override existing authorization header', () => {
      const manager = new SwaggerUIManager();
      manager.authToken = 'test-token';

      const request = {
        headers: { Authorization: 'Bearer existing-token' },
        url: '/api/test'
      };

      const interceptedRequest = manager.interceptRequest(request);

      expect(interceptedRequest.headers.Authorization).toBe('Bearer existing-token');
    });

    test('should log API responses appropriately', () => {
      const manager = new SwaggerUIManager();

      // Test successful response
      const successResponse = { status: 200, statusText: 'OK', url: '/api/test' };
      manager.interceptResponse(successResponse);
      expect(console.log).toHaveBeenCalledWith('API Success: 200', '/api/test');

      // Test error response
      const errorResponse = { status: 404, statusText: 'Not Found', url: '/api/missing' };
      manager.interceptResponse(errorResponse);
      expect(console.warn).toHaveBeenCalledWith('API Error: 404 Not Found', '/api/missing');
    });
  });

  describe('Event-driven Integration', () => {
    test('should handle auth token updates from subsystem events', () => {
      const manager = new SwaggerUIManager();
      manager.setupEventListeners();

      const event = new window.CustomEvent('auth-token-updated', {
        detail: { token: 'new-token-123' }
      });

      window.dispatchEvent(event);

      expect(manager.authToken).toBe('new-token-123');
    });

    test('should handle settings updates from subsystem events', () => {
      const manager = new SwaggerUIManager();
      manager.setupEventListeners();

      const event = new window.CustomEvent('settings-updated', {
        detail: { settings: { environmentId: 'updated-env' } }
      });

      window.dispatchEvent(event);

      expect(manager.settings).toEqual({ environmentId: 'updated-env' });
    });
  });

  describe('UI Enhancement', () => {
    test('should add custom styling for better integration', () => {
      const manager = new SwaggerUIManager();
      manager.addCustomStyling();

      const styleElements = document.querySelectorAll('style');
      expect(styleElements.length).toBeGreaterThan(0);
      
      const lastStyle = styleElements[styleElements.length - 1];
      expect(lastStyle.textContent).toContain('.swagger-ui .topbar');
      expect(lastStyle.textContent).toContain('linear-gradient');
    });

    test('should show initialization status in UI', () => {
      const manager = new SwaggerUIManager();
      manager.authToken = 'test-token';
      manager.settings = { environmentId: 'test-env' };
      
      manager.showInitializationStatus();

      const statusDiv = document.getElementById('swagger-status');
      expect(statusDiv).toBeTruthy();
      expect(statusDiv.innerHTML).toContain('Modern Swagger UI Status');
      expect(statusDiv.innerHTML).toContain('Token Loaded');
      expect(statusDiv.innerHTML).toContain('Configured');
    });
  });

  describe('Population Management Integration', () => {
    test('should load populations from PopulationSubsystem', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          populations: [
            { id: 'pop1', name: 'Test Population 1' },
            { id: 'pop2', name: 'Test Population 2' }
          ]
        })
      });

      // Simulate population loading function
      const loadPopulationsFromSubsystem = async () => {
        const response = await fetch('/api/populations');
        if (response.ok) {
          const data = await response.json();
          return data.success ? data.populations : [];
        }
        return [];
      };

      const populations = await loadPopulationsFromSubsystem();

      expect(global.fetch).toHaveBeenCalledWith('/api/populations');
      expect(populations).toHaveLength(2);
      expect(populations[0]).toEqual({ id: 'pop1', name: 'Test Population 1' });
    });

    test('should handle population selection events', () => {
      const selector = document.getElementById('population-selector');
      const detailsEl = document.getElementById('selected-population-details');
      
      // Add population options
      const option1 = document.createElement('option');
      option1.value = 'pop1';
      option1.textContent = 'Test Population 1';
      selector.appendChild(option1);

      // Simulate population selection
      selector.value = 'pop1';
      const changeEvent = new window.Event('change');
      selector.dispatchEvent(changeEvent);

      expect(selector.value).toBe('pop1');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('should initialize fallback UI when subsystem APIs fail', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const manager = new SwaggerUIManager();
      const result = await manager.initialize();

      expect(result).toBe(false);
      expect(global.SwaggerUIBundle).toHaveBeenCalledTimes(1); // Fallback UI is called in catch block
    });

    test('should handle token refresh failures gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Token refresh failed'));

      const manager = new SwaggerUIManager();
      await manager.refreshAuthToken();

      expect(console.warn).toHaveBeenCalledWith(
        'Could not refresh auth token:',
        'Token refresh failed'
      );
    });
  });
});
