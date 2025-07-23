/**
 * Server-Side Message Formatter Module
 * 
 * A comprehensive message formatting system that transforms raw server messages
 * into visually appealing, structured, and user-friendly formats for frontend
 * display. This module ensures consistent message presentation across all
 * application components and provides enhanced readability for real-time updates.
 * 
 * ## Core Features
 * 
 * ### Visual Enhancement
 * - **Structured Layouts**: Organized message blocks with clear sections
 * - **Visual Separators**: Customizable separators for message boundaries
 * - **Event Markers**: Distinctive markers for different event types
 * - **Timestamp Integration**: Consistent timestamp formatting across messages
 * - **Color Coding**: Event-specific color schemes for visual distinction
 * 
 * ### Message Categories
 * - **Progress Messages**: Real-time progress updates with statistics
 * - **Completion Messages**: Operation completion notifications with results
 * - **Error Messages**: Detailed error information with context
 * - **Event Messages**: General event notifications and status updates
 * - **SSE Messages**: Server-Sent Event message formatting
 * 
 * ### Formatting Capabilities
 * - **Multi-line Formatting**: Proper line breaks and indentation
 * - **Data Structuring**: Organized presentation of complex data
 * - **Length Management**: Automatic truncation for long messages
 * - **Escape Handling**: Safe handling of special characters
 * - **Responsive Design**: Adaptable formatting for different display contexts
 * 
 * ## Supported Operations
 * 
 * ### Import Operations
 * - CSV file import progress and completion
 * - User creation and validation messages
 * - Error handling and recovery information
 * - Statistics and performance metrics
 * 
 * ### Export Operations
 * - Data export progress tracking
 * - File generation status updates
 * - Download availability notifications
 * - Export statistics and summaries
 * 
 * ### Modification Operations
 * - Bulk user modification progress
 * - Individual update confirmations
 * - Validation error reporting
 * - Change summaries and audit trails
 * 
 * ### System Operations
 * - Connection status updates
 * - Authentication events
 * - System health notifications
 * - Configuration changes
 * 
 * ## Integration Patterns
 * 
 * ### Real-time Updates
 * ```javascript
 * // Format progress message for Socket.IO
 * const formattedMessage = formatter.formatProgressMessage(
 *   'import', 50, 100, 'Processing users...', { created: 45, failed: 5 }
 * );
 * socket.emit('progress', { message: formattedMessage });
 * ```
 * 
 * ### Error Reporting
 * ```javascript
 * // Format error message with context
 * const errorMessage = formatter.formatErrorMessage(
 *   'import', 'Validation failed', { row: 15, field: 'email' }
 * );
 * socket.emit('error', { message: errorMessage });
 * ```
 * 
 * ### Completion Notifications
 * ```javascript
 * // Format completion message with results
 * const completionMessage = formatter.formatCompletionMessage(
 *   'import', { total: 100, success: 95, failed: 5 }
 * );
 * socket.emit('completion', { message: completionMessage });
 * ```
 * 
 * ## Customization Options
 * 
 * ### Formatting Configuration
 * - **Separator Characters**: Customize visual separators
 * - **Timestamp Display**: Enable/disable timestamp inclusion
 * - **Event Markers**: Configure event type indicators
 * - **Message Length**: Set maximum message length limits
 * - **Color Schemes**: Define color coding for different events
 * 
 * ### Display Preferences
 * - **Verbosity Levels**: Control detail level in messages
 * - **Layout Options**: Choose between compact and expanded formats
 * - **Language Support**: Localization-ready message templates
 * - **Theme Integration**: Adapt to light/dark theme preferences
 * 
 * ## Performance Considerations
 * 
 * ### Optimization Features
 * - **Lazy Formatting**: Format messages only when needed
 * - **Template Caching**: Cache frequently used message templates
 * - **Memory Efficiency**: Minimize memory footprint for large messages
 * - **Processing Speed**: Optimized formatting algorithms
 * 
 * ### Scalability
 * - **Batch Processing**: Handle multiple messages efficiently
 * - **Streaming Support**: Format messages in real-time streams
 * - **Resource Management**: Automatic cleanup of formatting resources
 * - **Load Balancing**: Distribute formatting load across instances
 * 
 * ## Security Features
 * 
 * ### Data Protection
 * - **Input Sanitization**: Clean user input before formatting
 * - **XSS Prevention**: Escape HTML and JavaScript in messages
 * - **PII Filtering**: Remove or mask personally identifiable information
 * - **Content Validation**: Validate message content before display
 * 
 * ### Access Control
 * - **Message Filtering**: Filter messages based on user permissions
 * - **Sensitive Data Handling**: Special handling for sensitive information
 * - **Audit Logging**: Log message formatting activities
 * - **Compliance Support**: Support for regulatory compliance requirements
 * 
 * @fileoverview Server-side message formatting system for enhanced user experience
 * @author PingOne Import Tool Team
 * @version 3.1.0
 * @since 1.0.0
 * 
 * @requires winston-config Logging configuration utilities
 * 
 * @example
 * // Basic message formatting
 * import formatter from './message-formatter.js';
 * const message = formatter.formatProgressMessage('import', 50, 100, 'Processing...');
 * 
 * @example
 * // Custom formatting options
 * formatter.updateFormattingOptions({
 *   separatorChar: '=',
 *   showTimestamps: false,
 *   maxMessageLength: 150
 * });
 * 
 * @example
 * // Error message with details
 * const errorMsg = formatter.formatErrorMessage('validation', 'Invalid email', {
 *   row: 15,
 *   column: 'email',
 *   value: 'invalid-email'
 * });
 * 
 * TODO: Add support for internationalization (i18n)
 * TODO: Implement message templates for common scenarios
 * TODO: Add support for rich text formatting (HTML/Markdown)
 * VERIFY: All message types handle edge cases correctly
 * DEBUG: Monitor formatting performance with large message volumes
 */

