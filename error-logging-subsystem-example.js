/**
 * Error Handling and Logging Subsystem Example
 * 
 * This file demonstrates how the Error Handling and Logging Subsystem would be used
 * in the PingOne Import Tool. It shows the key components and their interactions.
 */

// Import the subsystem components
import { ErrorManager } from './js/modules/error-handling/error-manager.js';
import { LogManager } from './js/modules/error-handling/log-manager.js';
import { ErrorService } from './js/modules/error-handling/error-service.js';
import { LoggingService } from './js/modules/error-handling/logging-service.js';
import { ErrorReporter } from './js/modules/error-handling/error-reporter.js';
import { ConsoleLogDestination } from './js/modules/error-handling/destinations/console-log-destination.js';
import { FileLogDestination } from './js/modules/error-handling/destinations/file-log-destination.js';
import { DefaultLogFormatter } from './js/modules/error-handling/formatters/default-log-formatter.js';

/**
 * Initialize the Error Handling and Logging Subsystem
 */
function initErrorHandlingSubsystem() {
  // Create log formatter
  const logFormatter = new DefaultLogFormatter();
  
  // Create log destinations
  const consoleDestination = new ConsoleLogDestination({
    minLevel: 'debug',
    formatter: logFormatter
  });
  
  const fileDestination = new FileLogDestination({
    minLevel: 'info',
    formatter: logFormatter,
    filename: 'application.log',
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  });
  
  // Create logging service
  const loggingService = new LoggingService({
    minLevel: 'debug',
    includeTimestamp: true,
    destinations: [consoleDestination, fileDestination]
  });
  
  // Create error reporter
  const errorReporter = new ErrorReporter(window.uiManager, {
    defaultDuration: 5000,
    defaultPosition: 'top-right'
  });
  
  // Create error service
  const errorService = new ErrorService(loggingService, errorReporter, {
    captureUnhandledErrors: true,
    captureRejections: true,
    defaultErrorLevel: 'error',
    contextProvider: () => ({
      userId: window.currentUser?.id,
      sessionId: window.sessionId,
      url: window.location.href
    })
  });
  
  // Create facade components
  const errorManager = new ErrorManager(errorService, loggingService);
  const logManager = new LogManager(loggingService);
  
  // Expose the components globally for easy access
  window.errorManager = errorManager;
  window.logManager = logManager;
  
  // Return the components
  return {
    errorManager,
    logManager,
    errorService,
    loggingService,
    errorReporter
  };
}

/**
 * Example usage in the Import component
 */
class ImportManager {
  constructor(errorManager, logManager) {
    this.errorManager = errorManager;
    this.logger = logManager.getLogger('ImportManager');
  }
  
  async importUsers(file, populationId) {
    this.logger.info('Starting import process', {
      fileName: file.name,
      fileSize: file.size,
      populationId
    });
    
    try {
      // Validate inputs
      if (!file) {
        throw this.errorManager.createValidationError('No file selected', 'file');
      }
      
      if (!populationId) {
        throw this.errorManager.createValidationError('No population selected', 'populationId');
      }
      
      // Process the file
      this.logger.debug('Processing file', { fileName: file.name });
      const users = await this.parseFile(file);
      
      // Import users
      this.logger.info(`Importing ${users.length} users to population ${populationId}`);
      await this.importUsersToPopulation(users, populationId);
      
      // Log success
      this.logger.info('Import completed successfully', {
        usersImported: users.length,
        populationId
      });
      
      return {
        success: true,
        usersImported: users.length
      };
    } catch (error) {
      // Handle the error
      this.errorManager.handleError(error, {
        component: 'ImportManager',
        operation: 'importUsers',
        fileName: file?.name,
        populationId
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async parseFile(file) {
    this.logger.debug('Parsing file', { fileName: file.name });
    
    try {
      // File parsing logic
      const content = await this.readFile(file);
      const users = this.parseCSV(content);
      
      this.logger.debug(`Parsed ${users.length} users from file`, {
        fileName: file.name
      });
      
      return users;
    } catch (error) {
      // Transform the error to provide more context
      throw this.errorManager.createError(
        `Failed to parse file: ${error.message}`,
        'FILE_PARSE_ERROR',
        { fileName: file.name }
      );
    }
  }
  
  async importUsersToPopulation(users, populationId) {
    this.logger.debug(`Importing ${users.length} users to population ${populationId}`);
    
    try {
      // Import logic
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        
        this.logger.debug(`Importing user ${i + 1}/${users.length}`, {
          email: user.email,
          populationId
        });
        
        await this.importUser(user, populationId);
      }
    } catch (error) {
      // Transform the error to provide more context
      throw this.errorManager.createError(
        `Failed to import users: ${error.message}`,
        'IMPORT_ERROR',
        { usersCount: users.length, populationId }
      );
    }
  }
  
  // Simulated methods
  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
  
  parseCSV(content) {
    // Simplified CSV parsing
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [email, firstName, lastName] = line.split(',');
        return { email, firstName, lastName };
      });
  }
  
  async importUser(user, populationId) {
    // Simulated API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.95) {
          reject(new Error(`Failed to import user ${user.email}`));
        } else {
          resolve({ success: true });
        }
      }, 10);
    });
  }
}

/**
 * Example usage in the application
 */
async function exampleUsage() {
  // Initialize the subsystem
  const { errorManager, logManager } = initErrorHandlingSubsystem();
  
  // Create an instance of ImportManager
  const importManager = new ImportManager(errorManager, logManager);
  
  // Get a logger for this module
  const logger = logManager.getLogger('ExampleUsage');
  
  logger.info('Starting example usage');
  
  // Simulate file selection
  const file = new File(['email,firstName,lastName\nuser1@example.com,User,One'], 'users.csv');
  
  // Simulate population selection
  const populationId = 'population-123';
  
  // Import users
  logger.info('Importing users', { fileName: file.name, populationId });
  const result = await importManager.importUsers(file, populationId);
  
  // Log the result
  if (result.success) {
    logger.info('Import successful', { usersImported: result.usersImported });
  } else {
    logger.error('Import failed', { error: result.error });
  }
  
  // Example of direct error handling
  try {
    // Some operation that might fail
    throw new Error('Example error');
  } catch (error) {
    errorManager.handleError(error, {
      component: 'ExampleUsage',
      operation: 'exampleOperation'
    });
  }
  
  logger.info('Example usage completed');
}

// Run the example
exampleUsage().catch(error => {
  console.error('Unhandled error in example:', error);
});