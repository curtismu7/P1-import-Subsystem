/**
 * Validation Schemas
 * 
 * Joi validation schemas for API request validation
 * Ensures data integrity and security across all endpoints
 */

import Joi from 'joi';

// Common field validations
const commonFields = {
    environmentId: Joi.string()
        .guid({ version: 'uuidv4' })
        .required()
        .messages({
            'string.guid': 'Environment ID must be a valid UUID',
            'any.required': 'Environment ID is required'
        }),
    
    clientId: Joi.string()
        .guid({ version: 'uuidv4' })
        .required()
        .messages({
            'string.guid': 'Client ID must be a valid UUID',
            'any.required': 'Client ID is required'
        }),
    
    clientSecret: Joi.string()
        .min(10)
        .max(500)
        .required()
        .messages({
            'string.min': 'Client secret must be at least 10 characters',
            'string.max': 'Client secret must not exceed 500 characters',
            'any.required': 'Client secret is required'
        }),
    
    region: Joi.string()
        .valid('NorthAmerica', 'Europe', 'Canada', 'Asia', 'Australia', 'US', 'EU', 'AP')
        .default('NorthAmerica')
        .messages({
            'any.only': 'Region must be one of: NorthAmerica, Europe, Canada, Asia, Australia, US, EU, AP'
        }),
    
    populationId: Joi.string()
        .guid({ version: 'uuidv4' })
        .optional()
        .allow('')
        .messages({
            'string.guid': 'Population ID must be a valid UUID'
        }),
    
    rateLimit: Joi.number()
        .integer()
        .min(1)
        .max(1000)
        .default(90)
        .messages({
            'number.min': 'Rate limit must be at least 1',
            'number.max': 'Rate limit must not exceed 1000'
        })
};

// Settings validation schemas
export const settingsSchemas = {
    // POST/PUT /api/settings
    createOrUpdate: Joi.object({
        environmentId: commonFields.environmentId,
        apiClientId: commonFields.clientId,
        apiSecret: commonFields.clientSecret,
        populationId: commonFields.populationId,
        region: commonFields.region,
        rateLimit: commonFields.rateLimit
    }).options({ stripUnknown: true }),
    
    // PATCH /api/settings (partial update)
    partialUpdate: Joi.object({
        environmentId: commonFields.environmentId.optional(),
        apiClientId: commonFields.clientId.optional(),
        apiSecret: commonFields.clientSecret.optional(),
        populationId: commonFields.populationId,
        region: commonFields.region,
        rateLimit: commonFields.rateLimit
    }).min(1).options({ stripUnknown: true })
};

// Logging validation schemas
export const loggingSchemas = {
    // POST /api/logs/ui
    uiLog: Joi.object({
        message: Joi.string().required().max(1000),
        level: Joi.string().valid('info', 'warning', 'error', 'debug').default('info'),
        data: Joi.object().default({}),
        source: Joi.string().default('client').max(50)
    }),
    
    // POST /api/logs/disk
    diskLog: Joi.object({
        level: Joi.string().valid('info', 'warning', 'error', 'debug').default('info'),
        message: Joi.string().required().max(1000),
        data: Joi.object().default({})
    }),
    
    // POST /api/logs/operations/history
    operationHistory: Joi.object({
        operationType: Joi.string().valid('IMPORT', 'EXPORT', 'DELETE', 'MODIFY').required(),
        total: Joi.number().integer().min(0).required(),
        success: Joi.number().integer().min(0).required(),
        skipped: Joi.number().integer().min(0).default(0),
        errors: Joi.number().integer().min(0).default(0),
        populationName: Joi.string().max(100).optional(),
        filename: Joi.string().max(255).optional(),
        timestamp: Joi.date().iso().default(() => new Date()),
        duration: Joi.number().positive().optional(),
        details: Joi.object().optional()
    })
};

// Import validation schemas
export const importSchemas = {
    // POST /api/import/start
    startImport: Joi.object({
        filename: Joi.string().required().max(255),
        populationId: commonFields.populationId.required(),
        skipDuplicates: Joi.boolean().default(false),
        skipDuplicatesUsername: Joi.boolean().default(false),
        totalRecords: Joi.number().integer().min(1).required()
    }),
    
    // POST /api/import/progress
    updateProgress: Joi.object({
        processed: Joi.number().integer().min(0).required(),
        errors: Joi.number().integer().min(0).default(0),
        warnings: Joi.number().integer().min(0).default(0),
        currentFile: Joi.string().max(255).optional()
    }),
    
    // POST /api/import/complete
    completeImport: Joi.object({
        success: Joi.boolean().required(),
        finalStats: Joi.object({
            total: Joi.number().integer().min(0).required(),
            processed: Joi.number().integer().min(0).required(),
            success: Joi.number().integer().min(0).required(),
            failed: Joi.number().integer().min(0).required(),
            skipped: Joi.number().integer().min(0).required()
        }).required()
    })
};

// Authentication validation schemas
export const authSchemas = {
    // POST /api/v1/auth/validate-credentials
    validateCredentials: Joi.object({
        clientId: commonFields.clientId,
        clientSecret: commonFields.clientSecret,
        environmentId: commonFields.environmentId,
        region: commonFields.region
    }),
    
    // POST /api/v1/auth/save-credentials
    saveCredentials: Joi.object({
        clientId: commonFields.clientId,
        clientSecret: commonFields.clientSecret,
        environmentId: commonFields.environmentId,
        region: commonFields.region,
        storageLocations: Joi.array().items(
            Joi.string().valid('environment', 'file', 'memory')
        ).min(1).required()
    })
};

// Test runner validation schemas
export const testRunnerSchemas = {
    // POST /api/test-runner/run
    runTest: Joi.object({
        testId: Joi.string().required().max(100),
        file: Joi.string().max(255).optional(),
        testName: Joi.string().max(100).optional(),
        parameters: Joi.object().optional()
    }),
    
    // POST /api/test-runner/run-batch
    runBatch: Joi.object({
        tests: Joi.array().items(
            Joi.object({
                testId: Joi.string().required().max(100),
                file: Joi.string().max(255).optional(),
                testName: Joi.string().max(100).optional(),
                parameters: Joi.object().optional()
            })
        ).min(1).max(10).required()
    })
};

// Query parameter validation schemas
export const querySchemas = {
    // GET /api/logs/* endpoints
    logQuery: Joi.object({
        limit: Joi.number().integer().min(1).max(1000).default(100),
        level: Joi.string().valid('info', 'warning', 'error', 'debug').optional(),
        filter: Joi.string().max(100).optional()
    }),
    
    // GET /api/logs/operations/history
    historyQuery: Joi.object({
        limit: Joi.number().integer().min(1).max(1000).default(100),
        sort: Joi.string().valid('asc', 'desc').default('desc'),
        operationType: Joi.string().valid('IMPORT', 'EXPORT', 'DELETE', 'MODIFY').optional(),
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().optional()
    })
};

// File upload validation
export const fileSchemas = {
    csvFile: Joi.object({
        fieldname: Joi.string().required(),
        originalname: Joi.string().required(),
        encoding: Joi.string().required(),
        mimetype: Joi.string().valid(
            'text/csv',
            'application/csv',
            'text/plain',
            'application/vnd.ms-excel'
        ).required(),
        size: Joi.number().max(50 * 1024 * 1024) // 50MB max
    })
};

export default {
    settingsSchemas,
    loggingSchemas,
    importSchemas,
    authSchemas,
    testRunnerSchemas,
    querySchemas,
    fileSchemas,
    commonFields
};