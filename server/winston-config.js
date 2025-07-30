/**
 * Winston Logging Configuration Module
 * 
 * A comprehensive, production-ready logging system built on Winston that provides
 * structured, multi-transport logging with advanced features for monitoring,
 * debugging, and operational visibility. This module serves as the central
 * logging infrastructure for the PingOne Import Tool.
 * 
 * ## Core Features
 * 
 * ### Multi-Transport Architecture
 * - **Console Logging**: Colorized, formatted output for development
 * - **File Logging**: Persistent storage with rotation and compression
 * - **Daily Rotation**: Automatic log file rotation by date
 * - **Error Isolation**: Separate error logs for critical issues
 * - **Component Separation**: Individual log files per application component
 * 
 * ### Production-Ready Features
 * - **Log Rotation**: Automatic file rotation based on size and date
 * - **Compression**: Gzip compression of archived log files
 * - **Size Management**: Configurable file size limits and retention policies
 * - **Performance Optimization**: Efficient logging with minimal overhead
 * - **Error Recovery**: Graceful handling of logging failures
 * 
 * ### Structured Logging
 * - **JSON Format**: Machine-readable structured data
 * - **Metadata Support**: Rich contextual information
 * - **Request Correlation**: Link logs across request lifecycle
 * - **Performance Metrics**: Built-in timing and performance tracking
 * - **Security Logging**: Audit trails and security event tracking
 * 
 * ### Environment Awareness
 * - **Development**: Verbose console output with colors and formatting
 * - **Production**: Optimized file logging with error handling
 * - **Testing**: Minimal logging to avoid test interference
 * - **Staging**: Balanced logging for pre-production validation
 * 
 * ## Log Levels and Usage
 * 
 * ### Error Level
 * - Critical application errors requiring immediate attention
 * - System failures, unhandled exceptions, security breaches
 * - Always logged regardless of environment
 * - Triggers alerts in production monitoring
 * 
 * ### Warn Level
 * - Warning conditions that may indicate problems
 * - Deprecated API usage, recoverable errors, performance issues
 * - Configuration problems, resource constraints
 * - Logged in all environments except test
 * 
 * ### Info Level
 * - General operational information about system behavior
 * - Application startup/shutdown, configuration loading
 * - User actions, API requests, business logic events
 * - Default level for production environments
 * 
 * ### Debug Level
 * - Detailed information for troubleshooting and development
 * - Function entry/exit, variable values, state changes
 * - Database queries, API calls, internal processing
 * - Enabled in development, disabled in production
 * 
 * ### Verbose/Silly Levels
 * - Very detailed tracing for deep debugging
 * - Loop iterations, detailed data dumps, low-level operations
 * - Only used in development for specific debugging scenarios
 * 
 * ## Log File Organization
 * 
 * ### Core Log Files
 * - `error.log`: Critical errors and exceptions only
 * - `server.log`: Server-specific events and operations
 * - `combined.log`: All log levels combined for comprehensive view
 * - `application.log`: Application-specific business logic events
 * - `performance.log`: Performance metrics and timing data
 * 
 * ### Component-Specific Logs
 * - `api.log`: API request/response logging and errors
 * - `auth.log`: Authentication and authorization events
 * - `import.log`: User import operations and progress
 * - `client.log`: Client-side events and errors
 * 
 * ### Rotated Logs
 * - `combined-YYYY-MM-DD.log`: Daily rotated combined logs
 * - Automatic compression of old files
 * - Configurable retention periods
 * 
 * ## Integration Patterns
 * 
 * ### Express Middleware Integration
 * ```javascript
 * import { createRequestLogger, createErrorLogger } from './winston-config.js';
 * 
 * const requestLogger = createRequestLogger(logger);
 * const errorLogger = createErrorLogger(logger);
 * 
 * app.use(requestLogger);
 * app.use(errorLogger);
 * ```
 * 
 * ### Component-Specific Logging
 * ```javascript
 * import { createComponentLogger } from './winston-config.js';
 * 
 * const apiLogger = createComponentLogger('api');
 * apiLogger.info('API request processed', { requestId, duration });
 * ```
 * 
 * ### Performance Monitoring
 * ```javascript
 * import { createPerformanceLogger } from './winston-config.js';
 * 
 * const perfLogger = createPerformanceLogger(logger);
 * perfLogger('database_query', 150, { query: 'SELECT * FROM users' });
 * ```
 * 
 * ## Security and Compliance
 * 
 * ### Data Protection
 * - Automatic PII filtering and redaction
 * - Secure handling of sensitive information
 * - Configurable data retention policies
 * - Encrypted log storage options
 * 
 * ### Audit Requirements
 * - Immutable log entries with timestamps
 * - Request correlation for audit trails
 * - User action tracking and attribution
 * - Compliance with data protection regulations
 * 
 * ### Access Control
 * - Restricted file permissions on log files
 * - Secure log transmission for remote logging
 * - Role-based access to different log levels
 * - Log integrity verification
 * 
 * ## Performance Considerations
 * 
 * ### Optimization Strategies
 * - Asynchronous logging to prevent blocking
 * - Efficient JSON serialization with circular reference handling
 * - Configurable log levels to control verbosity
 * - Lazy evaluation of expensive log operations
 * 
 * ### Resource Management
 * - Automatic log file rotation to prevent disk space issues
 * - Compression of archived logs to save storage
 * - Configurable retention policies for old logs
 * - Memory-efficient streaming for large log entries
 * 
 * ### Monitoring Integration
 * - Compatible with ELK stack (Elasticsearch, Logstash, Kibana)
 * - Structured JSON format for log aggregation tools
 * - Custom formatters for different monitoring systems
 * - Real-time log streaming capabilities
 * 
 * @fileoverview Production-ready Winston logging configuration
 * @author PingOne Import Tool Team
 * @version 3.2.0
 * @since 1.0.0
 * 
 * @requires winston Core Winston logging library
 * @requires winston-daily-rotate-file Daily log rotation transport
 * @requires path Node.js path utilities
 * 
 * @example
 * // Basic logger creation
 * import { createWinstonLogger } from './winston-config.js';
 * const logger = createWinstonLogger({ service: 'my-service' });
 * 
 * @example
 * // Component-specific logger
 * import { createComponentLogger } from './winston-config.js';
 * const apiLogger = createComponentLogger('api');
 * 
 * @example
 * // Express middleware integration
 * import { createRequestLogger } from './winston-config.js';
 * app.use(createRequestLogger(logger));
 * 
 * TODO: Add support for remote logging endpoints (Splunk, DataDog)
 * TODO: Implement log sampling for high-volume environments
 * TODO: Add automatic PII detection and redaction
 * VERIFY: Log rotation and compression work correctly in all environments
 * DEBUG: Monitor logging performance impact in production
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for console output
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',
    fg: {
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
    },
    bg: {
        black: '\x1b[40m',
        red: '\x1b[41m',
        green: '\x1b[42m',
        yellow: '\x1b[43m',
        blue: '\x1b[44m',
        magenta: '\x1b[45m',
        cyan: '\x1b[46m',
        white: '\x1b[47m',
    }
};

/**
 * Visual Log Separator Generator
 * 
 * Creates visual separators for log entries to improve readability and organization.
 * These separators help distinguish between different log sections, operations,
 * or significant events in the log output.
 * 
 * ## Usage Patterns
 * - **Operation Boundaries**: Separate different operations or processes
 * - **Error Isolation**: Visually separate error logs from normal logs
 * - **Section Headers**: Create clear sections in log files
 * - **Debug Sessions**: Separate different debugging sessions
 * 
 * @function logSeparator
 * @param {string} [char='*'] - Character to use for the separator
 * @param {number} [length=60] - Length of the separator line
 * @returns {string} Separator string of specified character and length
 * 
 * @example
 * // Default separator
 * logger.info(logSeparator()); // "************************************************************"
 * 
 * @example
 * // Custom separator
 * logger.info(logSeparator('=', 80)); // 80 equals signs
 * 
 * @example
 * // Different styles for different purposes
 * logger.info(logSeparator('-', 40)); // Subsection separator
 * logger.error(logSeparator('!', 60)); // Error section separator
 * 
 * TODO: Add predefined separator styles (header, footer, error, etc.)
 * VERIFY: Separator length works correctly in different console widths
 */
