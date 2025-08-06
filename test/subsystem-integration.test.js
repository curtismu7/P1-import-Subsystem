/**
 * Comprehensive Subsystem Integration Tests
 * Tests the new subsystem architecture for PingOne Import Tool
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
// Mock dependencies
const mockEventBus = {
  on: jest.fn(),
  emit: jest.fn(),
  off: jest.fn()
};

const mockSettingsSubsystem = {
  getSettings: jest.fn().mockResolvedValue({
    environmentId: 'test-env',
    apiClientId: 'test-client',
    region: 'us'
  }),
  saveSettings: jest.fn().mockResolvedValue(true),
  getAllSettings: jest.fn().mockResolvedValue({
    environmentId: 'test-env',
    apiClientId: 'test-client',
    region: 'us'
  })
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

const mockUIManager = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showProgress: jest.fn(),
  hideProgress: jest.fn(),
  displayLogs: jest.fn()
};

describe('Subsystem Architecture Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage mock
    localStorage.clear();
  });

  describe('LoggingSubsystem', () => {
    let LoggingSubsystem;
    let loggingSubsystem;

    beforeAll(async () => {
      // Mock the winston logger import
      jest.doMock('../public/js/modules/winston-logger.js', () => ({
        createWinstonLogger: jest.fn(() => mockLogger)
      }));
      
      // Import the LoggingSubsystem
      const module = await import('../public/js/modules/logging-subsystem.js');
      LoggingSubsystem = module.LoggingSubsystem;
    });

    beforeEach(() => {
      loggingSubsystem = new LoggingSubsystem(mockEventBus, mockSettingsSubsystem);
    });

    test('should initialize successfully', () => {
      expect(loggingSubsystem).toBeDefined();
      expect(loggingSubsystem.eventBus).toBe(mockEventBus);
      expect(loggingSubsystem.settingsSubsystem).toBe(mockSettingsSubsystem);
    });

    test('should log messages with different levels', () => {
      loggingSubsystem.info('Test info message', { test: 'data' });
      loggingSubsystem.error('Test error message', { error: 'data' });
      loggingSubsystem.warn('Test warning message');
      loggingSubsystem.debug('Test debug message');

      expect(loggingSubsystem.logHistory.length).toBe(4);
      expect(loggingSubsystem.logHistory[0].level).toBe('debug');
      expect(loggingSubsystem.logHistory[3].level).toBe('info');
    });

    test('should emit events for log entries', () => {
      loggingSubsystem.info('Test message');
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('logEntry', expect.objectContaining({
        level: 'info',
        message: 'Test message'
      }));
    });

    test('should load logs with filtering', async () => {
      // Add some test logs
      loggingSubsystem.info('Info message');
      loggingSubsystem.error('Error message');
      loggingSubsystem.warn('Warning message');

      const result = await loggingSubsystem.loadLogs({
        level: 'error',
        limit: 10
      });

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].level).toBe('error');
      expect(result.total).toBe(1);
    });

    test('should clear logs', () => {
      loggingSubsystem.info('Test message');
      expect(loggingSubsystem.logHistory.length).toBe(1);

      loggingSubsystem.clearLogs();
      expect(loggingSubsystem.logHistory.length).toBe(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith('logsCleared', { previousCount: 1 });
    });

    test('should sanitize sensitive data', () => {
      const sensitiveData = {
        username: 'test',
        password: 'secret123',
        token: 'abc123',
        normalData: 'visible'
      };

      loggingSubsystem.info('Test message', sensitiveData);
      
      const logEntry = loggingSubsystem.logHistory[0];
      expect(logEntry.data.password).toBe('[REDACTED]');
      expect(logEntry.data.token).toBe('[REDACTED]');
      expect(logEntry.data.normalData).toBe('visible');
    });
  });

  describe('HistorySubsystem', () => {
    let HistorySubsystem;
    let historySubsystem;

    beforeAll(async () => {
      const module = await import('../public/js/modules/history-subsystem.js');
      HistorySubsystem = module.HistorySubsystem;
    });

    beforeEach(() => {
      historySubsystem = new HistorySubsystem(mockEventBus, mockSettingsSubsystem, mockLogger);
    });

    test('should initialize successfully', () => {
      expect(historySubsystem).toBeDefined();
      expect(historySubsystem.eventBus).toBe(mockEventBus);
      expect(historySubsystem.settingsSubsystem).toBe(mockSettingsSubsystem);
    });

    test('should add history entries', () => {
      const entryId = historySubsystem.addHistoryEntry(
        'import',
        'Import operation started',
        'started',
        { sessionId: 'test-session-1' }
      );

      expect(entryId).toBeDefined();
      expect(historySubsystem.history).toHaveLength(1);
      expect(historySubsystem.history[0].category).toBe('import');
      expect(historySubsystem.history[0].status).toBe('started');
    });

    test('should update history entries', () => {
      historySubsystem.addHistoryEntry(
        'export',
        'Export operation started',
        'started',
        { sessionId: 'test-session-2' }
      );

      const updated = historySubsystem.updateHistoryEntry(
        'test-session-2',
        'completed',
        'Export operation completed'
      );

      expect(updated).toBe(true);
      expect(historySubsystem.history[0].status).toBe('completed');
      expect(historySubsystem.history[0].duration).toBeDefined();
    });

    test('should filter history entries', async () => {
      historySubsystem.addHistoryEntry('import', 'Import 1', 'completed');
      historySubsystem.addHistoryEntry('export', 'Export 1', 'failed');
      historySubsystem.addHistoryEntry('import', 'Import 2', 'completed');

      const result = await historySubsystem.getHistory({
        category: 'import',
        status: 'completed'
      });

      expect(result.history).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.history.every(entry => entry.category === 'import')).toBe(true);
    });

    test('should generate history statistics', () => {
      historySubsystem.addHistoryEntry('import', 'Import 1', 'completed');
      historySubsystem.addHistoryEntry('export', 'Export 1', 'failed');
      historySubsystem.addHistoryEntry('import', 'Import 2', 'completed');

      const stats = historySubsystem.getHistoryStats();

      expect(stats.total).toBe(3);
      expect(stats.categories.import).toBe(2);
      expect(stats.categories.export).toBe(1);
      expect(stats.statuses.completed).toBe(2);
      expect(stats.statuses.failed).toBe(1);
    });

    test('should clear history', () => {
      historySubsystem.addHistoryEntry('import', 'Test', 'completed');
      expect(historySubsystem.history).toHaveLength(1);

      historySubsystem.clearHistory();
      expect(historySubsystem.history).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith('historyCleared', { previousCount: 1 });
    });
  });

  describe('PopulationSubsystem', () => {
    let PopulationSubsystem;
    let populationSubsystem;
    let mockApiClient;

    beforeAll(async () => {
      const module = await import('../public/js/modules/population-subsystem.js');
      PopulationSubsystem = module.PopulationSubsystem;
    });

    beforeEach(() => {
      mockApiClient = {
        getPopulations: jest.fn().mockResolvedValue({
          populations: [
            { id: 'pop1', name: 'Population 1' },
            { id: 'pop2', name: 'Population 2' },
            { id: 'pop3', name: 'Population 3' }
          ]
        })
      };

      populationSubsystem = new PopulationSubsystem(
        mockEventBus,
        mockSettingsSubsystem,
        mockLogger,
        mockApiClient
      );

      // Mock DOM elements
      document.body.innerHTML = `
        <select id="test-dropdown"></select>
        <select id="test-dropdown-2"></select>
      `;
    });

    test('should initialize successfully', () => {
      expect(populationSubsystem).toBeDefined();
      expect(populationSubsystem.apiClient).toBe(mockApiClient);
    });

    test('should load populations from API', async () => {
      const populations = await populationSubsystem.loadPopulations();

      expect(mockApiClient.getPopulations).toHaveBeenCalled();
      expect(populations).toHaveLength(3);
      expect(populations[0].name).toBe('Population 1');
    });

    test('should cache populations', async () => {
      // First load
      await populationSubsystem.loadPopulations();
      expect(mockApiClient.getPopulations).toHaveBeenCalledTimes(1);

      // Second load should use cache
      await populationSubsystem.loadPopulations();
      expect(mockApiClient.getPopulations).toHaveBeenCalledTimes(1);
    });

    test('should populate dropdown with populations', async () => {
      const dropdown = document.getElementById('test-dropdown');
      const success = await populationSubsystem.populateDropdown('test-dropdown');

      expect(success).toBe(true);
      expect(dropdown.children).toHaveLength(4); // 3 populations + 1 empty option
      expect(dropdown.children[0].textContent).toBe('Select a population');
      expect(dropdown.children[1].textContent).toBe('Population 1');
    });

    test('should register and manage dropdowns', () => {
      populationSubsystem.registerDropdown('test-dropdown', { includeEmpty: false });
      
      expect(populationSubsystem.managedDropdowns.has('test-dropdown')).toBe(true);
      expect(populationSubsystem.dropdownConfigs.get('test-dropdown')).toEqual({
        includeEmpty: false
      });
    });

    test('should sort populations correctly', () => {
      const populations = [
        { id: 'pop3', name: 'Zebra Population' },
        { id: 'pop1', name: 'Alpha Population' },
        { id: 'pop2', name: 'Beta Population' }
      ];

      const sorted = populationSubsystem.sortPopulations(populations, 'name', 'asc');
      
      expect(sorted[0].name).toBe('Alpha Population');
      expect(sorted[1].name).toBe('Beta Population');
      expect(sorted[2].name).toBe('Zebra Population');
    });

    test('should search populations by name', async () => {
      const results = await populationSubsystem.searchPopulations('Population 1');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Population 1');
    });

    test('should invalidate cache when needed', () => {
      populationSubsystem.cachePopulations([{ id: 'test', name: 'Test' }]);
      expect(populationSubsystem.getCachedPopulations()).toHaveLength(1);

      populationSubsystem.invalidateCache();
      expect(populationSubsystem.getCachedPopulations()).toHaveLength(0);
    });
  });

  describe('Cross-Subsystem Integration', () => {
    let loggingSubsystem, historySubsystem, populationSubsystem;

    beforeEach(async () => {
      // Mock winston logger
      jest.doMock('../public/js/modules/winston-logger.js', () => ({
        createWinstonLogger: jest.fn(() => mockLogger)
      }));

      const LoggingModule = await import('../public/js/modules/logging-subsystem.js');
      const HistoryModule = await import('../public/js/modules/history-subsystem.js');
      const PopulationModule = await import('../public/js/modules/population-subsystem.js');

      loggingSubsystem = new LoggingModule.LoggingSubsystem(mockEventBus, mockSettingsSubsystem);
      historySubsystem = new HistoryModule.HistorySubsystem(mockEventBus, mockSettingsSubsystem, loggingSubsystem);
      populationSubsystem = new PopulationModule.PopulationSubsystem(mockEventBus, mockSettingsSubsystem, loggingSubsystem, {
        getPopulations: jest.fn().mockResolvedValue({ populations: [] })
      });
    });

    test('should integrate logging and history subsystems', () => {
      // Add a history entry
      historySubsystem.addHistoryEntry('import', 'Test import', 'started');

      // Check that logging subsystem received the log
      expect(loggingSubsystem.logHistory.length).toBeGreaterThan(0);
      
      // Check that events were emitted
      expect(mockEventBus.emit).toHaveBeenCalledWith('historyEntryAdded', expect.any(Object));
    });

    test('should handle event bus communication between subsystems', () => {
      // Simulate an import operation event
      mockEventBus.emit('importStarted', { sessionId: 'test-session' });

      // Verify event listeners were set up
      expect(mockEventBus.on).toHaveBeenCalledWith('importStarted', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('importCompleted', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('importFailed', expect.any(Function));
    });

    test('should maintain consistent data flow between subsystems', async () => {
      // Test that settings changes propagate correctly
      const newSettings = { environmentId: 'new-env' };
      mockSettingsSubsystem.getSettings.mockResolvedValue(newSettings);

      // Simulate settings change event
      mockEventBus.emit('settingsChanged', newSettings);

      // Verify subsystems respond appropriately
      expect(mockEventBus.on).toHaveBeenCalledWith('settingsChanged', expect.any(Function));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle API failures gracefully', async () => {
      const failingApiClient = {
        getPopulations: jest.fn().mockRejectedValue(new Error('API Error'))
      };

      const PopulationModule = await import('../public/js/modules/population-subsystem.js');
      const populationSubsystem = new PopulationModule.PopulationSubsystem(
        mockEventBus,
        mockSettingsSubsystem,
        mockLogger,
        failingApiClient
      );

      await expect(populationSubsystem.loadPopulations()).rejects.toThrow('API Error');
      expect(mockEventBus.emit).toHaveBeenCalledWith('populationsLoadFailed', expect.any(Object));
    });

    test('should handle missing DOM elements gracefully', async () => {
      const PopulationModule = await import('../public/js/modules/population-subsystem.js');
      const populationSubsystem = new PopulationModule.PopulationSubsystem(
        mockEventBus,
        mockSettingsSubsystem,
        mockLogger,
        { getPopulations: jest.fn().mockResolvedValue({ populations: [] }) }
      );

      const success = await populationSubsystem.populateDropdown('non-existent-dropdown');
      expect(success).toBe(false);
    });

    test('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw errors
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const LoggingModule = (await import('../public/js/modules/logging-subsystem.js')).default;
      const loggingSubsystem = new LoggingModule.LoggingSubsystem(mockEventBus, mockSettingsSubsystem);
      
      // Should not throw error
      expect(() => {
        loggingSubsystem.info('Test message');
      }).not.toThrow();

      // Restore original
      localStorage.setItem = originalSetItem;
    });
  });
});