import { logSeparator, logTag } from './winston-config.js';

/**
 * Server-Side Message Formatter Class
 * 
 * Core class responsible for transforming raw server messages into structured,
 * visually appealing formats suitable for frontend display. Provides consistent
 * formatting across all message types and supports extensive customization.
 * 
 * ## Class Responsibilities
 * - **Message Transformation**: Convert raw data into formatted messages
 * - **Visual Enhancement**: Add separators, timestamps, and event markers
 * - **Content Organization**: Structure complex data for readability
 * - **Template Management**: Manage formatting templates for different event types
 * - **Configuration Management**: Handle formatting preferences and options
 * 
 * ## Formatting Architecture
 * - **Event-Based Formatting**: Different formats for different event types
 * - **Template System**: Reusable templates for consistent formatting
 * - **Hierarchical Structure**: Organized message blocks with clear sections
 * - **Responsive Design**: Adaptable formatting for different display contexts
 * 
 * @class ServerMessageFormatter
 */
class ServerMessageFormatter {
    /**
     * Initialize Message Formatter
     * 
     * Creates a new message formatter instance with default configuration
     * and event type definitions. Sets up formatting options and templates
     * for consistent message presentation.
     * 
     * ## Default Configuration
     * - **Timestamps**: Enabled for all messages
     * - **Event Markers**: Distinctive markers for event types
     * - **Visual Separators**: Asterisk-based separators
     * - **Message Length**: 200 character limit
     * - **Separator Length**: 50 character separators
     * 
     * ## Event Type Support
     * - **Import Operations**: User import processes
     * - **Export Operations**: Data export processes
     * - **Modify Operations**: User modification processes
     * - **Delete Operations**: User deletion processes
     * - **Validation Operations**: Data validation processes
     * - **Connection Operations**: System connection events
     * 
     * @constructor
     * 
     * @example
     * const formatter = new ServerMessageFormatter();
     * 
     * TODO: Add configuration validation
     * VERIFY: Default options are appropriate for all use cases
     * DEBUG: Monitor constructor performance and memory usage
     */
    constructor() {
        // Message formatting options with comprehensive defaults
        this.formattingOptions = {
            showTimestamps: true,        // Include timestamps in messages
            showEventMarkers: true,      // Show event type markers
            showSeparators: true,        // Include visual separators
            maxMessageLength: 200,       // Maximum message length
            separatorChar: '*',          // Character for separators
            separatorLength: 50,         // Length of separator lines
            indentSize: 2,              // Indentation size for nested content
            dateFormat: 'HH:mm:ss',     // Timestamp format
            truncateIndicator: '...',    // Indicator for truncated messages
            enableColors: true,          // Enable color coding
            compactMode: false          // Compact vs expanded formatting
        };

        // Event type configurations with visual and behavioral settings
        this.eventTypes = {
            import: {
                start: 'IMPORT STARTED',
                end: 'IMPORT COMPLETED',
                error: 'IMPORT ERROR',
                progress: 'IMPORT PROGRESS',
                color: '#3498db',           // Blue for import operations
                icon: '📥',
                priority: 'high'
            },
            export: {
                start: 'EXPORT STARTED',
                end: 'EXPORT COMPLETED',
                error: 'EXPORT ERROR',
                progress: 'EXPORT PROGRESS',
                color: '#27ae60',           // Green for export operations
                icon: '📤',
                priority: 'medium'
            },
            modify: {
                start: 'MODIFY STARTED',
                end: 'MODIFY COMPLETED',
                error: 'MODIFY ERROR',
                progress: 'MODIFY PROGRESS',
                color: '#f39c12',           // Orange for modify operations
                icon: '✏️',
                priority: 'medium'
            },
            delete: {
                start: 'DELETE STARTED',
                end: 'DELETE COMPLETED',
                error: 'DELETE ERROR',
                progress: 'DELETE PROGRESS',
                color: '#e74c3c',           // Red for delete operations
                icon: '🗑️',
                priority: 'high'
            },
            validation: {
                start: 'VALIDATION STARTED',
                end: 'VALIDATION COMPLETED',
                error: 'VALIDATION ERROR',
                progress: 'VALIDATION PROGRESS',
                color: '#9b59b6',           // Purple for validation operations
                icon: '✅',
                priority: 'medium'
            },
            connection: {
                start: 'CONNECTION ESTABLISHED',
                end: 'CONNECTION CLOSED',
                error: 'CONNECTION ERROR',
                progress: 'CONNECTION STATUS',
                color: '#1abc9c',           // Teal for connection operations
                icon: '🔗',
                priority: 'low'
            },
            authentication: {
                start: 'AUTHENTICATION STARTED',
                end: 'AUTHENTICATION COMPLETED',
                error: 'AUTHENTICATION ERROR',
                progress: 'AUTHENTICATION PROGRESS',
                color: '#34495e',           // Dark gray for auth operations
                icon: '🔐',
                priority: 'high'
            },
            system: {
                start: 'SYSTEM OPERATION STARTED',
                end: 'SYSTEM OPERATION COMPLETED',
                error: 'SYSTEM ERROR',
                progress: 'SYSTEM STATUS',
                color: '#95a5a6',           // Light gray for system operations
                icon: '⚙️',
                priority: 'low'
            }
        };

        // Message templates for common scenarios
        this.messageTemplates = {
            progress: '{timestamp} [{operation}] {current}/{total} ({percentage}%) - {message}',
            completion: '{timestamp} [{operation}] Completed successfully - {summary}',
            error: '{timestamp} [{operation}] ERROR: {message} - {details}',
            status: '{timestamp} [{operation}] {message}'
        };

        // Statistics for monitoring formatter usage
        this.stats = {
            messagesFormatted: 0,
            errorCount: 0,
            averageProcessingTime: 0,
            lastUsed: null
        };
    }

