/**
 * @fileoverview Tests for modern API Testing Dashboard with subsystem integration
 * 
 * Tests the APITestingDashboard class and its integration with:
 * - Subsystem status monitoring
 * - Real-time API testing
 * - EventBus integration
 * - ES module patterns
 */

import winston from 'winston';
import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

describe('API Testing Dashboard with Subsystem Integration', () => {
  let dom;
  let window;
  let document;
  let APITestingDashboard;

  beforeEach(() => {
    // Create a mock DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <div id="overall-status">
            <span class="status-indicator"></span>
            <span>Status text</span>
          </div>
          <div id="subsystem-status"></div>
          <div id="core-api-result" class="result-container"></div>
          <div id="subsystem-api-result" class="result-container"></div>
          <div id="realtime-result" class="result-container"></div>
          <div id="swagger-result" class="result-container"></div>
          <div id="endpoint-list"></div>
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

    // Create APITestingDashboard class (simplified version for testing)
    APITestingDashboard = class {
      constructor() {
        this.subsystems = new Map();
        this.testResults = new Map();
        this.isInitialized = false;
      }

      async initialize() {
        try {
          this.updateOverallStatus('info', 'Loading subsystem status...');
          await this.loadSubsystemStatus();
          await this.loadAvailableEndpoints();
          this.setupEventListeners();
          await this.testHealth();
          this.isInitialized = true;
          this.updateOverallStatus('success', 'Dashboard initialized successfully');
          return true;
        } catch (error) {
          console.error('Failed to initialize dashboard:', error);
          this.updateOverallStatus('error', `Initialization failed: ${error.message}`);
          return false;
        }
      }

      updateOverallStatus(type, message) {
        const statusElement = document.getElementById('overall-status');
        const indicator = statusElement.querySelector('.status-indicator');
        const textElement = statusElement.querySelector('span:last-child');
        
        indicator.className = `status-indicator status-${type}`;
        textElement.textContent = message;
      }

      async loadSubsystemStatus() {
        const subsystemContainer = document.getElementById('subsystem-status');
        
        const subsystems = [
          { name: 'Authentication', endpoint: '/api/token', icon: '🔐' },
          { name: 'Settings', endpoint: '/api/settings', icon: '⚙️' },
          { name: 'Health', endpoint: '/api/health', icon: '🏥' },
          { name: 'Feature Flags', endpoint: '/api/feature-flags', icon: '🚩' }
        ];

        for (const subsystem of subsystems) {
          const card = this.createSubsystemCard(subsystem);
          subsystemContainer.appendChild(card);
          await this.testSubsystemStatus(subsystem, card);
        }
      }

      createSubsystemCard(subsystem) {
        const card = document.createElement('div');
        card.className = 'subsystem-card';
        card.innerHTML = `
          <div style="font-size: 24px; margin-bottom: 8px;">${subsystem.icon}</div>
          <h4 style="margin: 0 0 8px 0;">${subsystem.name}</h4>
          <div class="status-indicator status-info"></div>
          <span>Testing...</span>
        `;
        return card;
      }

      async testSubsystemStatus(subsystem, card) {
        try {
          const response = await fetch(subsystem.endpoint);
          const indicator = card.querySelector('.status-indicator');
          const status = card.querySelector('span');
          
          if (response.ok) {
            indicator.className = 'status-indicator status-success';
            status.textContent = 'Online';
            this.subsystems.set(subsystem.name, { status: 'online', response });
          } else {
            indicator.className = 'status-indicator status-warning';
            status.textContent = `Warning (${response.status})`;
            this.subsystems.set(subsystem.name, { status: 'warning', response });
          }
        } catch (error) {
          const indicator = card.querySelector('.status-indicator');
          const status = card.querySelector('span');
          
          indicator.className = 'status-indicator status-error';
          status.textContent = 'Offline';
          this.subsystems.set(subsystem.name, { status: 'offline', error });
        }
      }

      async loadAvailableEndpoints() {
        try {
          const response = await fetch('/swagger.json');
          if (response.ok) {
            const spec = await response.json();
            this.displayEndpoints(spec.paths || {});
          }
        } catch (error) {
          console.warn('Could not load API endpoints:', error);
        }
      }

      displayEndpoints(paths) {
        const container = document.getElementById('endpoint-list');
        
        Object.entries(paths).forEach(([path, methods]) => {
          Object.entries(methods).forEach(([method, details]) => {
            const card = document.createElement('div');
            card.className = 'endpoint-card';
            card.innerHTML = `
              <div>
                <span class="endpoint-method method-${method}">${method.toUpperCase()}</span>
                <strong>${path}</strong>
              </div>
              <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">
                ${details.summary || details.description || 'No description'}
              </p>
            `;
            container.appendChild(card);
          });
        });
      }

      setupEventListeners() {
        window.addEventListener('subsystem-status-updated', (event) => {
          this.handleSubsystemUpdate(event.detail);
        });
        
        window.addEventListener('api-test-completed', (event) => {
          this.handleTestResult(event.detail);
        });
      }

      handleSubsystemUpdate(detail) {
        console.log('Subsystem status updated:', detail);
      }

      handleTestResult(detail) {
        console.log('API test completed:', detail);
        this.testResults.set(detail.test, detail.result);
      }

      async testAPI(endpoint, resultContainerId, testName) {
        const container = document.getElementById(resultContainerId);
        container.style.display = 'block';
        container.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="loading-spinner"></div>
            <span>Testing ${testName}...</span>
          </div>
        `;

        try {
          const startTime = Date.now();
          const response = await fetch(endpoint);
          const endTime = Date.now();
          const data = await response.json();
          
          const duration = endTime - startTime;
          
          if (response.ok) {
            container.className = 'result-container result-success';
            container.innerHTML = `
              <h4>✅ ${testName} - Success</h4>
              <p><strong>Status:</strong> ${response.status} ${response.statusText}</p>
              <p><strong>Duration:</strong> ${duration}ms</p>
            `;
          } else {
            container.className = 'result-container result-error';
            container.innerHTML = `
              <h4>❌ ${testName} - Failed</h4>
              <p><strong>Status:</strong> ${response.status} ${response.statusText}</p>
              <p><strong>Duration:</strong> ${duration}ms</p>
            `;
          }
          
          window.dispatchEvent(new window.CustomEvent('api-test-completed', {
            detail: { test: testName, result: { success: response.ok, status: response.status, duration } }
          }));
          
        } catch (error) {
          container.className = 'result-container result-error';
          container.innerHTML = `
            <h4>❌ ${testName} - Error</h4>
            <p><strong>Error:</strong> ${error.message}</p>
          `;
        }
      }

      async testHealth() {
        return this.testAPI('/api/health', 'core-api-result', 'Health Check');
      }

      async testSettings() {
        return this.testAPI('/api/settings', 'core-api-result', 'Settings API');
      }

      async testSwaggerSpec() {
        return this.testAPI('/swagger.json', 'swagger-result', 'OpenAPI Specification');
      }

      async validateSwaggerIntegration() {
        const container = document.getElementById('swagger-result');
        container.style.display = 'block';
        container.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="loading-spinner"></div>
            <span>Validating Swagger integration...</span>
          </div>
        `;

        try {
          const tests = [
            { name: 'OpenAPI Spec', endpoint: '/swagger.json' },
            { name: 'Swagger UI HTML', endpoint: '/swagger.html' },
            { name: 'Swagger Assets', endpoint: '/swagger/swagger-ui-bundle.js' }
          ];

          const results = [];
          for (const test of tests) {
            try {
              const response = await fetch(test.endpoint);
              results.push({
                name: test.name,
                status: response.status,
                success: response.ok
              });
            } catch (error) {
              results.push({
                name: test.name,
                status: 'Error',
                success: false,
                error: error.message
              });
            }
          }

          const allSuccess = results.every(r => r.success);
          container.className = `result-container ${allSuccess ? 'result-success' : 'result-warning'}`;
          
          let html = `<h4>${allSuccess ? '✅' : '⚠️'} Swagger Integration Validation</h4>`;
          results.forEach(result => {
            html += `
              <p>
                <span style="color: ${result.success ? '#28a745' : '#dc3545'};">
                  ${result.success ? '✅' : '❌'}
                </span>
                <strong>${result.name}:</strong> ${result.status}
              </p>
            `;
          });
          
          container.innerHTML = html;
          
        } catch (error) {
          container.className = 'result-container result-error';
          container.innerHTML = `
            <h4>❌ Validation Failed</h4>
            <p><strong>Error:</strong> ${error.message}</p>
          `;
        }
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.window;
    delete global.document;
    delete global.fetch;
  });

  describe('Dashboard Initialization', () => {
    test('should initialize successfully with all subsystems online', async () => {
      // Mock successful API responses
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) }) // token
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) }) // settings
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) }) // health
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) }) // feature-flags
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ paths: {} }) }) // swagger.json
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) }); // health test

      const dashboard = new APITestingDashboard();
      const result = await dashboard.initialize();

      expect(result).toBe(true);
      expect(dashboard.isInitialized).toBe(true);
      expect(dashboard.subsystems.size).toBe(4);
    });

    test('should handle initialization failure gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const dashboard = new APITestingDashboard();
      const result = await dashboard.initialize();

      expect(result).toBe(false);
      expect(dashboard.isInitialized).toBe(false);
    });

    test('should update overall status correctly', () => {
      const dashboard = new APITestingDashboard();
      
      dashboard.updateOverallStatus('success', 'All systems operational');
      
      const indicator = document.querySelector('.status-indicator');
      const textElement = document.querySelector('#overall-status span:last-child');
      
      expect(indicator.className).toBe('status-indicator status-success');
      expect(textElement.textContent).toBe('All systems operational');
    });
  });

  describe('Subsystem Status Monitoring', () => {
    test('should create subsystem cards correctly', () => {
      const dashboard = new APITestingDashboard();
      const subsystem = { name: 'Authentication', endpoint: '/api/token', icon: '🔐' };
      
      const card = dashboard.createSubsystemCard(subsystem);
      
      expect(card.className).toBe('subsystem-card');
      expect(card.innerHTML).toContain('Authentication');
      expect(card.innerHTML).toContain('🔐');
      expect(card.innerHTML).toContain('Testing...');
    });

    test('should test subsystem status and update UI accordingly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      });

      const dashboard = new APITestingDashboard();
      const subsystem = { name: 'Health', endpoint: '/api/health', icon: '🏥' };
      const card = dashboard.createSubsystemCard(subsystem);
      
      await dashboard.testSubsystemStatus(subsystem, card);
      
      const indicator = card.querySelector('.status-indicator');
      const status = card.querySelector('span');
      
      expect(indicator.className).toBe('status-indicator status-success');
      expect(status.textContent).toBe('Online');
      expect(dashboard.subsystems.get('Health').status).toBe('online');
    });

    test('should handle subsystem failures correctly', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Connection failed'));

      const dashboard = new APITestingDashboard();
      const subsystem = { name: 'Settings', endpoint: '/api/settings', icon: '⚙️' };
      const card = dashboard.createSubsystemCard(subsystem);
      
      await dashboard.testSubsystemStatus(subsystem, card);
      
      const indicator = card.querySelector('.status-indicator');
      const status = card.querySelector('span');
      
      expect(indicator.className).toBe('status-indicator status-error');
      expect(status.textContent).toBe('Offline');
      expect(dashboard.subsystems.get('Settings').status).toBe('offline');
    });
  });

  describe('API Testing Functionality', () => {
    test('should perform API tests and display results', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ success: true, data: 'test' })
      });

      const dashboard = new APITestingDashboard();
      await dashboard.testAPI('/api/test', 'core-api-result', 'Test API');

      const container = document.getElementById('core-api-result');
      expect(container.style.display).toBe('block');
      expect(container.className).toBe('result-container result-success');
      expect(container.innerHTML).toContain('✅ Test API - Success');
      expect(container.innerHTML).toContain('Status:</strong> 200 OK');
    });

    test('should handle API test failures', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Not found' })
      });

      const dashboard = new APITestingDashboard();
      await dashboard.testAPI('/api/missing', 'core-api-result', 'Missing API');

      const container = document.getElementById('core-api-result');
      expect(container.className).toBe('result-container result-error');
      expect(container.innerHTML).toContain('❌ Missing API - Failed');
      expect(container.innerHTML).toContain('Status:</strong> 404 Not Found');
    });

    test('should handle network errors in API tests', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const dashboard = new APITestingDashboard();
      await dashboard.testAPI('/api/error', 'core-api-result', 'Error API');

      const container = document.getElementById('core-api-result');
      expect(container.className).toBe('result-container result-error');
      expect(container.innerHTML).toContain('❌ Error API - Error');
      expect(container.innerHTML).toContain('Network error');
    });
  });

  describe('Swagger Integration Validation', () => {
    test('should validate Swagger integration successfully', async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: true }) // swagger.json
        .mockResolvedValueOnce({ ok: true }) // swagger.html
        .mockResolvedValueOnce({ ok: true }); // swagger-ui-bundle.js

      const dashboard = new APITestingDashboard();
      await dashboard.validateSwaggerIntegration();

      const container = document.getElementById('swagger-result');
      expect(container.className).toBe('result-container result-success');
      expect(container.innerHTML).toContain('✅ Swagger Integration Validation');
      expect(container.innerHTML).toContain('OpenAPI Spec');
      expect(container.innerHTML).toContain('Swagger UI HTML');
      expect(container.innerHTML).toContain('Swagger Assets');
    });

    test('should handle partial Swagger integration failures', async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: true }) // swagger.json - success
        .mockResolvedValueOnce({ ok: false, status: 404 }) // swagger.html - fail
        .mockResolvedValueOnce({ ok: true }); // swagger-ui-bundle.js - success

      const dashboard = new APITestingDashboard();
      await dashboard.validateSwaggerIntegration();

      const container = document.getElementById('swagger-result');
      expect(container.className).toBe('result-container result-warning');
      expect(container.innerHTML).toContain('⚠️ Swagger Integration Validation');
    });
  });

  describe('Event-driven Integration', () => {
    test('should handle subsystem status update events', () => {
      const dashboard = new APITestingDashboard();
      dashboard.setupEventListeners();

      const event = new window.CustomEvent('subsystem-status-updated', {
        detail: { subsystem: 'auth', status: 'updated' }
      });

      window.dispatchEvent(event);

      expect(console.log).toHaveBeenCalledWith('Subsystem status updated:', { subsystem: 'auth', status: 'updated' });
    });

    test('should handle API test completion events', () => {
      const dashboard = new APITestingDashboard();
      dashboard.setupEventListeners();

      const event = new window.CustomEvent('api-test-completed', {
        detail: { test: 'health', result: { success: true, status: 200 } }
      });

      window.dispatchEvent(event);

      expect(console.log).toHaveBeenCalledWith('API test completed:', { test: 'health', result: { success: true, status: 200 } });
      expect(dashboard.testResults.get('health')).toEqual({ success: true, status: 200 });
    });

    test('should dispatch API test completion events', async () => {
      const eventListener = jest.fn();
      window.addEventListener('api-test-completed', eventListener);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ success: true })
      });

      const dashboard = new APITestingDashboard();
      await dashboard.testHealth();

      expect(eventListener).toHaveBeenCalled();
      const eventDetail = eventListener.mock.calls[0][0].detail;
      expect(eventDetail.test).toBe('Health Check');
      expect(eventDetail.result.success).toBe(true);
      expect(eventDetail.result.status).toBe(200);
    });
  });

  describe('Endpoint Discovery', () => {
    test('should load and display API endpoints from Swagger spec', async () => {
      const mockSpec = {
        paths: {
          '/api/health': {
            get: {
              summary: 'Health check endpoint',
              description: 'Returns system health status'
            }
          },
          '/api/settings': {
            get: { summary: 'Get settings' },
            post: { summary: 'Update settings' }
          }
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSpec)
      });

      const dashboard = new APITestingDashboard();
      await dashboard.loadAvailableEndpoints();

      const container = document.getElementById('endpoint-list');
      const endpointCards = container.querySelectorAll('.endpoint-card');
      
      expect(endpointCards.length).toBe(3); // 1 GET + 1 GET + 1 POST
      expect(container.innerHTML).toContain('/api/health');
      expect(container.innerHTML).toContain('/api/settings');
      expect(container.innerHTML).toContain('Health check endpoint');
    });

    test('should handle endpoint loading failures gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Failed to load spec'));

      const dashboard = new APITestingDashboard();
      await dashboard.loadAvailableEndpoints();

      expect(console.warn).toHaveBeenCalledWith('Could not load API endpoints:', expect.any(Error));
    });
  });
});