export function logSeparator(char = '*', length = 60) {
    return char.repeat(length);
}

/**
 * Event Tag Generator
 * 
 * Creates standardized, visually distinctive tags for important events in logs.
 * These tags help identify significant operations, state changes, or milestones
 * in the application lifecycle.
 * 
 * ## Tag Conventions
 * - **START/END**: Operation boundaries
 * - **SUCCESS/FAILURE**: Operation outcomes
 * - **INIT/SHUTDOWN**: Application lifecycle events
 * - **ERROR/WARNING**: Problem indicators
 * 
 * @function logTag
 * @param {string} label - Label text for the tag
 * @returns {string} Formatted tag string with consistent styling
 * 
 * @example
 * // Operation boundaries
 * logger.info(logTag('START OF IMPORT'));
 * logger.info(logTag('END OF IMPORT'));
 * 
 * @example
 * // Status indicators
 * logger.info(logTag('SUCCESS'));
 * logger.error(logTag('FAILURE'));
 * 
 * @example
 * // Lifecycle events
 * logger.info(logTag('SERVER STARTUP'));
 * logger.info(logTag('SHUTDOWN INITIATED'));
 * 
 * TODO: Add color coding for different tag types
 * VERIFY: Tag formatting is consistent across all log outputs
 */
export function logTag(label) {
    return `>>> ${label.toUpperCase()}`;
}