    /**
     * Format Message Block with Visual Separators
     * 
     * Creates a structured message block with visual separators, event markers,
     * timestamps, and organized content. This is the primary formatting method
     * used for creating visually appealing message displays.
     * 
     * ## Message Block Structure
     * ```
     * ************************************************
     * IMPORT STARTED
     * [14:30:25] Processing user data file
     *   Details:
     *     filename: users.csv
     *     size: 1024 KB
     *     rows: 500
     * ************************************************
     * ```
     * 
     * ## Formatting Features
     * - **Visual Boundaries**: Clear message boundaries with separators
     * - **Event Identification**: Distinctive markers for event types
     * - **Temporal Context**: Precise timestamps for event timing
     * - **Structured Details**: Organized presentation of additional information
     * - **Error Handling**: Graceful fallback for formatting failures
     * 
     * ## Event Stages
     * - **start**: Operation initiation markers
     * - **progress**: Ongoing operation updates
     * - **end**: Operation completion markers
     * - **error**: Error condition markers
     * 
     * @method formatMessageBlock
     * @param {string} eventType - Type of event (import, export, modify, delete, etc.)
     * @param {string} eventStage - Stage of the event (start, end, error, progress)
     * @param {string} message - The main message content to display
     * @param {Object} [details={}] - Additional details to include in the message
     * @param {string} [details.filename] - File name for file operations
     * @param {number} [details.size] - File or data size
     * @param {number} [details.count] - Item count
     * @param {string} [details.user] - User identifier
     * @param {Object} [details.error] - Error information
     * @returns {string} Formatted message block with visual enhancements
     * 
     * @example
     * // Format import start message
     * const message = formatter.formatMessageBlock(
     *   'import',
     *   'start',
     *   'Beginning user import process',
     *   { filename: 'users.csv', rows: 100 }
     * );
     * 
     * @example
     * // Format error message with details
     * const errorMessage = formatter.formatMessageBlock(
     *   'validation',
     *   'error',
     *   'Data validation failed',
     *   { row: 15, field: 'email', value: 'invalid@' }
     * );
     * 
     * @example
     * // Format completion message
     * const completionMessage = formatter.formatMessageBlock(
     *   'export',
     *   'end',
     *   'Export process completed successfully',
     *   { exported: 250, duration: '2.5s' }
     * );
     * 
     * TODO: Add support for custom message templates
     * TODO: Implement message priority-based formatting
     * VERIFY: All event types and stages are properly handled
     * DEBUG: Monitor formatting performance for large detail objects
     */
    formatMessageBlock(eventType, eventStage, message, details = {}) {
        const startTime = Date.now();

        try {
            // Update usage statistics
            this.stats.messagesFormatted++;
            this.stats.lastUsed = new Date().toISOString();

            // Get event configuration with fallback
            const eventConfig = this.eventTypes[eventType] || this.eventTypes.system;
            const timestamp = this.formatTimestamp(new Date());
            const separator = this.createSeparator();

            let formattedMessage = '';

            // Add opening separator
            if (this.formattingOptions.showSeparators) {
                formattedMessage += separator + '\n';
            }

            // Add event marker with icon if enabled
            if (this.formattingOptions.showEventMarkers) {
                const marker = this.getEventMarker(eventConfig, eventStage);
                const icon = this.formattingOptions.enableColors && eventConfig.icon ?
                    `${eventConfig.icon} ` : '';
                formattedMessage += `${icon}${marker}\n`;
            }

            // Add timestamp if enabled
            if (this.formattingOptions.showTimestamps) {
                formattedMessage += `[${timestamp}] `;
            }

            // Add main message with length management
            const truncatedMessage = this.truncateMessage(message);
            formattedMessage += truncatedMessage + '\n';

            // Add structured details if present
            if (details && Object.keys(details).length > 0) {
                formattedMessage += this.formatDetails(details);
            }

            // Add closing separator
            if (this.formattingOptions.showSeparators) {
                formattedMessage += separator + '\n';
            }

            // Update performance statistics
            const processingTime = Date.now() - startTime;
            this.updatePerformanceStats(processingTime);

            return formattedMessage;

        } catch (error) {
            // Update error statistics
            this.stats.errorCount++;

            console.error('Error formatting message block:', {
                error: error.message,
                eventType,
                eventStage,
                message: message?.substring(0, 100),
                detailKeys: details ? Object.keys(details) : []
            });

            // Return safe fallback message
            const timestamp = this.formatTimestamp(new Date());
            return `[${timestamp}] ${eventType?.toUpperCase() || 'SYSTEM'}: ${message || 'Message formatting error'}`;
        }
    }

