import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';
import path from 'path';

// Create a browser-like environment for testing
export function setupBrowserEnv() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost:4000',
    runScripts: 'dangerously',
    resources: 'usable'
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  
  // Mock localStorage
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => { store[key] = value.toString(); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; }
    };
  })();
  
  global.localStorage = localStorageMock;
  global.sessionStorage = localStorageMock;
}

// Helper to load a script into the test environment
export async function loadScript(scriptPath) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const fullPath = path.resolve(__dirname, '../../', scriptPath);
  
  try {
    const module = await import(fullPath);
    return module.default || module;
  } catch (error) {
    console.error(`Error loading script: ${scriptPath}`, error);
    throw error;
  }
}

// Mock fetch for API calls
export function setupFetchMock() {
  const fetchMock = (url, options = {}) => {
    console.log(`Mock fetch called: ${url}`, options);
    
    // Mock responses for different endpoints
    if (url.includes('/api/settings')) {
      if (options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            environmentId: 'test-env-id',
            region: 'NorthAmerica',
            apiClientId: 'test-client-id',
            lastUpdated: new Date().toISOString()
          })
        });
      }
      
      if (options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Settings saved successfully'
          })
        });
      }
    }
    
    // Default mock response
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({})
    });
  };
  
  global.fetch = jest.fn(fetchMock);
  return fetchMock;
}

// Helper to wait for async operations
export function waitFor(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to test if an element exists and is visible
export function isVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}