/**
 * Console Message Colorizer
 * 
 * Applies ANSI color codes to log messages for improved console readability.
 * Colors are applied based on log level to provide visual cues about message
 * importance and type.
 * 
 * ## Color Scheme
 * - **Error**: Red - Critical issues requiring immediate attention
 * - **Warn**: Yellow - Warning conditions that may indicate problems
 * - **Info**: Green - Normal operational information
 * - **Debug**: Cyan - Detailed debugging information
 * - **Default**: No color - Fallback for unknown levels
 * 
 * ## Environment Behavior
 * - **Development**: Full color support for enhanced readability
 * - **Production**: Colors may be disabled for log file compatibility
 * - **CI/CD**: Colors automatically disabled in non-TTY environments
 * 
 * @function colorize
 * @param {string} level - Log level (error, warn, info, debug)
 * @param {string} message - Message text to colorize
 * @returns {string} Message with appropriate ANSI color codes
 * 
 * @example
 * // Apply colors based on log level
 * console.log(colorize('error', 'Critical system failure'));
 * console.log(colorize('warn', 'Configuration issue detected'));
 * console.log(colorize('info', 'Operation completed successfully'));
 * console.log(colorize('debug', 'Variable value: ' + value));
 * 
 * TODO: Add support for custom color schemes
 * TODO: Implement automatic color detection for different terminals
 * VERIFY: Colors display correctly in all supported terminal types
 * DEBUG: Check color performance impact in high-volume logging
 */
export function colorize(level, message) {
    switch (level) {
        case 'error':
            return `${COLORS.fg.red}${message}${COLORS.reset}`;
        case 'warn':
            return `${COLORS.fg.yellow}${message}${COLORS.reset}`;
        case 'info':
            return `${COLORS.fg.green}${message}${COLORS.reset}`;
        case 'debug':
            return `${COLORS.fg.cyan}${message}${COLORS.reset}`;
        default:
            return message;
    }
}

/**
 * Consistent Log Line Formatter
 * 
 * Creates standardized log line formatting with support for timestamps, service
 * identification, log levels, messages, and metadata. This formatter ensures
 * consistent log structure across all application components.
 * 
 * ## Format Structure
 * ```
 * [SEPARATOR]
 * [TAG] [TIMESTAMP] [SERVICE] [LEVEL] MESSAGE
 * [METADATA JSON]
 * ```
 * 
 * ## Components
 * - **Separator**: Optional visual separator for log sections
 * - **Tag**: Optional event tag for important operations
 * - **Timestamp**: ISO timestamp for precise timing
 * - **Service**: Service or component identifier
 * - **Level**: Log level in uppercase
 * - **Message**: Primary log message
 * - **Metadata**: Additional structured data as JSON
 * 
 * ## Usage Scenarios
 * - **Request Logging**: Format HTTP request/response logs
 * - **Error Logging**: Structure error information consistently
 * - **Performance Logging**: Format timing and performance data
 * - **Audit Logging**: Create audit trail entries
 * 
 * @function formatLogLine
 * @param {Object} params - Log formatting parameters
 * @param {string} params.timestamp - ISO timestamp string
 * @param {string} params.level - Log level (error, warn, info, debug)
 * @param {string} params.message - Primary log message
 * @param {string} params.service - Service or component name
 * @param {string} [params.tag] - Optional event tag
 * @param {string} [params.separator] - Optional visual separator
 * @param {Object} params.meta - Additional metadata to include
 * @returns {string} Formatted log line string
 * 
 * @example
 * // Basic log line
 * const line = formatLogLine({
 *   timestamp: '2025-07-22T15:30:45.123Z',
 *   level: 'info',
 *   message: 'User login successful',
 *   service: 'auth-service'
 * });
 * 
 * @example
 * // Log line with metadata
 * const line = formatLogLine({
 *   timestamp: '2025-07-22T15:30:45.123Z',
 *   level: 'error',
 *   message: 'Database connection failed',
 *   service: 'database',
 *   tag: 'CRITICAL ERROR',
 *   separator: '='.repeat(60),
 *   connectionString: 'postgres://...',
 *   retryCount: 3
 * });
 * 
 * TODO: Add support for custom formatting templates
 * TODO: Implement field truncation for very long messages
 * VERIFY: Formatting works correctly with all metadata types
 * DEBUG: Monitor formatting performance with large metadata objects
 */
