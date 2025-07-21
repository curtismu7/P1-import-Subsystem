// File: server/winston-config.js
// Description: Production-ready Winston logging configuration with rotation,
// compression, and comprehensive logging setup
// 
// This module provides centralized Winston configuration including:
// - Multi-transport support (console, file, daily rotation)
// - Error handling and recovery mechanisms
// - Performance optimization with size limits
// - Structured logging with metadata
// - Environment-specific configurations
// 
// Supports development, production, and test environments with appropriate
// logging levels and file management.

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

// Helper: Visual separator
export function logSeparator(char = '*', length = 60) {
    return char.repeat(length);
}

// Helper: Event tag
export function logTag(label) {
    return `>>> ${label.toUpperCase()}`;
}

// Helper: Colorize message for console
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

// Helper: Consistent log line formatting
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
 * Create production-ready Winston logger configuration
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.service - Service name for logging
 * @param {string} options.env - Environment (development, production, test)
 * @param {boolean} options.enableFileLogging - Whether to enable file logging
 * @returns {winston.Logger} Configured Winston logger
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
            version: process.env.APP_VERSION || '1.0.0'
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