/**
 * Disclaimer Banner Test Suite
 * 
 * Tests the Ping Identity-style disclaimer banner functionality
 */

import { JSDOM } from 'jsdom';

// Mock DOM environment
const setupDOM = () => {
  const { window } = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test</title>
      </head>
      <body>
        <div id="app">
          <h1>Test Page</h1>
          <p>Test content</p>
        </div>
      </body>
    </html>
  `, {
    url: 'http://localhost',
    pretendToBeVisual: true,
    runScripts: 'dangerously'
  });

  // Set up global variables
  global.window = window;
  global.document = window.document;
  global.navigator = window.navigator;
  global.localStorage = window.localStorage;
  
  return { window };
};

describe('Disclaimer Banner', () => {
  let dom;
  let DisclaimerBanner;

  beforeAll(async () => {
    // Import the module
    const module = await import('../public/js/modules/disclaimer-banner.js');
    DisclaimerBanner = module.default || module.DisclaimerBanner;
  });

  beforeEach(() => {
    dom = setupDOM();
    // Clear localStorage before each test
    dom.window.localStorage.clear();
  });

  afterEach(() => {
    // Clean up
    if (dom) {
      dom.window.close();
    }
  });

  describe('Initialization', () => {
    test('should create banner instance', () => {
      const banner = new DisclaimerBanner();
      expect(banner).toBeDefined();
      expect(banner.storageKey).toBe('ping-disclaimer-dismissed');
    });

    test('should show banner on first visit', () => {
      const banner = new DisclaimerBanner();
      expect(banner.shouldShowBanner()).toBe(true);
    });

    test('should not show banner if previously dismissed', () => {
      // Set dismissed flag
      dom.window.localStorage.setItem('ping-disclaimer-dismissed', 'true');
      
      const banner = new DisclaimerBanner();
      expect(banner.shouldShowBanner()).toBe(false);
    });
  });

  describe('Banner Creation', () => {
    test('should create banner HTML', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      
      const bannerElement = dom.window.document.getElementById('ping-disclaimer-banner');
      expect(bannerElement).toBeDefined();
      expect(bannerElement.className).toContain('ping-disclaimer-banner');
    });

    test('should add banner to DOM', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      
      const bannerElement = dom.window.document.querySelector('.ping-disclaimer-banner');
      expect(bannerElement).toBeDefined();
      expect(bannerElement.parentNode).toBe(dom.window.document.body);
    });

    test('should add body class for spacing', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      
      expect(dom.window.document.body.classList.contains('has-disclaimer-banner')).toBe(true);
    });

    test('should include proper ARIA attributes', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      
      const bannerElement = dom.window.document.getElementById('ping-disclaimer-banner');
      expect(bannerElement.getAttribute('role')).toBe('alert');
      expect(bannerElement.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('Banner Content', () => {
    test('should include warning icon', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      
      const icon = dom.window.document.querySelector('.ping-disclaimer-icon');
      expect(icon).toBeDefined();
      expect(icon.textContent).toBe('⚠️');
    });

    test('should include disclaimer message', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      
      const message = dom.window.document.querySelector('.ping-disclaimer-message');
      expect(message).toBeDefined();
      expect(message.textContent).toContain('DISCLAIMER:');
      expect(message.textContent).toContain('unsupported');
    });

    test('should include dismiss button', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      
      const button = dom.window.document.getElementById('ping-disclaimer-dismiss');
      expect(button).toBeDefined();
      expect(button.textContent.trim()).toBe('I Understand');
      expect(button.type).toBe('button');
    });
  });

  describe('Banner Visibility', () => {
    test('should show banner with animation', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      banner.showBanner();
      
      expect(banner.isVisible).toBe(true);
      
      const bannerElement = dom.window.document.getElementById('ping-disclaimer-banner');
      expect(bannerElement.classList.contains('show')).toBe(true);
    });

    test('should hide banner with animation', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      banner.showBanner();
      banner.dismissBanner();
      
      expect(banner.isVisible).toBe(false);
      
      const bannerElement = dom.window.document.getElementById('ping-disclaimer-banner');
      expect(bannerElement.classList.contains('hide')).toBe(true);
    });
  });

  describe('Dismissal Functionality', () => {
    test('should store dismissal in localStorage', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      banner.showBanner();
      banner.dismissBanner();
      
      expect(dom.window.localStorage.getItem('ping-disclaimer-dismissed')).toBe('true');
    });

    test('should remove banner from DOM after dismissal', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      banner.showBanner();
      banner.dismissBanner();
      
      // Wait for animation to complete
      setTimeout(() => {
        const bannerElement = dom.window.document.getElementById('ping-disclaimer-banner');
        expect(bannerElement).toBeNull();
      }, 500);
    });

    test('should remove body class after dismissal', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      banner.showBanner();
      banner.dismissBanner();
      
      // Wait for animation to complete
      setTimeout(() => {
        expect(dom.window.document.body.classList.contains('has-disclaimer-banner')).toBe(false);
      }, 500);
    });
  });

  describe('Event Handling', () => {
    test('should handle dismiss button click', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      banner.showBanner();
      
      const button = dom.window.document.getElementById('ping-disclaimer-dismiss');
      const clickEvent = new dom.window.Event('click');
      button.dispatchEvent(clickEvent);
      
      expect(banner.isVisible).toBe(false);
    });

    test('should handle keyboard events', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      banner.showBanner();
      
      const button = dom.window.document.getElementById('ping-disclaimer-dismiss');
      
      // Test Enter key
      const enterEvent = new dom.window.KeyboardEvent('keydown', { key: 'Enter' });
      button.dispatchEvent(enterEvent);
      
      expect(banner.isVisible).toBe(false);
    });
  });

  describe('Auto-hide Functionality', () => {
    test('should auto-hide after timeout', (done) => {
      jest.useFakeTimers();
      
      const banner = new DisclaimerBanner();
      banner.createBanner();
      banner.showBanner();
      
      // Fast-forward time
      jest.advanceTimersByTime(30000);
      
      setTimeout(() => {
        expect(banner.isVisible).toBe(false);
        done();
      }, 100);
      
      jest.useRealTimers();
    });

    test('should clear timeout on manual dismissal', () => {
      jest.useFakeTimers();
      
      const banner = new DisclaimerBanner();
      banner.createBanner();
      banner.showBanner();
      banner.dismissBanner();
      
      expect(banner.autoHideTimeout).toBeNull();
      
      jest.useRealTimers();
    });
  });

  describe('Storage Management', () => {
    test('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalGetItem = dom.window.localStorage.getItem;
      dom.window.localStorage.getItem = jest.fn(() => {
        throw new Error('Storage error');
      });
      
      const banner = new DisclaimerBanner();
      expect(banner.getDismissalStatus()).toBe(false);
      
      // Restore original function
      dom.window.localStorage.getItem = originalGetItem;
    });

    test('should handle localStorage setItem errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = dom.window.localStorage.setItem;
      dom.window.localStorage.setItem = jest.fn(() => {
        throw new Error('Storage error');
      });
      
      const banner = new DisclaimerBanner();
      banner.createBanner();
      banner.showBanner();
      banner.dismissBanner();
      
      // Should not throw error
      expect(banner).toBeDefined();
      
      // Restore original function
      dom.window.localStorage.setItem = originalSetItem;
    });
  });

  describe('Page Filtering', () => {
    test('should not show on internal tools', () => {
      // Mock location to be an internal tool
      Object.defineProperty(dom.window, 'location', {
        value: {
          pathname: '/api-tester.html'
        },
        writable: true
      });
      
      const banner = new DisclaimerBanner();
      expect(banner.shouldShowBanner()).toBe(false);
    });

    test('should show on public pages', () => {
      // Mock location to be a public page
      Object.defineProperty(dom.window, 'location', {
        value: {
          pathname: '/'
        },
        writable: true
      });
      
      const banner = new DisclaimerBanner();
      expect(banner.shouldShowBanner()).toBe(true);
    });
  });

  describe('Accessibility', () => {
    test('should announce to screen readers', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      banner.showBanner();
      
      // Check if announcement element was created
      const announcements = dom.window.document.querySelectorAll('[aria-live="assertive"]');
      expect(announcements.length).toBeGreaterThan(0);
    });

    test('should have proper focus management', () => {
      const banner = new DisclaimerBanner();
      banner.createBanner();
      
      const button = dom.window.document.getElementById('ping-disclaimer-dismiss');
      expect(button).toBeDefined();
      expect(button.getAttribute('type')).toBe('button');
    });
  });

  describe('Utility Methods', () => {
    test('should reset banner state', () => {
      // Set dismissed state
      dom.window.localStorage.setItem('ping-disclaimer-dismissed', 'true');
      
      const banner = new DisclaimerBanner();
      banner.reset();
      
      expect(dom.window.localStorage.getItem('ping-disclaimer-dismissed')).toBe('false');
    });

    test('should force show banner', () => {
      const banner = new DisclaimerBanner();
      banner.forceShow();
      
      expect(banner.shouldShowBanner()).toBe(true);
    });
  });
}); 