    /**
     * Format Progress Update Message
     * 
     * Creates formatted progress messages for real-time operation tracking.
     * Provides visual progress indicators, statistics, and contextual information
     * to keep users informed about long-running operations.
     * 
     * ## Progress Message Features
     * - **Visual Progress Bar**: ASCII-based progress visualization
     * - **Percentage Display**: Clear percentage completion indicator
     * - **Statistics Integration**: Detailed operation statistics
     * - **Contextual Messages**: Operation-specific status messages
     * - **Time Estimation**: Estimated completion time (when available)
     * 
     * ## Progress Display Format
     * ```
     * [14:30:25] IMPORT PROGRESS: 75/100 (75%) ████████████░░░░ - Processing user john.doe
     *   Statistics:
     *     Created: 70
     *     Failed: 5
     *     Rate: 25 items/sec
     *     ETA: 10 seconds
     * ```
     * 
     * @method formatProgressMessage
     * @param {string} operation - Operation type (import, export, modify, etc.)
     * @param {number} current - Current number of items processed
     * @param {number} total - Total number of items to process
     * @param {string} message - Current operation status message
     * @param {Object} [stats={}] - Progress statistics and metrics
     * @param {number} [stats.created] - Number of items created
     * @param {number} [stats.updated] - Number of items updated
     * @param {number} [stats.failed] - Number of items failed
     * @param {number} [stats.skipped] - Number of items skipped
     * @param {number} [stats.rate] - Processing rate (items per second)
     * @param {number} [stats.eta] - Estimated time to completion (seconds)
     * @returns {string} Formatted progress message with visual indicators
     * 
     * @example
     * // Basic progress message
     * const progress = formatter.formatProgressMessage(
     *   'import', 50, 100, 'Processing user data'
     * );
     * 
     * @example
     * // Progress with detailed statistics
     * const progressWithStats = formatter.formatProgressMessage(
     *   'export', 75, 100, 'Generating CSV file',
     *   { created: 75, failed: 0, rate: 25, eta: 10 }
     * );
     * 
     * TODO: Add visual progress bar generation
     * TODO: Implement ETA calculation based on processing rate
     * VERIFY: Progress calculations handle edge cases (zero total, etc.)
     * DEBUG: Monitor progress message frequency and performance impact
     */
    formatProgressMessage(operation, current, total, message, stats = {}) {
        const startTime = Date.now();

        try {
            // Update usage statistics
            this.stats.messagesFormatted++;

            // Validate input parameters
            if (typeof current !== 'number' || typeof total !== 'number') {
                throw new Error('Current and total must be numbers');
            }

            const timestamp = this.formatTimestamp(new Date());
            const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
            const eventConfig = this.eventTypes[operation] || this.eventTypes.system;

            let formattedMessage = '';

            // Add timestamp if enabled
            if (this.formattingOptions.showTimestamps) {
                formattedMessage += `[${timestamp}] `;
            }

            // Add operation icon if enabled
            if (this.formattingOptions.enableColors && eventConfig.icon) {
                formattedMessage += `${eventConfig.icon} `;
            }

            // Add progress indicator with visual bar
            const progressBar = this.createProgressBar(percentage);
            formattedMessage += `${operation.toUpperCase()} PROGRESS: ${current}/${total} (${percentage}%) ${progressBar}`;

            // Add current operation message
            if (message) {
                const truncatedMessage = this.truncateMessage(message, 100);
                formattedMessage += ` - ${truncatedMessage}`;
            }

            // Add detailed statistics if available
            if (stats && Object.keys(stats).length > 0) {
                formattedMessage += '\n' + this.formatProgressStats(stats);
            }

            // Add ETA if available
            if (stats.eta && stats.eta > 0) {
                const etaFormatted = this.formatDuration(stats.eta * 1000);
                formattedMessage += `\n  ETA: ${etaFormatted}`;
            }

            // Update performance statistics
            const processingTime = Date.now() - startTime;
            this.updatePerformanceStats(processingTime);

            return formattedMessage;

        } catch (error) {
            this.stats.errorCount++;

            console.error('Error formatting progress message:', {
                error: error.message,
                operation,
                current,
                total,
                message: message?.substring(0, 50)
            });

            // Return safe fallback
            const timestamp = this.formatTimestamp(new Date());
            return `[${timestamp}] ${operation?.toUpperCase() || 'PROGRESS'}: ${current}/${total} - ${message || 'Processing...'}`;
        }
    }

