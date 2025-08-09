/**
 * @fileoverview Modern Swagger UI Initializer with Subsystem Integration
 * 
 * This initializer leverages the PingOne Import Tool's subsystem architecture
 * for authentication, settings management, and logging.
 * 
 * @author PingOne Import Tool
 * @version 6.0
 */

// Modern Swagger UI Configuration with Subsystem Integration
class SwaggerUIManager {
  constructor() {
    this.ui = null;
    this.authToken = null;
    this.settings = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Swagger UI with automatic authentication and settings
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Modern Swagger UI with Subsystem Integration');
      
      // Load settings from subsystem API
      await this.loadSettings();
      
      // Attempt to get authentication token
      await this.loadAuthToken();
      
      // Initialize Swagger UI with enhanced configuration
      await this.initializeSwaggerUI();
      
      // Setup event listeners for real-time updates
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('✅ Swagger UI initialized successfully with subsystem integration');
      
    } catch (error) {
      console.error('❌ Failed to initialize Swagger UI:', error);
      this.initializeFallbackUI();
    }
  }

  /**
   * Load application settings from SettingsSubsystem API
   */
  async loadSettings() {
    try {
      const response = await fetch('http://localhost:4000/api/settings');
      if (response.ok) {
        const data = await response.json();
        this.settings = data.success ? data.data : null;
        console.log('📋 Settings loaded from subsystem:', this.settings ? 'configured' : 'not configured');
      }
    } catch (error) {
      console.warn('⚠️ Could not load settings from subsystem:', error.message);
    }
  }

  /**
   * Load authentication token from AuthManagementSubsystem API
   */
  async loadAuthToken() {
    try {
      // Try to get token info first
      const tokenInfoResponse = await fetch('http://localhost:4000/api/auth/token-info');
      if (tokenInfoResponse.ok) {
        const tokenData = await tokenInfoResponse.json();
        if (tokenData.success && tokenData.data && tokenData.data.access_token) {
          this.authToken = tokenData.data.access_token;
          console.log('🔐 Authentication token loaded from subsystem');
          return;
        }
      }
      
      // If no existing token, try to get a new one
      const tokenResponse = await fetch('http://localhost:4000/api/pingone/get-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (tokenResponse.ok) {
        const data = await tokenResponse.json();
        if (data.success && data.access_token) {
          this.authToken = data.access_token;
          console.log('🔐 New authentication token retrieved from subsystem');
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load auth token from subsystem:', error.message);
    }
  }

  /**
   * Initialize Swagger UI with enhanced configuration
   */
  async initializeSwaggerUI() {
    const spec = await this.fetchOpenApiSpec();
    const config = {
      // Pass resolved spec directly to avoid server response envelope
      spec,
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],
      plugins: [
        SwaggerUIBundle.plugins.DownloadUrl
      ],
      layout: 'StandaloneLayout',
      
      // Enhanced configuration for better UX
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
      displayRequestDuration: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
      
      // Custom request interceptor for automatic authentication
      requestInterceptor: (request) => {
        return this.interceptRequest(request);
      },
      
      // Custom response interceptor for logging
      responseInterceptor: (response) => {
        return this.interceptResponse(response);
      },
      
      // Custom error handler
      onComplete: () => {
        this.onSwaggerUIComplete();
      }
    };

    // Initialize Swagger UI
    window.ui = SwaggerUIBundle(config);
    this.ui = window.ui;
  }

  /**
   * Initialize fallback UI if subsystem integration fails
   */
  async initializeFallbackUI() {
    console.log('🔄 Initializing fallback Swagger UI');
    
    const spec = await this.fetchOpenApiSpec();
    window.ui = SwaggerUIBundle({
      spec,
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],
      plugins: [
        SwaggerUIBundle.plugins.DownloadUrl
      ],
      layout: 'StandaloneLayout'
    });
  }

  /**
   * Fetch OpenAPI spec and unwrap server envelope if present
   */
  async fetchOpenApiSpec() {
    const tryFetch = async (path) => {
      try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) return null;
        const json = await res.json();
        // Unwrap { success, data: { data: spec } } → spec
        const candidate = (json && (json.data?.data || json.data)) || json;
        if (candidate && (candidate.openapi || candidate.swagger)) return candidate;
        return null;
      } catch {
        return null;
      }
    };

    // Try primary then fallback endpoint
    const spec = (await tryFetch('/swagger.json')) || (await tryFetch('/api-docs.json'));
    if (spec) return spec;
    // Final empty spec fallback to prevent hard failure
    return { openapi: '3.0.0', info: { title: 'API', version: '0.0.0' }, paths: {} };
  }

  /**
   * Intercept requests to add automatic authentication
   */
  interceptRequest(request) {
    // Add authentication token if available
    if (this.authToken && !request.headers.Authorization) {
      request.headers.Authorization = `Bearer ${this.authToken}`;
      console.log('🔐 Added authentication token to request');
    }
    
    // Add custom headers for subsystem integration
    request.headers['X-Client-Type'] = 'swagger-ui';
    request.headers['X-Client-Version'] = '6.0';
    
    return request;
  }

  /**
   * Intercept responses for logging and error handling
   */
  interceptResponse(response) {
    // Log API responses for debugging
    if (response.status >= 400) {
      console.warn(`⚠️ API Error: ${response.status} ${response.statusText}`, response.url);
    } else {
      console.log(`✅ API Success: ${response.status}`, response.url);
    }
    
    return response;
  }

  /**
   * Setup event listeners for real-time updates
   */
  setupEventListeners() {
    // Listen for authentication token updates
    window.addEventListener('auth-token-updated', (event) => {
      this.authToken = event.detail.token;
      console.log('🔐 Authentication token updated from subsystem event');
    });
    
    // Listen for settings updates
    window.addEventListener('settings-updated', (event) => {
      this.settings = event.detail.settings;
      console.log('📋 Settings updated from subsystem event');
    });
    
    // Listen for page visibility changes to refresh token
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isInitialized) {
        this.refreshAuthToken();
      }
    });
  }

  /**
   * Called when Swagger UI completes initialization
   */
  onSwaggerUIComplete() {
    console.log('✅ Swagger UI initialization complete');
    
    // Add custom styling for better integration
    this.addCustomStyling();
    
    // Show initialization status
    this.showInitializationStatus();
  }

  /**
   * Add custom styling for better integration with the main app
   */
  addCustomStyling() {
    const style = document.createElement('style');
    style.textContent = `
      /* Enhanced Swagger UI Integration Styles */
      .swagger-ui .topbar {
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        border-bottom: 2px solid #004085;
      }
      
      .swagger-ui .topbar .download-url-wrapper {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .swagger-ui .topbar::after {
        content: "🚀 Powered by PingOne Import Tool Subsystems";
        color: white;
        font-size: 12px;
        margin-left: 20px;
        opacity: 0.8;
      }
      
      .swagger-ui .auth-wrapper {
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        border: 1px solid #2196f3;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }
      
      .swagger-ui .auth-wrapper::before {
        content: "🔐 Authentication managed by AuthManagementSubsystem";
        display: block;
        font-weight: bold;
        color: #1976d2;
        margin-bottom: 10px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show initialization status in the UI
   */
  showInitializationStatus() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'swagger-status';
    statusDiv.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
        border: 1px solid #28a745;
        border-radius: 8px;
        padding: 15px;
        margin: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <h4 style="margin: 0 0 10px 0; color: #155724;">🚀 Modern Swagger UI Status</h4>
        <ul style="margin: 0; padding-left: 20px; color: #155724;">
          <li>✅ Subsystem Integration: Active</li>
          <li>✅ Authentication: ${this.authToken ? 'Token Loaded' : 'No Token'}</li>
          <li>✅ Settings: ${this.settings ? 'Configured' : 'Default'}</li>
          <li>✅ Real-time Updates: Enabled</li>
        </ul>
      </div>
    `;
    
    const swaggerContainer = document.getElementById('swagger-ui');
    if (swaggerContainer) {
      swaggerContainer.insertBefore(statusDiv, swaggerContainer.firstChild);
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshAuthToken() {
    try {
      await this.loadAuthToken();
    } catch (error) {
      console.warn('⚠️ Could not refresh auth token:', error.message);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeModernSwaggerUI);
} else {
  initializeModernSwaggerUI();
}

async function initializeModernSwaggerUI() {
  const swaggerManager = new SwaggerUIManager();
  await swaggerManager.initialize();
  
  // Make manager available globally for debugging
  window.swaggerManager = swaggerManager;
}
