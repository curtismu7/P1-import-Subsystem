/**
 * Progress Tracking Subsystem
 * 
 * Provides a unified API for tracking progress of long-running operations.
 * This subsystem encapsulates all progress-related functionality, providing
 * a clean interface for the rest of the application.
 * 
 * Key features:
 * - Multiple concurrent progress tracking
 * - Progress normalization
 * - Event notifications
 * - Cancelable operations
 * - Persistent progress state
 * - UI components for progress display
 * 
 * Usage:
 * ```javascript
 * import { createProgressTracker, ProgressContainer } from 'progress-subsystem';
 * 
 * // Create progress tracker
 * const progressTracker = createProgressTracker({
 *   logger,
 *   persistent: true
 * });
 * 
 * // Create UI component
 * const progressContainer = new ProgressContainer({
 *   progressTracker,
 *   containerId: 'progress-container'
 * });
 * 
 * // Start tracking progress
 * progressTracker.start('operation-1', {
 *   total: 100,
 *   message: 'Starting operation...',
 *   metadata: {
 *     title: 'Import Users'
 *   }
 * });
 * 
 * // Update progress
 * progressTracker.update('operation-1', {
 *   progress: 50,
 *   message: 'Processing data...'
 * });
 * 
 * // Complete progress
 * progressTracker.complete('operation-1', {
 *   message: 'Operation completed successfully'
 * });
 * ```
 */

import ProgressTracker from './progress-tracker.js';
import ProgressContainer from './ui/progress-container.js';

/**
 * Create a progress tracker with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {ProgressTracker} Configured progress tracker
 */
function createProgressTracker(options = {}) {
    return new ProgressTracker(options);
}

// Export factory function
export { createProgressTracker };

// Export classes for direct instantiation
export { ProgressTracker, ProgressContainer };

// Export default factory function
export default createProgressTracker;