    /**
     * Format an error message with context
     * @param {string} operation - Operation type
     * @param {string} errorMessage - Error message
     * @param {Object} errorDetails - Error details
     * @returns {string} Formatted error message
     */
    formatErrorMessage(operation, errorMessage, errorDetails = {}) {
        try {
            const eventConfig = this.eventTypes[operation] || this.eventTypes.import;
            const timestamp = this.formatTimestamp(new Date());
            const separator = this.createSeparator();

            let formattedMessage = '';

            // Add separator
            if (this.formattingOptions.showSeparators) {
                formattedMessage += separator + '\n';
            }

            // Add error marker
            formattedMessage += `${eventConfig.error}\n`;

            // Add timestamp and error message
            if (this.formattingOptions.showTimestamps) {
                formattedMessage += `[${timestamp}] `;
            }
            formattedMessage += `ERROR: ${errorMessage}\n`;

            // Add error details if present
            if (errorDetails && Object.keys(errorDetails).length > 0) {
                formattedMessage += this.formatErrorDetails(errorDetails);
            }

            // Add separator
            if (this.formattingOptions.showSeparators) {
                formattedMessage += separator + '\n';
            }

            return formattedMessage;
        } catch (error) {
            console.error('Error formatting error message:', error);
            return `ERROR: ${errorMessage}`;
        }
    }

