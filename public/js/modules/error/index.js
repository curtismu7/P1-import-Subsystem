/**
 * Error Handling Module
 * 
 * Centralized error handling for the PingOne Import Tool
 * 
 * This module provides:
 * - ErrorManager: Central error handling and processing
 * - ErrorReporter: UI error reporting and notifications
 * - ErrorBoundary: React component for catching UI errors
 * - Standard error types and utilities
 */

export { ErrorManager } from './error-manager';
export { ErrorReporter } from './error-reporter';
export { ErrorBoundary } from './ErrorBoundary';
export { 
  ErrorTypes, 
  ErrorSeverity, 
  ErrorCodes, 
  ErrorMessages, 
  ErrorMetadata,
  createError,
  isErrorType,
  getDefaultMessage,
  getDefaultSeverity
} from './error-types';

/**
 * Initialize the error handling system
 * @param {Object} logger - Logger instance
 * @param {Object} uiManager - UI Manager instance
 * @param {Object} options - Configuration options
 * @returns {Object} Initialized error handling utilities
 */
export function initializeErrorHandling(logger, uiManager, options = {}) {
  // Create error reporter and manager
  const errorReporter = new ErrorReporter(options.reporterOptions);
  const errorManager = new ErrorManager(logger, {
    ...options,
    reporter: errorReporter
  });
  
  // Initialize the error reporter with UI manager
  errorReporter.initialize(uiManager);
  
  // Set up global error handlers
  setupGlobalErrorHandlers(errorManager, options);
  
  return {
    errorManager,
    errorReporter,
    handleError: (error, context) => errorManager.handleError(error, context)
  };
}

/**
 * Set up global error handlers
 * @private
 */
function setupGlobalErrorHandlers(errorManager, options = {}) {
  const { captureUnhandledRejections = true } = options;
  
  // Handle uncaught exceptions
  if (typeof window !== 'undefined') {
    const originalOnError = window.onerror;
    
    window.onerror = (message, source, lineno, colno, error) => {
      // Call any existing error handler
      if (typeof originalOnError === 'function') {
        originalOnError(message, source, lineno, colno, error);
      }
      
      // Process the error through our error manager
      const errorObj = error || new Error(message);
      errorManager.handleError(errorObj, {
        source: 'window.onerror',
        location: `${source}:${lineno}:${colno}`
      });
      
      // Let the default handler run
      return false;
    };
  }
  
  // Handle unhandled promise rejections
  if (captureUnhandledRejections && typeof window !== 'undefined' && 'addEventListener' in window) {
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason || new Error('Unhandled promise rejection');
      errorManager.handleError(error, {
        source: 'unhandledrejection',
        event: {
          type: event.type,
          isTrusted: event.isTrusted
        }
      });
      
      // Prevent default handling (like logging to console)
      event.preventDefault();
    });
  }
}

/**
 * Create an error boundary with the given error manager
 * @param {Object} errorManager - Error manager instance
 * @param {Object} options - Error boundary options
 * @returns {React.Component} Error boundary component
 */
export function createErrorBoundary(errorManager, options = {}) {
  return function ErrorBoundaryWrapper(props) {
    return (
      <ErrorBoundary 
        errorManager={errorManager} 
        {...options} 
        {...props} 
      />
    );
  };
}

/**
 * Higher-order component for error handling
 * @param {React.Component} Component - Component to wrap
 * @param {Object} options - Error handling options
 * @returns {React.Component} Wrapped component with error handling
 */
export function withErrorHandling(Component, options = {}) {
  return function WithErrorHandling(props) {
    const { errorManager } = useErrorManager();
    
    const handleError = useCallback((error, context = {}) => {
      return errorManager.handleError(error, {
        component: Component.displayName || Component.name || 'Unknown',
        ...context
      });
    }, [errorManager]);
    
    try {
      return <Component onError={handleError} {...props} />;
    } catch (error) {
      handleError(error, { location: 'component-render' });
      
      // Return null or a fallback UI
      if (options.FallbackComponent) {
        return <options.FallbackComponent error={error} />;
      }
      
      return null;
    }
  };
}

// Context for error management
const ErrorManagerContext = React.createContext(null);

/**
 * Provider component for error management
 */
export function ErrorManagerProvider({ children, errorManager }) {
  return (
    <ErrorManagerContext.Provider value={errorManager}>
      {children}
    </ErrorManagerContext.Provider>
  );
}

/**
 * Hook to access the error manager from context
 */
export function useErrorManager() {
  const errorManager = React.useContext(ErrorManagerContext);
  
  if (!errorManager) {
    console.warn('ErrorManager not found in context. Using default implementation.');
    return {
      errorManager: new ErrorManager(console),
      handleError: (error) => console.error('Unhandled error:', error)
    };
  }
  
  const handleError = React.useCallback((error, context = {}) => {
    return errorManager.handleError(error, context);
  }, [errorManager]);
  
  return { errorManager, handleError };
}