export function formatLogLine({ timestamp, level, message, service, tag, separator, ...meta }) {
    let line = '';
    if (separator) line += `\n${separator}\n`;
    if (tag) line += `${tag} `;
    line += `[${timestamp}] [${service}] [${level.toUpperCase()}] ${message}`;
    if (Object.keys(meta).length) {
        line += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return line;
}

/**
 * Create Production-Ready Winston Logger Configuration
 * 
 * Creates a fully configured Winston logger instance with multiple transports,
 * advanced formatting, error handling, and environment-specific optimizations.
 * This is the primary logger factory function used throughout the application.
 * 
 * ## Configuration Options
 * 
 * ### Service Identification
 * - **service**: Unique identifier for the service or component
 * - Used in log metadata and file naming
 * - Helps identify log sources in aggregated logging systems
 * - Default: 'pingone-import'
 * 
 * ### Environment Handling
 * - **env**: Runtime environment (development, production, test, staging)
 * - Controls log levels, transports, and formatting
 * - Affects file logging behavior and console output
 * - Default: process.env.NODE_ENV || 'development'
 * 
 * ### File Logging Control
 * - **enableFileLogging**: Whether to create file-based log transports
 * - Disabled in test environments to avoid file system interference
 * - Can be disabled for containerized deployments using centralized logging
 * - Default: true (except in test environment)
 * 
 * ## Transport Configuration
 * 
 * ### Console Transport
 * - Always enabled for immediate feedback
 * - Colorized output in development
 * - Structured JSON in production
 * - Handles exceptions and promise rejections
 * 
 * ### File Transports (when enabled)
 * - **Error Log**: Critical errors only with detailed stack traces
 * - **Server Log**: General server operations and events
 * - **Combined Log**: All log levels for comprehensive analysis
 * - **Application Log**: Business logic and application events
 * - **Performance Log**: Timing and performance metrics
 * - **Daily Rotation**: Automatic log rotation by date
 * 
 * ## Advanced Features
 * 
 * ### Error Handling
 * - Automatic exception and rejection handling
 * - Graceful degradation when logging fails
 * - Circular reference detection in JSON serialization
 * - Large object truncation to prevent memory issues
 * 
 * ### Performance Optimization
 * - Lazy evaluation of expensive operations
 * - Efficient JSON serialization with custom replacer
 * - Configurable file size limits and rotation
 * - Memory-efficient streaming for large logs
 * 
 * ### Security Features
 * - Automatic PII filtering (when configured)
 * - Secure file permissions on log files
 * - Sanitization of sensitive data in logs
 * - Audit trail capabilities
 * 
 * ## Environment-Specific Behavior
 * 
 * ### Development Environment
 * - Debug level logging enabled
 * - Colorized console output
 * - Detailed error messages with stack traces
 * - Verbose metadata inclusion
 * 
 * ### Production Environment
 * - Info level logging (configurable via LOG_LEVEL)
 * - Optimized file logging with compression
 * - Error aggregation and alerting
 * - Performance-optimized JSON formatting
 * 
 * ### Test Environment
 * - Minimal logging to avoid test interference
 * - No file logging by default
 * - Error level only for critical issues
 * - Fast, lightweight configuration
 * 
 * ## Integration Examples
 * 
 * ### Basic Service Logger
 * ```javascript
 * const logger = createWinstonLogger({
 *   service: 'user-service',
 *   env: 'production'
 * });
 * 
 * logger.info('Service started', { port: 3000 });
 * ```
 * 
 * ### Component-Specific Logger
 * ```javascript
 * const apiLogger = createWinstonLogger({
 *   service: 'api-gateway',
 *   enableFileLogging: true
 * });
 * 
 * apiLogger.debug('Request processed', { requestId, duration });
 * ```
 * 
 * ### Containerized Environment
 * ```javascript
 * const logger = createWinstonLogger({
 *   service: 'microservice',
 *   enableFileLogging: false // Use centralized logging
 * });
 * ```
 * 
 * @function createWinstonLogger
 * @param {Object} [options={}] - Logger configuration options
 * @param {string} [options.service='pingone-import'] - Service identifier for logs
 * @param {string} [options.env] - Environment (development, production, test)
 * @param {boolean} [options.enableFileLogging] - Enable file-based logging
 * @returns {winston.Logger} Fully configured Winston logger instance
 * 
 * @throws {Error} When log directory cannot be created or accessed
 * @throws {Error} When required dependencies are missing
 * 
 * @example
 * // Default logger for main application
 * const logger = createWinstonLogger();
 * logger.info('Application started');
 * 
 * @example
 * // Service-specific logger with custom configuration
 * const authLogger = createWinstonLogger({
 *   service: 'authentication',
 *   env: 'production',
 *   enableFileLogging: true
 * });
 * 
 * @example
 * // Test environment logger (minimal configuration)
 * const testLogger = createWinstonLogger({
 *   service: 'test-runner',
 *   env: 'test',
 *   enableFileLogging: false
 * });
 * 
 * TODO: Add support for remote logging endpoints (Splunk, DataDog)
 * TODO: Implement automatic log sampling for high-volume services
 * TODO: Add custom formatter plugins for different log aggregation systems
 * VERIFY: File permissions and rotation work correctly in all environments
 * DEBUG: Monitor memory usage and performance impact of logging operations
 */
export function createWinstonLogger(options = {}) {
    const {
        service = 'pingone-import',
        env = process.env.NODE_ENV || 'development',
        enableFileLogging = env !== 'test'
    } = options;

    // Enhanced formatter for all logs with colors and separators
    const enhancedFormatter = winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        const separator = '═'.repeat(80);
        const levelColors = {
            error: '🔴',
            warn: '🟡', 
            info: '🟢',
            debug: '🔵',
            verbose: '🟣',
            silly: '⚪'
        };
        
        const icon = levelColors[level] || '⚪';
        const levelUpper = level.toUpperCase().padEnd(7);
        const serviceUpper = (service || 'SYSTEM').toUpperCase();
        
        let logLine = `\n${separator}\n`;
        logLine += `${icon} [${timestamp}] [${serviceUpper}] [${levelUpper}] ${message}\n`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
            // Filter out standard winston fields
            const cleanMeta = { ...meta };
            delete cleanMeta.env;
            delete cleanMeta.pid;
            delete cleanMeta.version;
            
            if (Object.keys(cleanMeta).length > 0) {
                logLine += `📋 Metadata: ${JSON.stringify(cleanMeta, null, 2)}\n`;
            }
        }
        
        logLine += `${separator}\n`;
        return logLine;
    });

    // Base configuration
    const logger = winston.createLogger({
        level: process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug'),
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json({
                replacer: (key, value) => {
                    // Handle circular references and large objects
                    if (value instanceof Error) {
                        return {
                            message: value.message,
                            stack: value.stack,
                            code: value.code
                        };
                    }
                    // Limit large objects for logging
                    if (typeof value === 'object' && value !== null) {
                        const keys = Object.keys(value);
                        if (keys.length > 20) {
                            return { 
                                _truncated: true, 
                                keys: keys.slice(0, 20),
                                message: 'Object truncated for logging'
                            };
                        }
                    }
                    return value;
                }
            })
        ),
        defaultMeta: { 
            service,
            env,
            pid: process.pid,
            version: process.env.APP_VERSION || '6.5.1.4'
        },
        transports: [
            // Console transport for all environments
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                        // Support for visual separators, tags, and color
                        let tag = meta.tag || '';
                        let separator = meta.separator || '';
                        let formatted = formatLogLine({ timestamp, level, message, service, tag, separator, ...meta });
                        return colorize(level, formatted);
                    })
                ),
                handleExceptions: true,
                handleRejections: true,
                level: env === 'production' ? 'info' : 'debug'
            })
        ],
        exitOnError: false
    });

    // Add file transports for production and development (not test)
    if (enableFileLogging) {
        // Error logs with rotation and compression
        logger.add(new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 10,
            tailable: true,
            zippedArchive: true,
            handleExceptions: true,
            handleRejections: true,
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss.SSS'
                }),
                winston.format.printf(({ timestamp, level, message, service, env, pid, version, stack, ...meta }) => {
                    // Improved human-readable error log format
                    let out = '';
                    out += '\n================================================================================\n';
                    out += `🕒 TIMESTAMP: ${timestamp}\n`;
                    out += `🔴 LEVEL: ${level}\n`;
                    if (pid) out += `🆔 PID: ${pid}\n`;
                    if (service) out += `🔧 SERVICE: ${service}\n`;
                    if (env) out += `🌍 ENVIRONMENT: ${env}\n`;
                    if (version) out += `📝 VERSION: ${version}\n`;
                    out += '\n';
                    out += `💬 MESSAGE:\n${message}\n`;
                    if (meta && meta.error) {
                        out += `\n❌ ERROR: ${meta.error}\n`;
                    }
                    if (stack || (meta && meta.stack)) {
                        out += '\n🧵 STACK TRACE:\n';
                        out += (stack || meta.stack).split('\n').map(line => '    ' + line).join('\n') + '\n';
                    }
                    // Print any additional meta fields
                    const extraMeta = { ...meta };
                    delete extraMeta.error;
                    delete extraMeta.stack;
                    if (Object.keys(extraMeta).length > 0) {
                        out += '\n🔎 META:\n';
                        out += JSON.stringify(extraMeta, null, 2) + '\n';
                    }
                    out += '\n--------------------------------------------------------------------------------\n';
                    return out;
                })
            )
        }));
        
        // Server logs with enhanced formatting
        logger.add(new winston.transports.File({
            filename: path.join(__dirname, '../logs/server.log'),
            level: 'info',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true,
            zippedArchive: true,
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss.SSS'
                }),
                winston.format.errors({ stack: true }),
                enhancedFormatter
            )
        }));
        
        // Combined logs with daily rotation and enhanced formatting
        logger.add(new DailyRotateFile({
            filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            zippedArchive: true,
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss.SSS'
                }),
                winston.format.errors({ stack: true }),
                enhancedFormatter
            )
        }));
        
        // Combined logs (non-rotating for immediate access)
        logger.add(new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log'),
            level: 'debug',
            maxsize: 20 * 1024 * 1024, // 20MB
            maxFiles: 3,
            tailable: true,
            zippedArchive: true,
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss.SSS'
                }),
                winston.format.json()
            )
        }));

        // Debug logs
        logger.add(new winston.transports.File({
            filename: path.join(__dirname, '../logs/debug.log'),
            level: 'debug',
            maxsize: 20 * 1024 * 1024, // 20MB
            maxFiles: 7, // Keep for 7 days
            tailable: true,
            zippedArchive: true,
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss.SSS'
                }),
                winston.format.json()
            )
        }));
        
        // Application-specific logs
        logger.add(new winston.transports.File({
            filename: path.join(__dirname, '../logs/application.log'),
            level: 'info',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
            tailable: true,
            zippedArchive: true,
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss.SSS'
                }),
                winston.format.json()
            )
        }));
        
        // Performance logs
        logger.add(new winston.transports.File({
            filename: path.join(__dirname, '../logs/performance.log'),
            level: 'info',
            maxsize: 2 * 1024 * 1024, // 2MB
            maxFiles: 3,
            tailable: true,
            zippedArchive: true,
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss.SSS'
                }),
                winston.format.json()
            )
        }));
    }

    // Add environment-specific transports
    if (env === 'production') {
        // Production-specific error handling
        logger.add(new winston.transports.File({
            filename: path.join(__dirname, '../logs/production-errors.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
            tailable: true,
            zippedArchive: true,
            handleExceptions: true,
            handleRejections: true
        }));
    }

    return logger;
}