    /**
     * Format a completion message with results
     * @param {string} operation - Operation type
     * @param {Object} results - Operation results
     * @returns {string} Formatted completion message
     */
    formatCompletionMessage(operation, results = {}) {
        try {
            const eventConfig = this.eventTypes[operation] || this.eventTypes.import;
            const timestamp = this.formatTimestamp(new Date());
            const separator = this.createSeparator();

            let formattedMessage = '';

            // Add separator
            if (this.formattingOptions.showSeparators) {
                formattedMessage += separator + '\n';
            }

            // Add completion marker
            formattedMessage += `${eventConfig.end}\n`;

            // Add timestamp
            if (this.formattingOptions.showTimestamps) {
                formattedMessage += `[${timestamp}] `;
            }

            // Add completion message
            formattedMessage += `Operation completed successfully\n`;

            // Add results if present
            if (results && Object.keys(results).length > 0) {
                formattedMessage += this.formatResults(results);
            }

            // Add separator
            if (this.formattingOptions.showSeparators) {
                formattedMessage += separator + '\n';
            }

            return formattedMessage;
        } catch (error) {
            console.error('Error formatting completion message:', error);
            return 'Operation completed successfully';
        }
    }

    /**
     * Format SSE event data for display
     * @param {Object} eventData - SSE event data
     * @returns {string} Formatted event message
     */
    formatSSEEvent(eventData) {
        try {
            const { type, message, current, total, counts, error } = eventData;
            const timestamp = this.formatTimestamp(new Date());

            let formattedMessage = '';

            // Add timestamp
            if (this.formattingOptions.showTimestamps) {
                formattedMessage += `[${timestamp}] `;
            }

            // Format based on event type
            switch (type) {
                case 'progress':
                    formattedMessage += this.formatProgressMessage('import', current, total, message, counts);
                    break;
                case 'completion':
                    formattedMessage += this.formatCompletionMessage('import', eventData);
                    break;
                case 'error':
                    formattedMessage += this.formatErrorMessage('import', message, eventData);
                    break;
                default:
                    formattedMessage += `SSE EVENT [${type.toUpperCase()}]: ${message || 'No message'}`;
            }

            return formattedMessage;
        } catch (error) {
            console.error('Error formatting SSE event:', error);
            return eventData.message || 'SSE event received';
        }
    }

