// Security Hardening Middleware v7.3.0
// Comprehensive security headers, rate limiting, and protection mechanisms

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const winston = require('winston');

class SecurityHardeningMiddleware {
    constructor(options = {}) {
        this.options = {
            enableRateLimit: options.enableRateLimit !== false,
            enableSecurityHeaders: options.enableSecurityHeaders !== false,
            enableRequestValidation: options.enableRequestValidation !== false,
            enableThreatDetection: options.enableThreatDetection !== false,
            rateLimitWindowMs: options.rateLimitWindowMs || 900000, // 15 minutes
            rateLimitMax: options.rateLimitMax || 100, // requests per window
            strictRateLimitPaths: options.strictRateLimitPaths || ['/api/auth', '/api/token'],
            trustedProxies: options.trustedProxies || [],
            ...options
        };

        // Initialize security logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: 'logs/security-hardening.log',
                    maxsize: 10485760, // 10MB
                    maxFiles: 5
                })
            ]
        });

        // Threat detection patterns
        this.threatPatterns = [
            { name: 'SQL_INJECTION', pattern: /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i },
            { name: 'XSS_ATTEMPT', pattern: /<script|javascript:|on\w+\s*=/i },
            { name: 'PATH_TRAVERSAL', pattern: /\.\.[\/\\]/i },
            { name: 'COMMAND_INJECTION', pattern: /[;&|`$(){}]/i },
            { name: 'LDAP_INJECTION', pattern: /[()&|!]/i }
        ];

        // Initialize rate limiters
        this.rateLimiters = this.createRateLimiters();

        console.log('🔒 Security Hardening Middleware initialized');
    }

    // Create rate limiters for different endpoint types
    createRateLimiters() {
        const limiters = {};

        // General API rate limiter
        limiters.general = rateLimit({
            windowMs: this.options.rateLimitWindowMs,
            max: this.options.rateLimitMax,
            message: {
                success: false,
                error: 'Too many requests from this IP, please try again later',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(this.options.rateLimitWindowMs / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                this.logger.warn('Rate limit exceeded', {
                    ip: req.ip,
                    path: req.path,
                    method: req.method,
                    userAgent: req.get('User-Agent')
                });
                res.status(429).json(limiters.general.message);
            }
        });

        // Strict rate limiter for sensitive endpoints
        limiters.strict = rateLimit({
            windowMs: this.options.rateLimitWindowMs,
            max: Math.floor(this.options.rateLimitMax / 5), // 5x stricter
            message: {
                success: false,
                error: 'Too many authentication attempts, please try again later',
                code: 'AUTH_RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(this.options.rateLimitWindowMs / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                this.logger.error('Strict rate limit exceeded on sensitive endpoint', {
                    ip: req.ip,
                    path: req.path,
                    method: req.method,
                    userAgent: req.get('User-Agent'),
                    severity: 'high'
                });
                res.status(429).json(limiters.strict.message);
            }
        });

        // File upload rate limiter
        limiters.upload = rateLimit({
            windowMs: this.options.rateLimitWindowMs,
            max: 10, // Very strict for uploads
            message: {
                success: false,
                error: 'Too many file uploads, please try again later',
                code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(this.options.rateLimitWindowMs / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false
        });

        return limiters;
    }

    // Get security headers middleware
    getSecurityHeaders() {
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "https://api.pingone.com", "https://api.pingone.ca", "https://api.pingone.eu", "https://api.pingone.asia"],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'none'"],
                    manifestSrc: ["'self'"],
                    workerSrc: ["'none'"]
                }
            },
            crossOriginEmbedderPolicy: false, // Disable for API compatibility
            hsts: {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true
            },
            noSniff: true,
            frameguard: { action: 'deny' },
            xssFilter: true,
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
            permittedCrossDomainPolicies: false,
            dnsPrefetchControl: { allow: false }
        });
    }

    // Request validation middleware
    getRequestValidator() {
        return (req, res, next) => {
            try {
                // Validate request size
                const contentLength = parseInt(req.get('Content-Length') || '0');
                if (contentLength > 10485760) { // 10MB limit
                    this.logger.warn('Request size exceeded limit', {
                        ip: req.ip,
                        path: req.path,
                        contentLength,
                        userAgent: req.get('User-Agent')
                    });
                    return res.status(413).json({
                        success: false,
                        error: 'Request entity too large',
                        code: 'REQUEST_TOO_LARGE'
                    });
                }

                // Validate headers
                const suspiciousHeaders = this.validateHeaders(req.headers);
                if (suspiciousHeaders.length > 0) {
                    this.logger.warn('Suspicious headers detected', {
                        ip: req.ip,
                        path: req.path,
                        suspiciousHeaders,
                        userAgent: req.get('User-Agent')
                    });
                }

                // Validate request parameters
                const threats = this.detectThreats(req);
                if (threats.length > 0) {
                    this.logger.error('Security threats detected in request', {
                        ip: req.ip,
                        path: req.path,
                        method: req.method,
                        threats,
                        userAgent: req.get('User-Agent'),
                        severity: 'high'
                    });
                    
                    return res.status(400).json({
                        success: false,
                        error: 'Request contains potentially malicious content',
                        code: 'SECURITY_THREAT_DETECTED',
                        threats: threats.map(t => t.name)
                    });
                }

                next();
            } catch (error) {
                this.logger.error('Request validation error', {
                    error: error.message,
                    ip: req.ip,
                    path: req.path
                });
                next(error);
            }
        };
    }

    // Validate request headers for suspicious patterns
    validateHeaders(headers) {
        const suspicious = [];
        const suspiciousPatterns = [
            { name: 'UNUSUAL_USER_AGENT', pattern: /curl|wget|python|java|go-http|bot/i, header: 'user-agent' },
            { name: 'SUSPICIOUS_REFERER', pattern: /javascript:|data:|vbscript:/i, header: 'referer' },
            { name: 'UNUSUAL_ACCEPT', pattern: /application\/x-|text\/x-/i, header: 'accept' }
        ];

        suspiciousPatterns.forEach(({ name, pattern, header }) => {
            if (headers[header] && pattern.test(headers[header])) {
                suspicious.push({ name, header, value: headers[header] });
            }
        });

        return suspicious;
    }

    // Detect security threats in request data
    detectThreats(req) {
        const threats = [];
        
        // Check URL parameters
        Object.values(req.query || {}).forEach(value => {
            this.threatPatterns.forEach(pattern => {
                if (typeof value === 'string' && pattern.pattern.test(value)) {
                    threats.push({ ...pattern, location: 'query', value });
                }
            });
        });

        // Check request body
        if (req.body && typeof req.body === 'object') {
            const bodyString = JSON.stringify(req.body);
            this.threatPatterns.forEach(pattern => {
                if (pattern.pattern.test(bodyString)) {
                    threats.push({ ...pattern, location: 'body' });
                }
            });
        }

        // Check path parameters
        this.threatPatterns.forEach(pattern => {
            if (pattern.pattern.test(req.path)) {
                threats.push({ ...pattern, location: 'path', value: req.path });
            }
        });

        return threats;
    }

    // Get rate limiting middleware
    getRateLimitMiddleware() {
        return (req, res, next) => {
            // Apply strict rate limiting to sensitive paths
            if (this.options.strictRateLimitPaths.some(path => req.path.startsWith(path))) {
                return this.rateLimiters.strict(req, res, next);
            }

            // Apply upload rate limiting to file upload endpoints
            if (req.path.includes('/upload') || req.path.includes('/import')) {
                return this.rateLimiters.upload(req, res, next);
            }

            // Apply general rate limiting
            return this.rateLimiters.general(req, res, next);
        };
    }

    // IP whitelist/blacklist middleware
    getIPFilterMiddleware(options = {}) {
        const whitelist = options.whitelist || [];
        const blacklist = options.blacklist || [];

        return (req, res, next) => {
            const clientIP = req.ip || req.connection.remoteAddress;

            // Check blacklist first
            if (blacklist.includes(clientIP)) {
                this.logger.error('Blocked request from blacklisted IP', {
                    ip: clientIP,
                    path: req.path,
                    method: req.method,
                    userAgent: req.get('User-Agent')
                });
                
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    code: 'IP_BLACKLISTED'
                });
            }

            // Check whitelist if configured
            if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
                this.logger.warn('Request from non-whitelisted IP', {
                    ip: clientIP,
                    path: req.path,
                    method: req.method,
                    userAgent: req.get('User-Agent')
                });
                
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    code: 'IP_NOT_WHITELISTED'
                });
            }

            next();
        };
    }

    // Comprehensive security middleware stack
    getSecurityStack(options = {}) {
        const middlewares = [];

        // Security headers
        if (this.options.enableSecurityHeaders) {
            middlewares.push(this.getSecurityHeaders());
        }

        // IP filtering
        if (options.ipFilter) {
            middlewares.push(this.getIPFilterMiddleware(options.ipFilter));
        }

        // Rate limiting
        if (this.options.enableRateLimit) {
            middlewares.push(this.getRateLimitMiddleware());
        }

        // Request validation
        if (this.options.enableRequestValidation) {
            middlewares.push(this.getRequestValidator());
        }

        return middlewares;
    }

    // Get security statistics
    getStats() {
        return {
            rateLimiters: {
                general: {
                    windowMs: this.options.rateLimitWindowMs,
                    max: this.options.rateLimitMax
                },
                strict: {
                    windowMs: this.options.rateLimitWindowMs,
                    max: Math.floor(this.options.rateLimitMax / 5)
                },
                upload: {
                    windowMs: this.options.rateLimitWindowMs,
                    max: 10
                }
            },
            threatPatterns: this.threatPatterns.length,
            configuration: {
                enableRateLimit: this.options.enableRateLimit,
                enableSecurityHeaders: this.options.enableSecurityHeaders,
                enableRequestValidation: this.options.enableRequestValidation,
                enableThreatDetection: this.options.enableThreatDetection,
                strictRateLimitPaths: this.options.strictRateLimitPaths
            }
        };
    }

    // Test security configuration
    testConfiguration() {
        const tests = [];

        // Test rate limiters
        tests.push({
            name: 'Rate Limiters',
            status: this.rateLimiters.general && this.rateLimiters.strict ? 'PASS' : 'FAIL',
            details: 'Rate limiters initialized and configured'
        });

        // Test threat patterns
        tests.push({
            name: 'Threat Detection',
            status: this.threatPatterns.length > 0 ? 'PASS' : 'FAIL',
            details: `${this.threatPatterns.length} threat patterns configured`
        });

        // Test logger
        tests.push({
            name: 'Security Logging',
            status: this.logger ? 'PASS' : 'FAIL',
            details: 'Security logger initialized and configured'
        });

        return {
            overall: tests.every(test => test.status === 'PASS') ? 'PASS' : 'FAIL',
            tests,
            timestamp: new Date().toISOString()
        };
    }

    // Cleanup resources
    destroy() {
        if (this.logger) {
            this.logger.close();
        }
        console.log('🔒 Security Hardening Middleware destroyed');
    }
}

module.exports = { SecurityHardeningMiddleware };
