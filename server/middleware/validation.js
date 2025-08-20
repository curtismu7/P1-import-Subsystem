/**
 * Request Validation Middleware
 * 
 * Provides Joi-based validation for API requests with standardized
 * error responses and detailed validation feedback.
 */

import Joi from 'joi';
import { APIResponse } from '../utils/api-response.js';

/**
 * Validate request body against Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
export function validateBody(schema, options = {}) {
  const defaultOptions = {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
    ...options
  };

  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, defaultOptions);
    
    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      try {
        // Log concise validation failure context to aid debugging
        const endpoint = `${req.method} ${req.originalUrl}`;
        const redactedBody = { ...req.body };
        if (redactedBody.pingone_client_secret) redactedBody.pingone_client_secret = '[redacted]';
        if (redactedBody.clientSecret) redactedBody.clientSecret = '[redacted]';
        console.warn('⚠️ Validation failed:', { endpoint, validationErrors, body: redactedBody });
      } catch (_) { /* ignore logging errors */ }
      
      return res.status(400).json(
        APIResponse.validationError(validationErrors)
      );
    }
    
    req.validatedBody = value;
    next();
  };
}

/**
 * Validate request query parameters against Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
export function validateQuery(schema, options = {}) {
  const defaultOptions = {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
    ...options
  };

  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, defaultOptions);
    
    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return res.status(400).json(
        APIResponse.validationError(validationErrors)
      );
    }
    
    req.validatedQuery = value;
    next();
  };
}

/**
 * Validate request parameters against Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
export function validateParams(schema, options = {}) {
  const defaultOptions = {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
    ...options
  };

  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, defaultOptions);
    
    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return res.status(400).json(
        APIResponse.validationError(validationErrors)
      );
    }
    
    req.validatedParams = value;
    next();
  };
}

/**
 * Common validation schemas
 */
export const schemas = {
  // UUID validation
  uuid: Joi.string().uuid({ version: ['uuidv4', 'uuidv1'] }),
  
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('asc', 'desc').default('desc'),
    sortBy: Joi.string().default('createdAt')
  }),
  
  // PingOne specific
  populationId: Joi.string().uuid({ version: ['uuidv4', 'uuidv1'] }).required(),
  environmentId: Joi.string().uuid({ version: ['uuidv4', 'uuidv1'] }).required(),
  region: Joi.string().valid('NorthAmerica', 'Europe', 'AsiaPacific', 'Canada').required(),
  
  // Import/Export
  importRequest: Joi.object({
    populationId: Joi.string().uuid({ version: ['uuidv4', 'uuidv1'] }).required(),
    populationName: Joi.string().min(1).max(255).required(),
    totalUsers: Joi.number().integer().min(0).optional()
  }),
  
  exportRequest: Joi.object({
    populationId: Joi.string().uuid({ version: ['uuidv4', 'uuidv1'] }).required(),
    format: Joi.string().valid('json', 'csv').default('json'),
    fields: Joi.string().valid('all', 'basic', 'custom').default('basic'),
    ignoreDisabledUsers: Joi.boolean().default(false)
  }),
  
  // Settings
  settingsUpdate: Joi.object({
    // Standard keys (preferred)
    pingone_environment_id: Joi.string().uuid({ version: ['uuidv4', 'uuidv1'] }).optional(),
    pingone_client_id: Joi.string().uuid({ version: ['uuidv4', 'uuidv1'] }).optional(),
    pingone_client_secret: Joi.string().min(8).optional(),
    pingone_population_id: Joi.string().allow('').optional(), // Allow empty/omitted population ID
    pingone_region: Joi.string().valid('NorthAmerica', 'Europe', 'AsiaPacific', 'Canada', 'NA', 'EU', 'AP', 'CA').optional(),
    
    // Legacy keys (for backward compatibility)
    environmentId: Joi.string().uuid({ version: ['uuidv4', 'uuidv1'] }).optional(),
    apiClientId: Joi.string().uuid({ version: ['uuidv4', 'uuidv1'] }).optional(),
    apiSecret: Joi.string().min(8).optional(),
    populationId: Joi.string().allow('').optional(),
    region: Joi.string().valid('NorthAmerica', 'Europe', 'AsiaPacific', 'Canada', 'NA', 'EU', 'AP', 'CA').optional(),
    
    // Additional legacy variations
    'environment-id': Joi.string().uuid({ version: ['uuidv4', 'uuidv1'] }).optional(),
    'api-client-id': Joi.string().uuid({ version: ['uuidv4', 'uuidv1'] }).optional(),
    'api-secret': Joi.string().min(8).optional(),
    'client-id': Joi.string().uuid({ version: ['uuidv4', 'uuidv1'] }).optional(),
    'client-secret': Joi.string().min(8).optional(),
    clientId: Joi.string().uuid({ version: ['uuidv4', 'uuidv1'] }).optional(),
    clientSecret: Joi.string().min(8).optional(),
    
    // Application preferences
    rateLimit: Joi.number().integer().min(1).max(1000).optional(),
    showDisclaimerModal: Joi.boolean().optional(),
    showCredentialsModal: Joi.boolean().optional(),
    showSwaggerPage: Joi.boolean().optional(),
    autoRefreshToken: Joi.boolean().optional()
  }).min(1), // At least one field must be provided
  
  // Logging
  logEntry: Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'debug', 'trace').default('info'),
    message: Joi.string().min(1).max(1000).required(),
    data: Joi.object().optional(),
    source: Joi.string().max(100).default('client')
  }),
  
  // Feature flags
  featureFlagUpdate: Joi.object({
    enabled: Joi.boolean().required()
  })
};