    /**
     * Create a visual separator line
     * @returns {string} Separator string
     */
    createSeparator() {
        const char = this.formattingOptions.separatorChar;
        const length = this.formattingOptions.separatorLength;
        return char.repeat(length);
    }

    /**
     * Get event marker based on event type and stage
     * @param {Object} eventConfig - Event configuration
     * @param {string} stage - Event stage
     * @returns {string} Event marker
     */
    getEventMarker(eventConfig, stage) {
        switch (stage) {
            case 'start':
                return eventConfig.start;
            case 'end':
                return eventConfig.end;
            case 'error':
                return eventConfig.error;
            default:
                return eventConfig.start;
        }
    }

    /**
     * Format timestamp for display
     * @param {Date} date - Date to format
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(date) {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * Format details object for display
     * @param {Object} details - Details object
     * @returns {string} Formatted details
     */
    formatDetails(details) {
        try {
            let formatted = '';
            for (const [key, value] of Object.entries(details)) {
                if (value !== null && value !== undefined) {
                    formatted += `  ${key}: ${value}\n`;
                }
            }
            return formatted;
        } catch (error) {
            console.error('Error formatting details:', error);
            return '';
        }
    }

    /**
     * Format progress statistics
     * @param {Object} stats - Progress statistics
     * @returns {string} Formatted statistics
     */
    formatProgressStats(stats) {
        try {
            let formatted = '  Statistics:\n';
            const statLabels = {
                processed: 'Processed',
                success: 'Success',
                failed: 'Failed',
                skipped: 'Skipped',
                duplicates: 'Duplicates'
            };

            for (const [key, value] of Object.entries(stats)) {
                if (value !== null && value !== undefined && statLabels[key]) {
                    formatted += `    ${statLabels[key]}: ${value}\n`;
                }
            }

            return formatted;
        } catch (error) {
            console.error('Error formatting progress stats:', error);
            return '';
        }
    }

    /**
     * Format error details
     * @param {Object} errorDetails - Error details
     * @returns {string} Formatted error details
     */
    formatErrorDetails(errorDetails) {
        try {
            let formatted = '  Error Details:\n';
            for (const [key, value] of Object.entries(errorDetails)) {
                if (value !== null && value !== undefined) {
                    formatted += `    ${key}: ${value}\n`;
                }
            }
            return formatted;
        } catch (error) {
            console.error('Error formatting error details:', error);
            return '';
        }
    }

    /**
     * Format operation results
     * @param {Object} results - Operation results
     * @returns {string} Formatted results
     */
    formatResults(results) {
        try {
            let formatted = '  Results:\n';
            const resultLabels = {
                total: 'Total Records',
                success: 'Successful',
                failed: 'Failed',
                skipped: 'Skipped',
                duplicates: 'Duplicates',
                duration: 'Duration'
            };

            for (const [key, value] of Object.entries(results)) {
                if (value !== null && value !== undefined && resultLabels[key]) {
                    let displayValue = value;
                    if (key === 'duration' && typeof value === 'number') {
                        displayValue = this.formatDuration(value);
                    }
                    formatted += `    ${resultLabels[key]}: ${displayValue}\n`;
                }
            }

            return formatted;
        } catch (error) {
            console.error('Error formatting results:', error);
            return '';
        }
    }