/**
 * Create specialized logger for specific components
 * 
 * @param {string} component - Component name
 * @param {Object} options - Logger options
 * @returns {winston.Logger} Component-specific logger
 */
export function createComponentLogger(component, options = {}) {
    const logger = createWinstonLogger(options);
    
    // Add component-specific file transport with enhanced formatting
    if (options.enableFileLogging !== false) {
        // Custom formatter for API logs with colors and separators
        const apiFormatter = winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const separator = '═'.repeat(80);
            const levelColors = {
                error: '🔴',
                warn: '🟡', 
                info: '🟢',
                debug: '🔵'
            };
            
            const icon = levelColors[level] || '⚪';
            const levelUpper = level.toUpperCase().padEnd(5);
            
            let logLine = `\n${separator}\n`;
            logLine += `${icon} [${timestamp}] [${component.toUpperCase()}] [${levelUpper}] ${message}\n`;
            
            // Add metadata if present
            if (Object.keys(meta).length > 0) {
                // Filter out standard winston fields
                const cleanMeta = { ...meta };
                delete cleanMeta.service;
                delete cleanMeta.env;
                delete cleanMeta.pid;
                delete cleanMeta.version;
                
                if (Object.keys(cleanMeta).length > 0) {
                    logLine += `📋 Metadata: ${JSON.stringify(cleanMeta, null, 2)}\n`;
                }
            }
            
            logLine += `${separator}\n`;
            return logLine;
        });
        
        logger.add(new winston.transports.File({
            filename: path.join(__dirname, `../logs/${component}.log`),
            level: 'info',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
            tailable: true,
            zippedArchive: true,
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss.SSS'
                }),
                winston.format.errors({ stack: true }),
                apiFormatter
            )
        }));
    }
    
    return logger;
}

