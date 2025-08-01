/**
 * Enhanced Message Formatter Module
 * 
 * Improves readability of server messages with:
 * - Visual separators and formatting
 * - Structured message blocks
 * - Event grouping and labeling
 * - Timestamp formatting
 * - Color coding and styling
 * 
 * Features:
 * - Message block separation with asterisks
 * - Event start/end markers
 * - Structured formatting with line breaks
 * - Timestamp and label formatting
 * - Consistent styling across all message types
 */

import { createWinstonLogger } from './winston-logger.js';

/**
 * Enhanced Message Formatter Class
 * 
 * Formats server messages for improved readability in logs and progress windows
 */
class MessageFormatter {
    constructor() {
        this.logger = createWinstonLogger({
            service: 'pingone-message-formatter',
            environment: process.env.NODE_ENV || 'development'
        });

        // Message formatting options
        this.formattingOptions = {
            showTimestamps: true,
            showEventMarkers: true,
            showSeparators: true,
            maxMessageLength: 200,
            separatorChar: '*',
            separatorLength: 50
        };

        // Event type configurations
        this.eventTypes = {
            import: {
                start: 'IMPORT STARTED',
                end: 'IMPORT COMPLETED',
                error: 'IMPORT ERROR',
                color: '#3498db'
            },
            export: {
                start: 'EXPORT STARTED',
                end: 'EXPORT COMPLETED',
                error: 'EXPORT ERROR',
                color: '#27ae60'
            },
            modify: {
                start: 'MODIFY STARTED',
                end: 'MODIFY COMPLETED',
                error: 'MODIFY ERROR',
                color: '#f39c12'
            },
            delete: {
                start: 'DELETE STARTED',
                end: 'DELETE COMPLETED',
                error: 'DELETE ERROR',
                color: '#e74c3c'
            },
            validation: {
                start: 'VALIDATION STARTED',
                end: 'VALIDATION COMPLETED',
                error: 'VALIDATION ERROR',
                color: '#9b59b6'
            },
            connection: {
                start: 'CONNECTION ESTABLISHED',
                end: 'CONNECTION CLOSED',
                error: 'CONNECTION ERROR',
                color: '#1abc9c'
            }
        };
    }

    /**
     * Format a message block with visual separators
     * @param {string} eventType - Type of event (import, export, etc.)
     * @param {string} eventStage - Stage of the event (start, end, error, progress)
     * @param {string} message - The main message
     * @param {Object} details - Additional details
     * @returns {string} Formatted message block
     */
    formatMessageBlock(eventType, eventStage, message, details = {}) {
        try {
            const eventConfig = this.eventTypes[eventType] || this.eventTypes.import;
            const timestamp = this.formatTimestamp(new Date());
            const separator = this.createSeparator();
            
            let formattedMessage = '';

            // Add separator at the beginning
            if (this.formattingOptions.showSeparators) {
                formattedMessage += separator + '\n';
            }

            // Add event marker
            if (this.formattingOptions.showEventMarkers) {
                const marker = this.getEventMarker(eventConfig, eventStage);
                formattedMessage += `${marker}\n`;
            }

            // Add timestamp
            if (this.formattingOptions.showTimestamps) {
                formattedMessage += `[${timestamp}] `;
            }

            // Add main message
            formattedMessage += message + '\n';

            // Add details if present
            if (details && Object.keys(details).length > 0) {
                formattedMessage += this.formatDetails(details);
            }

            // Add separator at the end
            if (this.formattingOptions.showSeparators) {
                formattedMessage += separator + '\n';
            }

            this.logger.debug('Message block formatted', { 
                eventType, 
                eventStage, 
                messageLength: message.length 
            });

            return formattedMessage;
        } catch (error) {
            this.logger.error('Error formatting message block', { error: error.message });
            return message; // Fallback to original message
        }
    }

    /**
     * Format a progress update message
     * @param {string} operation - Operation type
     * @param {number} current - Current progress
     * @param {number} total - Total items
     * @param {string} message - Progress message
     * @param {Object} stats - Progress statistics
     * @returns {string} Formatted progress message
     */
    formatProgressMessage(operation, current, total, message, stats = {}) {
        try {
            const timestamp = this.formatTimestamp(new Date());
            const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
            
            let formattedMessage = '';

            // Add timestamp
            if (this.formattingOptions.showTimestamps) {
                formattedMessage += `[${timestamp}] `;
            }

            // Add progress indicator
            formattedMessage += `PROGRESS: ${current}/${total} (${percentage}%)`;

            // Add message if provided
            if (message) {
                formattedMessage += ` - ${message}`;
            }

            // Add stats if available
            if (stats && Object.keys(stats).length > 0) {
                formattedMessage += '\n' + this.formatProgressStats(stats);
            }

            return formattedMessage;
        } catch (error) {
            this.logger.error('Error formatting progress message', { error: error.message });
            return message || `Progress: ${current}/${total}`;
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
            this.logger.error('Error formatting error message', { error: error.message });
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
            this.logger.error('Error formatting completion message', { error: error.message });
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
            this.logger.error('Error formatting SSE event', { error: error.message });
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
            this.logger.error('Error formatting details', { error: error.message });
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
            this.logger.error('Error formatting progress stats', { error: error.message });
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
            this.logger.error('Error formatting error details', { error: error.message });
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
            this.logger.error('Error formatting results', { error: error.message });
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
            this.logger.error('Error formatting duration', { error: error.message });
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
            this.logger.debug('Formatting options updated', { options });
        } catch (error) {
            this.logger.error('Error updating formatting options', { error: error.message });
        }
    }

    /**
     * Get current formatting options
     * @returns {Object} Current formatting options
     */
    getFormattingOptions() {
        return { ...this.formattingOptions };
    }
}

// Create and export singleton instance
const messageFormatter = new MessageFormatter();

export { messageFormatter as default, MessageFormatter }; 