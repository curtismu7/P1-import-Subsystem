/**
 * Token Status Indicator Test Suite
 * 
 * Comprehensive tests for the token status indicator functionality
 */

// Mock DOM environment
document.body.innerHTML = `
    <div id="app">
        <div class="main-content"></div>
    </div>
`;

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

// Mock fetch
global.fetch = jest.fn();

// Import the TokenStatusIndicator class
const TokenStatusIndicator = require('./public/js/modules/token-status-indicator.js');

describe('TokenStatusIndicator', () => {
    let indicator;
    let mockConsole;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock console methods
        mockConsole = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };
        global.console = mockConsole;
        
        // Clear DOM
        document.body.innerHTML = `
            <div id="app">
                <div class="main-content"></div>
            </div>
        `;
        
        // Reset localStorage mock
        localStorageMock.getItem.mockReset();
        localStorageMock.setItem.mockReset();
        localStorageMock.removeItem.mockReset();
    });

    afterEach(() => {
        if (indicator) {
            indicator.destroy();
        }
        jest.clearAllTimers();
    });

    describe('Initialization', () => {
        test('should initialize successfully', () => {
            indicator = new TokenStatusIndicator();
            expect(indicator.isInitialized).toBe(true);
            expect(indicator.statusBar).toBeTruthy();
            expect(indicator.statusIcon).toBeTruthy();
            expect(indicator.statusText).toBeTruthy();
            expect(indicator.statusTime).toBeTruthy();
        });

        test('should create status bar with correct structure', () => {
            indicator = new TokenStatusIndicator();
            const statusBar = document.getElementById('token-status-indicator');
            
            expect(statusBar).toBeTruthy();
            expect(statusBar.getAttribute('role')).toBe('status');
            expect(statusBar.getAttribute('aria-live')).toBe('polite');
            
            const content = statusBar.querySelector('.token-status-content');
            const actions = statusBar.querySelector('.token-status-actions');
            
            expect(content).toBeTruthy();
            expect(actions).toBeTruthy();
        });

        test('should insert status bar into page', () => {
            indicator = new TokenStatusIndicator();
            const statusBar = document.querySelector('#token-status-indicator');
            expect(statusBar).toBeTruthy();
            expect(statusBar.parentNode).toBeTruthy();
        });

        test('should handle existing status bar', () => {
            // Create existing status bar
            const existingBar = document.createElement('div');
            existingBar.id = 'token-status-indicator';
            existingBar.innerHTML = `
                <div class="token-status-content">
                    <span class="token-status-icon">⏳</span>
                    <span class="token-status-text">Existing</span>
                    <span class="token-status-time"></span>
                </div>
                <div class="token-status-actions">
                    <button id="refresh-token-status"></button>
                    <button id="get-token-quick"></button>
                </div>
            `;
            document.body.appendChild(existingBar);
            
            indicator = new TokenStatusIndicator();
            expect(indicator.statusBar).toBe(existingBar);
        });
    });

    describe('Token Status Detection', () => {
        test('should detect missing token', async () => {
            localStorageMock.getItem.mockReturnValue(null);
            
            indicator = new TokenStatusIndicator();
            const status = await indicator.getTokenInfo();
            
            expect(status.status).toBe('missing');
            expect(status.message).toBe('No token available');
            expect(status.isExpired).toBe(true);
        });

        test('should detect valid token', async () => {
            const expiryTime = Date.now() + (60 * 60 * 1000); // 1 hour from now
            localStorageMock.getItem
                .mockReturnValueOnce('valid-token')
                .mockReturnValueOnce(expiryTime.toString());
            
            indicator = new TokenStatusIndicator();
            const status = await indicator.getTokenInfo();
            
            expect(status.status).toBe('valid');
            expect(status.message).toBe('Token valid');
            expect(status.isExpired).toBe(false);
            expect(status.timeRemaining).toBeGreaterThan(0);
        });

        test('should detect expiring token', async () => {
            const expiryTime = Date.now() + (3 * 60 * 1000); // 3 minutes from now
            localStorageMock.getItem
                .mockReturnValueOnce('expiring-token')
                .mockReturnValueOnce(expiryTime.toString());
            
            indicator = new TokenStatusIndicator();
            const status = await indicator.getTokenInfo();
            
            expect(status.status).toBe('expiring');
            expect(status.message).toBe('Token expires soon');
            expect(status.isExpiring).toBe(true);
        });

        test('should detect expired token', async () => {
            const expiryTime = Date.now() - (60 * 1000); // 1 minute ago
            localStorageMock.getItem
                .mockReturnValueOnce('expired-token')
                .mockReturnValueOnce(expiryTime.toString());
            
            indicator = new TokenStatusIndicator();
            const status = await indicator.getTokenInfo();
            
            expect(status.status).toBe('expired');
            expect(status.message).toBe('Token expired');
            expect(status.isExpired).toBe(true);
        });

        test('should handle storage errors gracefully', async () => {
            localStorageMock.getItem.mockImplementation(() => {
                throw new Error('Storage error');
            });
            
            indicator = new TokenStatusIndicator();
            const status = await indicator.getTokenInfo();
            
            expect(status.status).toBe('error');
            expect(status.message).toBe('Error retrieving token');
            expect(status.isExpired).toBe(true);
        });
    });

    describe('Display Updates', () => {
        test('should update display for valid token', async () => {
            const expiryTime = Date.now() + (60 * 60 * 1000);
            localStorageMock.getItem
                .mockReturnValueOnce('valid-token')
                .mockReturnValueOnce(expiryTime.toString());
            
            indicator = new TokenStatusIndicator();
            await indicator.updateStatus();
            
            expect(indicator.statusBar.className).toContain('valid');
            expect(indicator.statusIcon.textContent).toBe('🟢');
            expect(indicator.statusText.textContent).toBe('Token valid');
            expect(indicator.statusTime.textContent).toContain('(');
        });

        test('should update display for expiring token', async () => {
            const expiryTime = Date.now() + (3 * 60 * 1000);
            localStorageMock.getItem
                .mockReturnValueOnce('expiring-token')
                .mockReturnValueOnce(expiryTime.toString());
            
            indicator = new TokenStatusIndicator();
            await indicator.updateStatus();
            
            expect(indicator.statusBar.className).toContain('expiring');
            expect(indicator.statusIcon.textContent).toBe('🟡');
            expect(indicator.statusText.textContent).toBe('Token expires soon');
            expect(indicator.getTokenButton.style.display).toBe('inline-block');
        });

        test('should update display for expired token', async () => {
            const expiryTime = Date.now() - (60 * 1000);
            localStorageMock.getItem
                .mockReturnValueOnce('expired-token')
                .mockReturnValueOnce(expiryTime.toString());
            
            indicator = new TokenStatusIndicator();
            await indicator.updateStatus();
            
            expect(indicator.statusBar.className).toContain('expired');
            expect(indicator.statusIcon.textContent).toBe('🔴');
            expect(indicator.statusText.textContent).toBe('Token expired');
            expect(indicator.getTokenButton.style.display).toBe('inline-block');
        });

        test('should update display for missing token', async () => {
            localStorageMock.getItem.mockReturnValue(null);
            
            indicator = new TokenStatusIndicator();
            await indicator.updateStatus();
            
            expect(indicator.statusBar.className).toContain('missing');
            expect(indicator.statusIcon.textContent).toBe('⚪');
            expect(indicator.statusText.textContent).toBe('No token available');
            expect(indicator.getTokenButton.style.display).toBe('inline-block');
        });

        test('should update display for error state', async () => {
            localStorageMock.getItem.mockImplementation(() => {
                throw new Error('Storage error');
            });
            
            indicator = new TokenStatusIndicator();
            await indicator.updateStatus();
            
            expect(indicator.statusBar.className).toContain('error');
            expect(indicator.statusIcon.textContent).toBe('❌');
            expect(indicator.statusText.textContent).toBe('Error retrieving token');
        });
    });

    describe('Time Formatting', () => {
        test('should format time remaining correctly', () => {
            indicator = new TokenStatusIndicator();
            
            expect(indicator.formatTimeRemaining(3661000)).toBe('61m 1s');
            expect(indicator.formatTimeRemaining(60000)).toBe('1m 0s');
            expect(indicator.formatTimeRemaining(30000)).toBe('30s');
            expect(indicator.formatTimeRemaining(0)).toBe('0m 0s');
            expect(indicator.formatTimeRemaining(null)).toBe('0m 0s');
        });
    });

    describe('Event Handling', () => {
        test('should handle refresh button click', async () => {
            indicator = new TokenStatusIndicator();
            const updateStatusSpy = jest.spyOn(indicator, 'updateStatus');
            
            indicator.refreshButton.click();
            
            expect(updateStatusSpy).toHaveBeenCalled();
        });

        test('should handle get token button click', async () => {
            indicator = new TokenStatusIndicator();
            const getNewTokenSpy = jest.spyOn(indicator, 'getNewToken');
            
            indicator.getTokenButton.click();
            
            expect(getNewTokenSpy).toHaveBeenCalled();
        });

        test('should handle token-updated event', async () => {
            indicator = new TokenStatusIndicator();
            const updateStatusSpy = jest.spyOn(indicator, 'updateStatus');
            
            window.dispatchEvent(new CustomEvent('token-updated'));
            
            expect(updateStatusSpy).toHaveBeenCalled();
        });

        test('should handle page visibility change', async () => {
            indicator = new TokenStatusIndicator();
            const updateStatusSpy = jest.spyOn(indicator, 'updateStatus');
            
            // Simulate page becoming visible
            Object.defineProperty(document, 'hidden', {
                value: false,
                writable: true
            });
            document.dispatchEvent(new Event('visibilitychange'));
            
            expect(updateStatusSpy).toHaveBeenCalled();
        });
    });

    describe('Token Acquisition', () => {
        test('should get new token successfully', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    access_token: 'new-token',
                    expires_in: 3600
                })
            };
            fetch.mockResolvedValue(mockResponse);
            
            indicator = new TokenStatusIndicator();
            const updateStatusSpy = jest.spyOn(indicator, 'updateStatus');
            
            await indicator.getNewToken();
            
            expect(fetch).toHaveBeenCalledWith('/api/pingone/get-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            expect(localStorageMock.setItem).toHaveBeenCalledWith('pingone_worker_token', 'new-token');
            expect(updateStatusSpy).toHaveBeenCalled();
        });

        test('should handle token fetch error', async () => {
            fetch.mockRejectedValue(new Error('Network error'));
            
            indicator = new TokenStatusIndicator();
            const setErrorStateSpy = jest.spyOn(indicator, 'setErrorState');
            
            await indicator.getNewToken();
            
            expect(setErrorStateSpy).toHaveBeenCalled();
        });

        test('should handle non-ok response', async () => {
            const mockResponse = {
                ok: false,
                status: 401
            };
            fetch.mockResolvedValue(mockResponse);
            
            indicator = new TokenStatusIndicator();
            const setErrorStateSpy = jest.spyOn(indicator, 'setErrorState');
            
            await indicator.getNewToken();
            
            expect(setErrorStateSpy).toHaveBeenCalled();
        });
    });

    describe('Auto-refresh Timer', () => {
        test('should start refresh timer on initialization', () => {
            jest.useFakeTimers();
            
            indicator = new TokenStatusIndicator();
            const updateStatusSpy = jest.spyOn(indicator, 'updateStatus');
            
            // Fast-forward time
            jest.advanceTimersByTime(30000);
            
            expect(updateStatusSpy).toHaveBeenCalled();
            
            jest.useRealTimers();
        });

        test('should stop refresh timer on destroy', () => {
            jest.useFakeTimers();
            
            indicator = new TokenStatusIndicator();
            indicator.destroy();
            
            const updateStatusSpy = jest.spyOn(indicator, 'updateStatus');
            
            // Fast-forward time
            jest.advanceTimersByTime(30000);
            
            expect(updateStatusSpy).not.toHaveBeenCalled();
            
            jest.useRealTimers();
        });
    });

    describe('Visibility Control', () => {
        test('should show status indicator', () => {
            indicator = new TokenStatusIndicator();
            indicator.hide();
            indicator.show();
            
            expect(indicator.statusBar.style.display).toBe('block');
        });

        test('should hide status indicator', () => {
            indicator = new TokenStatusIndicator();
            indicator.hide();
            
            expect(indicator.statusBar.style.display).toBe('none');
        });
    });

    describe('Cleanup', () => {
        test('should destroy indicator properly', () => {
            indicator = new TokenStatusIndicator();
            const stopTimerSpy = jest.spyOn(indicator, 'stopRefreshTimer');
            
            indicator.destroy();
            
            expect(stopTimerSpy).toHaveBeenCalled();
            expect(indicator.isInitialized).toBe(false);
        });
    });

    describe('Error Handling', () => {
        test('should handle initialization errors gracefully', () => {
            // Mock DOM manipulation to throw error
            const originalCreateElement = document.createElement;
            document.createElement = jest.fn().mockImplementation(() => {
                throw new Error('DOM error');
            });
            
            expect(() => {
                new TokenStatusIndicator();
            }).not.toThrow();
            
            document.createElement = originalCreateElement;
        });

        test('should handle update status errors gracefully', async () => {
            indicator = new TokenStatusIndicator();
            const setErrorStateSpy = jest.spyOn(indicator, 'setErrorState');
            
            // Mock getTokenInfo to throw error
            const originalGetTokenInfo = indicator.getTokenInfo;
            indicator.getTokenInfo = jest.fn().mockRejectedValue(new Error('Test error'));
            
            await indicator.updateStatus();
            
            expect(setErrorStateSpy).toHaveBeenCalled();
            
            indicator.getTokenInfo = originalGetTokenInfo;
        });
    });

    describe('Accessibility', () => {
        test('should have proper ARIA attributes', () => {
            indicator = new TokenStatusIndicator();
            const statusBar = document.getElementById('token-status-indicator');
            
            expect(statusBar.getAttribute('role')).toBe('status');
            expect(statusBar.getAttribute('aria-live')).toBe('polite');
        });

        test('should have proper button titles', () => {
            indicator = new TokenStatusIndicator();
            
            expect(indicator.refreshButton.getAttribute('title')).toBe('Refresh token status');
            expect(indicator.getTokenButton.getAttribute('title')).toBe('Get new token');
        });
    });
}); 