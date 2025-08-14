// Audit Logging Service v7.3.0
// Comprehensive audit logging for security events, user actions, and system operations

const winston = require('winston');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class AuditLoggingService {
    constructor(options = {}) {
        this.options = {
            logLevel: options.logLevel || 'info',
            maxFileSize: options.maxFileSize || 50485760, // 50MB
            maxFiles: options.maxFiles || 10,
            enableEncryption: options.enableEncryption || false,
            encryptionKey: options.encryptionKey || process.env.AUDIT_ENCRYPTION_KEY,
            enableIntegrityCheck: options.enableIntegrityCheck !== false,
            rotateDaily: options.rotateDaily !== false,
            ...options
        };

        // Initialize audit logger with rotation and formatting
        this.auditLogger = winston.createLogger({
            level: this.options.logLevel,
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss.SSS'
                }),
                winston.format.errors({ stack: true }),
                winston.format.json(),
                winston.format.printf(info => {
                    const logEntry = {
                        timestamp: info.timestamp,
                        level: info.level,
                        eventType: info.eventType,
                        userId: info.userId,
                        sessionId: info.sessionId,
                        ip: info.ip,
                        userAgent: info.userAgent,
                        action: info.action,
                        resource: info.resource,
                        result: info.result,
                        details: info.details,
                        metadata: info.metadata,
                        checksum: this.calculateChecksum(info)
                    };
                    return JSON.stringify(logEntry);
                })
            ),
            transports: [
                new winston.transports.File({
                    filename: 'logs/audit.log',
                    maxsize: this.options.maxFileSize,
                    maxFiles: this.options.maxFiles,
                    tailable: true
                }),
                new winston.transports.File({
                    filename: 'logs/audit-security.log',
                    level: 'warn',
                    maxsize: this.options.maxFileSize,
                    maxFiles: this.options.maxFiles,
                    tailable: true
                })
            ]
        });

        // Event types for categorization
        this.eventTypes = {
            AUTHENTICATION: 'authentication',
            AUTHORIZATION: 'authorization',
            DATA_ACCESS: 'data_access',
            DATA_MODIFICATION: 'data_modification',
            SYSTEM_OPERATION: 'system_operation',
            SECURITY_EVENT: 'security_event',
            ERROR: 'error',
            CONFIGURATION: 'configuration',
            API_CALL: 'api_call',
            FILE_OPERATION: 'file_operation'
        };

        // Result types
        this.results = {
            SUCCESS: 'success',
            FAILURE: 'failure',
            DENIED: 'denied',
            ERROR: 'error',
            SUSPICIOUS: 'suspicious'
        };

        // Initialize audit statistics
        this.stats = {
            totalEvents: 0,
            eventsByType: new Map(),
            eventsByResult: new Map(),
            securityEvents: 0,
            lastEvent: null
        };

        console.log('📋 Audit Logging Service initialized');
    }

    // Log authentication events
    logAuthentication(userId, action, result, details = {}, req = null) {
        return this.logEvent({
            eventType: this.eventTypes.AUTHENTICATION,
            userId,
            action,
            result,
            details: {
                ...details,
                authMethod: details.authMethod || 'unknown',
                tokenType: details.tokenType || 'unknown'
            },
            req
        });
    }

    // Log authorization events
    logAuthorization(userId, resource, action, result, details = {}, req = null) {
        return this.logEvent({
            eventType: this.eventTypes.AUTHORIZATION,
            userId,
            resource,
            action,
            result,
            details: {
                ...details,
                permissions: details.permissions || [],
                requiredPermission: details.requiredPermission || 'unknown'
            },
            req
        });
    }

    // Log data access events
    logDataAccess(userId, resource, action, result, details = {}, req = null) {
        return this.logEvent({
            eventType: this.eventTypes.DATA_ACCESS,
            userId,
            resource,
            action,
            result,
            details: {
                ...details,
                recordCount: details.recordCount || 0,
                dataType: details.dataType || 'unknown',
                query: details.query || null
            },
            req
        });
    }

    // Log data modification events
    logDataModification(userId, resource, action, result, details = {}, req = null) {
        return this.logEvent({
            eventType: this.eventTypes.DATA_MODIFICATION,
            userId,
            resource,
            action,
            result,
            details: {
                ...details,
                recordsAffected: details.recordsAffected || 0,
                modificationType: details.modificationType || 'unknown',
                oldValues: details.oldValues || null,
                newValues: details.newValues || null
            },
            req
        });
    }

    // Log security events
    logSecurityEvent(eventName, severity, details = {}, req = null) {
        this.stats.securityEvents++;
        
        return this.logEvent({
            eventType: this.eventTypes.SECURITY_EVENT,
            action: eventName,
            result: this.results.SUSPICIOUS,
            details: {
                ...details,
                severity,
                threatLevel: details.threatLevel || 'medium',
                mitigationAction: details.mitigationAction || 'logged'
            },
            req,
            level: 'warn'
        });
    }

    // Log API calls
    logApiCall(userId, method, path, statusCode, duration, details = {}, req = null) {
        const result = statusCode >= 200 && statusCode < 300 ? this.results.SUCCESS :
                      statusCode >= 400 && statusCode < 500 ? this.results.DENIED :
                      this.results.ERROR;

        return this.logEvent({
            eventType: this.eventTypes.API_CALL,
            userId,
            action: `${method} ${path}`,
            resource: path,
            result,
            details: {
                ...details,
                method,
                statusCode,
                duration,
                responseSize: details.responseSize || 0,
                requestSize: details.requestSize || 0
            },
            req
        });
    }

    // Log file operations
    logFileOperation(userId, operation, filePath, result, details = {}, req = null) {
        return this.logEvent({
            eventType: this.eventTypes.FILE_OPERATION,
            userId,
            action: operation,
            resource: filePath,
            result,
            details: {
                ...details,
                fileSize: details.fileSize || 0,
                fileType: details.fileType || 'unknown',
                permissions: details.permissions || 'unknown'
            },
            req
        });
    }

    // Log system operations
    logSystemOperation(operation, result, details = {}, req = null) {
        return this.logEvent({
            eventType: this.eventTypes.SYSTEM_OPERATION,
            userId: 'system',
            action: operation,
            result,
            details: {
                ...details,
                systemComponent: details.systemComponent || 'unknown',
                operationType: details.operationType || 'unknown'
            },
            req
        });
    }

    // Generic event logging method
    logEvent(eventData) {
        try {
            const {
                eventType,
                userId = 'anonymous',
                sessionId = null,
                action,
                resource = null,
                result,
                details = {},
                req = null,
                level = 'info'
            } = eventData;

            // Extract request information if available
            const requestInfo = req ? {
                ip: req.ip || req.connection?.remoteAddress || 'unknown',
                userAgent: req.get('User-Agent') || 'unknown',
                method: req.method,
                path: req.path,
                query: req.query,
                headers: this.sanitizeHeaders(req.headers)
            } : {};

            // Create audit log entry
            const auditEntry = {
                eventId: this.generateEventId(),
                eventType,
                userId,
                sessionId: sessionId || this.extractSessionId(req),
                action,
                resource,
                result,
                details,
                ...requestInfo,
                metadata: {
                    serverVersion: '7.3.0',
                    nodeVersion: process.version,
                    environment: process.env.NODE_ENV || 'development',
                    pid: process.pid
                }
            };

            // Log the event
            this.auditLogger.log(level, 'Audit Event', auditEntry);

            // Update statistics
            this.updateStats(eventType, result);

            // Check for suspicious patterns
            this.checkSuspiciousActivity(auditEntry);

            return {
                success: true,
                eventId: auditEntry.eventId,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Audit logging failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Calculate checksum for integrity verification
    calculateChecksum(logEntry) {
        if (!this.options.enableIntegrityCheck) return null;
        
        const data = JSON.stringify({
            timestamp: logEntry.timestamp,
            eventType: logEntry.eventType,
            userId: logEntry.userId,
            action: logEntry.action,
            result: logEntry.result
        });
        
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    // Generate unique event ID
    generateEventId() {
        return `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    // Extract session ID from request
    extractSessionId(req) {
        if (!req) return null;
        return req.sessionID || req.get('X-Session-ID') || null;
    }

    // Sanitize headers for logging (remove sensitive data)
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-signature'];
        
        sensitiveHeaders.forEach(header => {
            if (sanitized[header]) {
                sanitized[header] = '[REDACTED]';
            }
        });
        
        return sanitized;
    }

    // Update audit statistics
    updateStats(eventType, result) {
        this.stats.totalEvents++;
        this.stats.eventsByType.set(eventType, (this.stats.eventsByType.get(eventType) || 0) + 1);
        this.stats.eventsByResult.set(result, (this.stats.eventsByResult.get(result) || 0) + 1);
        this.stats.lastEvent = new Date().toISOString();
    }

    // Check for suspicious activity patterns
    checkSuspiciousActivity(auditEntry) {
        // Implement suspicious activity detection logic
        const suspiciousPatterns = [
            // Multiple failed authentication attempts
            { type: 'authentication', result: 'failure', threshold: 5, timeWindow: 300000 }, // 5 minutes
            // Rapid API calls from same IP
            { type: 'api_call', threshold: 100, timeWindow: 60000 }, // 1 minute
            // Multiple authorization denials
            { type: 'authorization', result: 'denied', threshold: 10, timeWindow: 600000 } // 10 minutes
        ];

        // This would typically query recent logs to detect patterns
        // For now, we'll log high-risk events
        if (auditEntry.result === this.results.FAILURE || auditEntry.result === this.results.DENIED) {
            if (auditEntry.eventType === this.eventTypes.AUTHENTICATION) {
                this.logSecurityEvent('AUTHENTICATION_FAILURE', 'medium', {
                    userId: auditEntry.userId,
                    ip: auditEntry.ip,
                    userAgent: auditEntry.userAgent
                });
            }
        }
    }

    // Get audit statistics
    getStats() {
        return {
            ...this.stats,
            eventsByType: Object.fromEntries(this.stats.eventsByType),
            eventsByResult: Object.fromEntries(this.stats.eventsByResult),
            configuration: {
                logLevel: this.options.logLevel,
                maxFileSize: this.options.maxFileSize,
                maxFiles: this.options.maxFiles,
                encryptionEnabled: this.options.enableEncryption,
                integrityCheckEnabled: this.options.enableIntegrityCheck
            }
        };
    }

    // Search audit logs (basic implementation)
    async searchLogs(criteria = {}) {
        try {
            // This is a basic implementation - in production, you'd want a proper log search system
            const logPath = path.join(process.cwd(), 'logs', 'audit.log');
            const logContent = await fs.readFile(logPath, 'utf8');
            const lines = logContent.split('\n').filter(line => line.trim());
            
            let results = lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            }).filter(entry => entry !== null);

            // Apply filters
            if (criteria.eventType) {
                results = results.filter(entry => entry.eventType === criteria.eventType);
            }
            if (criteria.userId) {
                results = results.filter(entry => entry.userId === criteria.userId);
            }
            if (criteria.result) {
                results = results.filter(entry => entry.result === criteria.result);
            }
            if (criteria.startTime) {
                results = results.filter(entry => new Date(entry.timestamp) >= new Date(criteria.startTime));
            }
            if (criteria.endTime) {
                results = results.filter(entry => new Date(entry.timestamp) <= new Date(criteria.endTime));
            }

            // Limit results
            const limit = criteria.limit || 100;
            results = results.slice(-limit); // Get most recent

            return {
                success: true,
                results,
                total: results.length,
                criteria
            };

        } catch (error) {
            console.error('❌ Audit log search failed:', error);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }

    // Express middleware for automatic API audit logging
    middleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // Override res.end to capture response data
            const originalEnd = res.end;
            res.end = (...args) => {
                const duration = Date.now() - startTime;
                const responseSize = res.get('Content-Length') || 0;
                
                // Log the API call
                this.logApiCall(
                    req.user?.id || 'anonymous',
                    req.method,
                    req.path,
                    res.statusCode,
                    duration,
                    {
                        responseSize,
                        requestSize: req.get('Content-Length') || 0,
                        query: req.query,
                        body: req.body ? Object.keys(req.body) : []
                    },
                    req
                );
                
                originalEnd.apply(res, args);
            };
            
            next();
        };
    }

    // Cleanup old logs and statistics
    cleanup() {
        // Reset statistics periodically
        if (this.stats.totalEvents > 100000) {
            this.stats.eventsByType.clear();
            this.stats.eventsByResult.clear();
            this.stats.totalEvents = 0;
            console.log('📋 Audit statistics reset due to size');
        }
    }

    // Destroy service and cleanup resources
    destroy() {
        if (this.auditLogger) {
            this.auditLogger.close();
        }
        console.log('📋 Audit Logging Service destroyed');
    }
}

module.exports = { AuditLoggingService };
