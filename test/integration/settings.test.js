import { jest } from '@jest/globals';
import { setupBrowserEnv, setupFetchMock, waitFor } from '../helpers/test-helper.js';

// Mock the SettingsSubsystem
jest.unstable_mockModule('../../src/client/subsystems/settings-subsystem.js', () => ({
  SettingsSubsystem: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(true),
    saveSettings: jest.fn().mockResolvedValue({ success: true }),
    testConnection: jest.fn().mockResolvedValue({ success: true })
  }))
}));

// Import after setting up mocks
const { SettingsSubsystem } = await import('../../src/client/subsystems/settings-subsystem.js');

// Mock the UIManager
jest.unstable_mockModule('../../public/js/modules/ui-manager-fixed.js', () => ({
  UIManager: jest.fn().mockImplementation(() => ({
    showStatusBar: jest.fn(),
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showLoading: jest.fn(),
    hideLoading: jest.fn()
  }))
}));

// Import the app after setting up mocks
const { App } = await import('../../src/client/app.js');

describe('Settings Page Integration', () => {
  let app;
  let mockUIManager;
  let mockSettingsSubsystem;
  
  beforeEach(async () => {
    // Setup browser environment
    setupBrowserEnv();
    setupFetchMock();
    
    // Create mock UI elements
    document.body.innerHTML = `
      <div id="settings-form">
        <input id="environment-id" value="test-env-id">
        <input id="api-client-id" value="test-client-id">
        <input id="api-secret" value="test-secret">
        <select id="region">
          <option value="NorthAmerica" selected>North America</option>
          <option value="Europe">Europe</option>
        </select>
        <button id="save-settings">Save</button>
        <button id="test-connection">Test Connection</button>
      </div>
    `;
    
    // Create mock UIManager
    mockUIManager = {
      showStatusBar: jest.fn(),
      showError: jest.fn(),
      showSuccess: jest.fn(),
      showLoading: jest.fn(),
      hideLoading: jest.fn()
    };
    
    // Create mock SettingsSubsystem
    mockSettingsSubsystem = new SettingsSubsystem();
    
    // Initialize the app
    app = new App();
    app.uiManager = mockUIManager;
    app.settingsSubsystem = mockSettingsSubsystem;
    
    // Initialize the settings page
    await app.initializeSettingsPage();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });
  
  test('should initialize settings form with saved values', async () => {
    // Mock the fetch response for getting settings
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          environmentId: 'saved-env-id',
          apiClientId: 'saved-client-id',
          region: 'Europe'
        })
      })
    );
    
    // Trigger settings load
    await app.settingsSubsystem.loadSettings();
    
    // Check if form fields are populated with saved values
    expect(document.getElementById('environment-id').value).toBe('saved-env-id');
    expect(document.getElementById('api-client-id').value).toBe('saved-client-id');
    expect(document.getElementById('region').value).toBe('Europe');
  });
  
  test('should save settings when form is submitted', async () => {
    // Simulate form submission
    const saveButton = document.getElementById('save-settings');
    saveButton.click();
    
    // Wait for async operations
    await waitFor(100);
    
    // Check if saveSettings was called with correct parameters
    expect(mockSettingsSubsystem.saveSettings).toHaveBeenCalledWith({
      environmentId: 'test-env-id',
      apiClientId: 'test-client-id',
      apiSecret: 'test-secret',
      region: 'NorthAmerica'
    });
    
    // Check if success message was shown
    expect(mockUIManager.showSuccess).toHaveBeenCalledWith(
      'Settings saved successfully',
      expect.any(Object)
    );
  });
  
  test('should test connection when test button is clicked', async () => {
    // Mock successful connection test
    mockSettingsSubsystem.testConnection.mockResolvedValueOnce({ success: true });
    
    // Simulate test connection button click
    const testButton = document.getElementById('test-connection');
    testButton.click();
    
    // Wait for async operations
    await waitFor(100);
    
    // Check if testConnection was called
    expect(mockSettingsSubsystem.testConnection).toHaveBeenCalled();
    
    // Check if success message was shown
    expect(mockUIManager.showSuccess).toHaveBeenCalledWith(
      'Connection test successful',
      expect.any(Object)
    );
  });
  
  test('should show error when connection test fails', async () => {
    // Mock failed connection test
    const error = new Error('Connection failed');
    mockSettingsSubsystem.testConnection.mockRejectedValueOnce(error);
    
    // Simulate test connection button click
    const testButton = document.getElementById('test-connection');
    testButton.click();
    
    // Wait for async operations
    await waitFor(100);
    
    // Check if error was shown
    expect(mockUIManager.showError).toHaveBeenCalledWith(
      expect.stringContaining('Connection failed'),
      expect.any(Object)
    );
  });
});
