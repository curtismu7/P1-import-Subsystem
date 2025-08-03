/**
 * UI Logger Test
 * 
 * This script tests the functionality of the centralized UI logger.
 */

import { uiLogger } from '../public/js/utils/uiLogger.js';

describe('UI Logger', () => {
  it('should log info messages correctly', () => {
    const log = uiLogger.info('Test info message', { testId: '001' });
    expect(log.level).toBe('info');
    expect(log.message).toBe('Test info message');
    expect(log.context).toBe('UIManager');
  });

  it('should log error messages correctly', () => {
    const log = uiLogger.error('Test error message', { testId: '002' });
    expect(log.level).toBe('error');
    expect(log.message).toBe('Test error message');
    expect(log.context).toBe('UIManager');
  });
});