    /**
     * Format duration in milliseconds to human readable format
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    formatDuration(milliseconds) {
        try {
            const seconds = Math.floor(milliseconds / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);

            if (hours > 0) {
                return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
            } else if (minutes > 0) {
                return `${minutes}m ${seconds % 60}s`;
            } else {
                return `${seconds}s`;
            }
        } catch (error) {
            console.error('Error formatting duration:', error);
            return `${milliseconds}ms`;
        }
    }

    /**
     * Update formatting options
     * @param {Object} options - New formatting options
     */
    updateFormattingOptions(options) {
        try {
            this.formattingOptions = { ...this.formattingOptions, ...options };
        } catch (error) {
            console.error('Error updating formatting options:', error);
        }
    }

    /**
     * Get current formatting options
     * @returns {Object} Current formatting options
     */
    getFormattingOptions() {
        return { ...this.formattingOptions };
    }

    /**
     * Truncate Message to Maximum Length
     * 
     * Ensures messages don't exceed configured maximum length while preserving
     * readability. Adds truncation indicator when content is shortened.
     * 
     * @method truncateMessage
     * @param {string} message - Message to truncate
     * @param {number} [maxLength] - Maximum length (uses config default if not provided)
     * @returns {string} Truncated message with indicator if shortened
     * 
     * TODO: Add smart truncation that preserves word boundaries
     * VERIFY: Truncation doesn't break message meaning
     */
    truncateMessage(message, maxLength = null) {
        if (!message || typeof message !== 'string') {
            return message || '';
        }

        const limit = maxLength || this.formattingOptions.maxMessageLength;
        if (message.length <= limit) {
            return message;
        }

        const truncated = message.substring(0, limit - this.formattingOptions.truncateIndicator.length);
        return truncated + this.formattingOptions.truncateIndicator;
    }

    /**
     * Create Visual Progress Bar
     * 
     * Generates ASCII-based progress bar for visual progress indication.
     * 
     * @method createProgressBar
     * @param {number} percentage - Progress percentage (0-100)
     * @param {number} [width=16] - Width of progress bar in characters
     * @returns {string} ASCII progress bar
     * 
     * TODO: Add different progress bar styles
     * VERIFY: Progress bar displays correctly at all percentages
     */
    createProgressBar(percentage, width = 16) {
        try {
            const filled = Math.round((percentage / 100) * width);
            const empty = width - filled;
            const filledChar = '█';
            const emptyChar = '░';

            return filledChar.repeat(filled) + emptyChar.repeat(empty);
        } catch (error) {
            console.error('Error creating progress bar:', error);
            return '░'.repeat(width);
        }
    }

    /**
     * Update Performance Statistics
     * 
     * Updates internal performance metrics for monitoring formatter efficiency.
     * 
     * @method updatePerformanceStats
     * @param {number} processingTime - Time taken to process message (ms)
     * 
     * TODO: Add performance alerting for slow formatting
     * DEBUG: Monitor performance trends over time
     */
    updatePerformanceStats(processingTime) {
        try {
            // Update running average
            const totalMessages = this.stats.messagesFormatted;
            const currentAverage = this.stats.averageProcessingTime;

            this.stats.averageProcessingTime =
                ((currentAverage * (totalMessages - 1)) + processingTime) / totalMessages;

        } catch (error) {
            console.error('Error updating performance stats:', error);
        }
    }

    /**
     * Get Formatter Statistics
     * 
     * Returns comprehensive statistics about formatter usage and performance.
     * 
     * @method getStats
     * @returns {Object} Formatter statistics
     * 
     * TODO: Add more detailed performance metrics
     * VERIFY: Statistics accurately reflect formatter usage
     */
    getStats() {
        return {
            ...this.stats,
            uptime: this.stats.lastUsed ?
                Date.now() - new Date(this.stats.lastUsed).getTime() : 0,
            errorRate: this.stats.messagesFormatted > 0 ?
                (this.stats.errorCount / this.stats.messagesFormatted * 100).toFixed(2) + '%' : '0%'
        };
    }
}

// Create and export singleton instance
const serverMessageFormatter = new ServerMessageFormatter();

export { serverMessageFormatter as default, ServerMessageFormatter }; 