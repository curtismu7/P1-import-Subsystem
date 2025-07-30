import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/pingone-import-test';
process.env.JWT_SECRET = 'test-secret-key-123';
process.env.PORT = '4000';
process.env.LOG_LEVEL = 'error'; // Only show errors during tests

// Set up JSDOM for browser-like environment
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost:4000',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.jest = jest; // Make jest globally available
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.Event = dom.window.Event;

// Mock localStorage and sessionStorage
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

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
);

// Increase test timeout
jest.setTimeout(30000);

// Mock console methods to keep test output clean
const originalConsole = { ...console };
const consoleMocks = ['log', 'warn', 'error', 'debug', 'info'];

beforeEach(() => {
  consoleMocks.forEach(method => {
    global.console[method] = jest.fn();
  });
});

afterEach(() => {
  // Reset mocks
  global.fetch.mockClear();
  
  // Restore console methods if needed
  consoleMocks.forEach(method => {
    if (originalConsole[method]) {
      global.console[method] = originalConsole[method];
    }
  });
  
  // Clear DOM after each test
  document.body.innerHTML = '';
});