/**
 * File upload validation middleware
 * @param {Object} options - File validation options
 * @returns {Function} Express middleware function
 */
export function validateFile(options = {}) {
  const {
    required = true,
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['text/csv', 'application/csv'],
    fieldName = 'file'
  } = options;

  return (req, res, next) => {
    const file = req.file;
    
    if (required && !file) {
      return res.status(400).json(
        APIResponse.error('File is required', 'FILE_REQUIRED')
      );
    }
    
    if (file) {
      // Check file size
      if (file.size > maxSize) {
        return res.status(413).json(
          APIResponse.error(
            `File size exceeds limit of ${maxSize / 1024 / 1024}MB`,
            'FILE_TOO_LARGE',
            { maxSize, actualSize: file.size }
          )
        );
      }
      
      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json(
          APIResponse.error(
            `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
            'INVALID_FILE_TYPE',
            { allowedTypes, actualType: file.mimetype }
          )
        );
      }
    }
    
    next();
  };
}

/**
 * Sanitize input to prevent XSS and injection attacks
 * @param {Object} options - Sanitization options
 * @returns {Function} Express middleware function
 */
export function sanitizeInput(options = {}) {
  const {
    fields = ['body', 'query', 'params'],
    stripHtml = true,
    trimWhitespace = true
  } = options;

  return (req, res, next) => {
    fields.forEach(field => {
      if (req[field] && typeof req[field] === 'object') {
        req[field] = sanitizeObject(req[field], { stripHtml, trimWhitespace });
      }
    });
    
    next();
  };
}

/**
 * Recursively sanitize object properties
 * @param {Object} obj - Object to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj, options) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      let sanitizedValue = value;
      
      if (options.stripHtml) {
        // Basic HTML stripping (for more robust solution, use DOMPurify)
        sanitizedValue = sanitizedValue.replace(/<[^>]*>/g, '');
      }
      
      if (options.trimWhitespace) {
        sanitizedValue = sanitizedValue.trim();
      }
      
      sanitized[key] = sanitizedValue;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export default {
  validateBody,
  validateQuery,
  validateParams,
  validateFile,
  sanitizeInput,
  schemas
};