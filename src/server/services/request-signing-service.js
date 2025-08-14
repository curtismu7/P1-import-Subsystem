// Request Signing Service v7.3.0
// Provides secure request signing and validation for API endpoints

const crypto = require('crypto');
const winston = require('winston');

class RequestSigningService {
    constructor(options = {}) {
        this.options = {
            algorithm: 'sha256',
            signatureHeader: 'X-Signature',
            timestampHeader: 'X-Timestamp',
            nonceHeader: 'X-Nonce',
            maxTimestampAge: options.maxTimestampAge || 300000, // 5 minutes
            secretKey: options.secretKey || process.env.REQUEST_SIGNING_SECRET || this.generateSecret(),
            enableLogging: options.enableLogging !== false,
            ...options
        };

        // Initialize logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: 'logs/security.log',
                    maxsize: 10485760, // 10MB
                    maxFiles: 5
                })
            ]
        });

        // Nonce tracking to prevent replay attacks
        this.usedNonces = new Map();
        this.cleanupInterval = setInterval(() => this.cleanupOldNonces(), 60000); // Every minute

        console.log('🔐 Request Signing Service initialized');
    }

    // Generate a secure secret key
    generateSecret() {
        const secret = crypto.randomBytes(32).toString('hex');
        console.warn('⚠️  Generated new request signing secret. Store this securely:', secret);
        return secret;
    }

    // Sign a request
    signRequest(method, path, body = '', timestamp = null, nonce = null) {
        try {
            timestamp = timestamp || Date.now().toString();
            nonce = nonce || this.generateNonce();

            const payload = this.createPayload(method, path, body, timestamp, nonce);
            const signature = this.createSignature(payload);

            return {
                signature,
                timestamp,
                nonce,
                headers: {
                    [this.options.signatureHeader]: signature,
                    [this.options.timestampHeader]: timestamp,
                    [this.options.nonceHeader]: nonce
                }
            };
        } catch (error) {
            this.logger.error('Request signing failed', { 
                error: error.message, 
                method, 
                path 
            });
            throw new Error('Failed to sign request: ' + error.message);
        }
    }

    // Validate a signed request
    validateRequest(req) {
        try {
            const signature = req.get(this.options.signatureHeader);
            const timestamp = req.get(this.options.timestampHeader);
            const nonce = req.get(this.options.nonceHeader);

            // Check required headers
            if (!signature || !timestamp || !nonce) {
                return {
                    valid: false,
                    error: 'Missing required signature headers',
                    code: 'MISSING_HEADERS'
                };
            }

            // Validate timestamp
            const timestampValidation = this.validateTimestamp(timestamp);
            if (!timestampValidation.valid) {
                return timestampValidation;
            }

            // Validate nonce (prevent replay attacks)
            const nonceValidation = this.validateNonce(nonce, timestamp);
            if (!nonceValidation.valid) {
                return nonceValidation;
            }

            // Validate signature
            const body = req.body ? JSON.stringify(req.body) : '';
            const payload = this.createPayload(req.method, req.path, body, timestamp, nonce);
            const expectedSignature = this.createSignature(payload);

            if (!this.constantTimeCompare(signature, expectedSignature)) {
                this.logger.warn('Invalid request signature', {
                    method: req.method,
                    path: req.path,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    timestamp,
                    nonce
                });

                return {
                    valid: false,
                    error: 'Invalid signature',
                    code: 'INVALID_SIGNATURE'
                };
            }

            // Mark nonce as used
            this.markNonceUsed(nonce, timestamp);

            this.logger.info('Request signature validated successfully', {
                method: req.method,
                path: req.path,
                ip: req.ip,
                timestamp,
                nonce
            });

            return {
                valid: true,
                timestamp,
                nonce
            };

        } catch (error) {
            this.logger.error('Request validation failed', { 
                error: error.message,
                method: req.method,
                path: req.path,
                ip: req.ip
            });

            return {
                valid: false,
                error: 'Validation error: ' + error.message,
                code: 'VALIDATION_ERROR'
            };
        }
    }

    // Create payload for signing
    createPayload(method, path, body, timestamp, nonce) {
        return `${method.toUpperCase()}|${path}|${body}|${timestamp}|${nonce}`;
    }

    // Create HMAC signature
    createSignature(payload) {
        return crypto
            .createHmac(this.options.algorithm, this.options.secretKey)
            .update(payload)
            .digest('hex');
    }

    // Validate timestamp
    validateTimestamp(timestamp) {
        const now = Date.now();
        const requestTime = parseInt(timestamp);

        if (isNaN(requestTime)) {
            return {
                valid: false,
                error: 'Invalid timestamp format',
                code: 'INVALID_TIMESTAMP'
            };
        }

        const age = Math.abs(now - requestTime);
        if (age > this.options.maxTimestampAge) {
            return {
                valid: false,
                error: 'Request timestamp too old or too far in future',
                code: 'TIMESTAMP_EXPIRED'
            };
        }

        return { valid: true };
    }

    // Validate nonce (prevent replay attacks)
    validateNonce(nonce, timestamp) {
        if (this.usedNonces.has(nonce)) {
            return {
                valid: false,
                error: 'Nonce already used (replay attack detected)',
                code: 'NONCE_REUSED'
            };
        }

        if (nonce.length < 16) {
            return {
                valid: false,
                error: 'Nonce too short',
                code: 'INVALID_NONCE'
            };
        }

        return { valid: true };
    }

    // Generate secure nonce
    generateNonce() {
        return crypto.randomBytes(16).toString('hex');
    }

    // Mark nonce as used
    markNonceUsed(nonce, timestamp) {
        this.usedNonces.set(nonce, parseInt(timestamp));
    }

    // Cleanup old nonces
    cleanupOldNonces() {
        const now = Date.now();
        const cutoff = now - this.options.maxTimestampAge;

        for (const [nonce, timestamp] of this.usedNonces.entries()) {
            if (timestamp < cutoff) {
                this.usedNonces.delete(nonce);
            }
        }
    }

    // Constant time string comparison (prevent timing attacks)
    constantTimeCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }

        return result === 0;
    }

    // Express middleware for request validation
    middleware(options = {}) {
        const skipPaths = options.skipPaths || ['/api/health', '/api/status', '/ping'];
        const skipMethods = options.skipMethods || ['GET'];
        const enforceForPaths = options.enforceForPaths || [];

        return (req, res, next) => {
            // Skip validation for certain paths and methods
            if (skipPaths.includes(req.path) || 
                (skipMethods.includes(req.method) && !enforceForPaths.includes(req.path))) {
                return next();
            }

            const validation = this.validateRequest(req);
            if (!validation.valid) {
                return res.status(401).json({
                    success: false,
                    error: 'Request signature validation failed',
                    code: validation.code,
                    details: validation.error
                });
            }

            // Add validation info to request
            req.signatureValidation = validation;
            next();
        };
    }

    // Get signing statistics
    getStats() {
        return {
            activeNonces: this.usedNonces.size,
            secretKeyLength: this.options.secretKey.length,
            algorithm: this.options.algorithm,
            maxTimestampAge: this.options.maxTimestampAge,
            configuration: {
                signatureHeader: this.options.signatureHeader,
                timestampHeader: this.options.timestampHeader,
                nonceHeader: this.options.nonceHeader
            }
        };
    }

    // Cleanup resources
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.usedNonces.clear();
        console.log('🔐 Request Signing Service destroyed');
    }
}

module.exports = { RequestSigningService };