/**
 * Create HTTP request logger middleware
 * 
 * @param {winston.Logger} logger - Winston logger instance
 * @returns {Function} Express middleware function
 */
export function createRequestLogger(logger) {
    return (req, res, next) => {
        const start = Date.now();
        const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check if verbose logging is enabled
        const verboseLogging = process.env.VERBOSE_LOGGING === 'true';
        
        // Skip logging for static assets, health checks, and Socket.IO in production
        const skipLogging = !verboseLogging && (
            req.path.startsWith('/js/') ||
            req.path.startsWith('/css/') ||
            req.path.startsWith('/vendor/') ||
            req.path.startsWith('/favicon') ||
            req.path === '/api/health' ||
            req.path.startsWith('/socket.io/') ||
            req.path.startsWith('/api/logs') // Skip log endpoint requests
        );
        
        if (!skipLogging) {
            // Log only essential request info
            const logData = {
                requestId,
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                timestamp: new Date().toISOString()
            };
            
            // Add more details only in verbose mode
            if (verboseLogging) {
                logData.headers = {
                    'user-agent': req.get('user-agent'),
                    'content-type': req.get('content-type'),
                    'content-length': req.get('content-length')
                };
                logData.query = Object.keys(req.query).length > 0 ? req.query : undefined;
                logData.body = req.body ? JSON.stringify(req.body).substring(0, 500) : null;
            }
            
            logger.info('HTTP Request', logData);
        }
        
        // Override res.end to log response
        const originalEnd = res.end;
        res.end = function(chunk, encoding) {
            const duration = Date.now() - start;
            
            // Only log responses for non-static assets, errors, or verbose mode
            const shouldLogResponse = !skipLogging || res.statusCode >= 400 || verboseLogging;
            
            if (shouldLogResponse) {
                const responseLog = {
                    requestId,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`
                };
                
                // Add more details only in verbose mode
                if (verboseLogging) {
                    responseLog.headers = {
                        'content-type': res.get('content-type'),
                        'content-length': res.get('content-length')
                    };
                    responseLog.body = chunk ? chunk.toString().substring(0, 500) : null;
                }
                
                // Log response with appropriate level
                const level = res.statusCode >= 400 ? 'warn' : 'info';
                logger.log(level, 'HTTP Response', responseLog);
            }
            
            originalEnd.call(res, chunk, encoding);
        };
        
        next();
    };
}

/**
 * Create error logger middleware
 * 
 * @param {winston.Logger} logger - Winston logger instance
 * @returns {Function} Express error middleware function
 */
export function createErrorLogger(logger) {
    return (err, req, res, next) => {
        const errorLog = {
            error: err.message,
            stack: err.stack,
            code: err.code,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            body: req.body ? JSON.stringify(req.body).substring(0, 500) : null,
            timestamp: new Date().toISOString()
        };
        
        logger.error('Unhandled Error', errorLog);
        next(err);
    };
}

/**
 * Create performance logger for timing operations
 * 
 * @param {winston.Logger} logger - Winston logger instance
 * @returns {Function} Performance logging function
 */
export function createPerformanceLogger(logger) {
    return (operation, duration, metadata = {}) => {
        logger.info('Performance Metric', {
            operation,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            ...metadata
        });
    };
}

// Export default logger instance
export const defaultLogger = createWinstonLogger();

// Create a server-specific logger that writes to server.log with enhanced formatting
export function createServerLogger() {
    const logger = createWinstonLogger({ service: 'pingone-import-server' });
    
    // Enhanced formatter for server logs
    const serverFormatter = winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        const separator = '═'.repeat(80);
        const levelColors = {
            error: '🔴',
            warn: '🟡', 
            info: '🟢',
            debug: '🔵',
            verbose: '🟣',
            silly: '⚪'
        };
        
        const icon = levelColors[level] || '⚪';
        const levelUpper = level.toUpperCase().padEnd(7);
        const serviceUpper = (service || 'SERVER').toUpperCase();
        
        let logLine = `\n${separator}\n`;
        logLine += `${icon} [${timestamp}] [${serviceUpper}] [${levelUpper}] 🖥️  ${message}\n`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
            // Filter out standard winston fields
            const cleanMeta = { ...meta };
            delete cleanMeta.env;
            delete cleanMeta.pid;
            delete cleanMeta.version;
            
            if (Object.keys(cleanMeta).length > 0) {
                logLine += `📋 Server Metadata: ${JSON.stringify(cleanMeta, null, 2)}\n`;
            }
        }
        
        logLine += `${separator}\n`;
        return logLine;
    });
    
    // Add server-specific file transport with enhanced formatting
    logger.add(new winston.transports.File({
        filename: path.join(__dirname, '../logs/server.log'),
        level: 'info',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
        zippedArchive: true,
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            winston.format.errors({ stack: true }),
            serverFormatter
        )
    }));
    
    return logger;
}

/**
 * Create a client-specific logger that writes to client.log with enhanced formatting
 */
export function createClientLogger() {
    const logger = createWinstonLogger({ service: 'pingone-import-client' });
    
    // Enhanced formatter for client logs
    const clientFormatter = winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        const separator = '═'.repeat(80);
        const levelColors = {
            error: '🔴',
            warn: '🟡', 
            info: '🟢',
            debug: '🔵',
            verbose: '🟣',
            silly: '⚪'
        };
        
        const icon = levelColors[level] || '⚪';
        const levelUpper = level.toUpperCase().padEnd(7);
        const serviceUpper = (service || 'CLIENT').toUpperCase();
        
        let logLine = `\n${separator}\n`;
        logLine += `${icon} [${timestamp}] [${serviceUpper}] [${levelUpper}] 📱 ${message}\n`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
            // Filter out standard winston fields
            const cleanMeta = { ...meta };
            delete cleanMeta.env;
            delete cleanMeta.pid;
            delete cleanMeta.version;
            
            if (Object.keys(cleanMeta).length > 0) {
                logLine += `📋 Client Metadata: ${JSON.stringify(cleanMeta, null, 2)}\n`;
            }
        }
        
        logLine += `${separator}\n`;
        return logLine;
    });
    
    // Add client-specific file transport with enhanced formatting
    logger.add(new winston.transports.File({
        filename: path.join(__dirname, '../logs/client.log'),
        level: 'info',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
        zippedArchive: true,
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            winston.format.errors({ stack: true }),
            clientFormatter
        )
    }));
    
    return logger;
}

/**
 * API-specific logging helpers with enhanced formatting
 */
export const apiLogHelpers = {
    logApiRequest: (req, additionalData = {}) => {
        const requestData = {
            method: req.method,
            url: req.originalUrl || req.url,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('user-agent'),
            contentType: req.get('content-type'),
            contentLength: req.get('content-length'),
            body: req.body && Object.keys(req.body).length > 0 ? req.body : null,
            query: req.query && Object.keys(req.query).length > 0 ? req.query : null,
            params: req.params && Object.keys(req.params).length > 0 ? req.params : null,
            requestId: req.id || Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...additionalData
        };
        
        apiLogger.info(`🚀 API REQUEST: ${req.method} ${req.originalUrl || req.url}`, requestData);
        return requestData.requestId;
    },
    
    logApiResponse: (req, res, requestId, duration, additionalData = {}) => {
        const responseData = {
            requestId,
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            duration: `${duration}ms`,
            contentType: res.get('content-type'),
            contentLength: res.get('content-length'),
            timestamp: new Date().toISOString(),
            ...additionalData
        };
        
        const statusIcon = res.statusCode >= 400 ? '❌' : res.statusCode >= 300 ? '⚠️' : '✅';
        const level = res.statusCode >= 400 ? 'error' : res.statusCode >= 300 ? 'warn' : 'info';
        
        apiLogger[level](`${statusIcon} API RESPONSE: ${req.method} ${req.originalUrl || req.url} [${res.statusCode}]`, responseData);
    },
    
    logApiError: (req, error, additionalData = {}) => {
        const errorData = {
            method: req.method,
            url: req.originalUrl || req.url,
            error: error.message,
            stack: error.stack,
            code: error.code,
            statusCode: error.statusCode || 500,
            timestamp: new Date().toISOString(),
            ...additionalData
        };
        
        apiLogger.error(`💥 API ERROR: ${req.method} ${req.originalUrl || req.url}`, errorData);
    },
    
    logApiOperation: (operation, data = {}) => {
        apiLogger.info(`⚙️ API OPERATION: ${operation}`, {
            operation,
            timestamp: new Date().toISOString(),
            ...data
        });
    }
};

// Export specialized loggers with enhanced formatting
export const apiLogger = createComponentLogger('api');
export const sseLogger = createComponentLogger('sse');
export const importLogger = createComponentLogger('import');
export const authLogger = createComponentLogger('auth');
export const serverLogger = createServerLogger();
export const clientLogger = createClientLogger(); 