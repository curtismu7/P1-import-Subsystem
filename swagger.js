/**
 * @fileoverview Swagger/OpenAPI configuration for PingOne Import Tool API
 * 
 * This file configures Swagger documentation for all API endpoints,
 * including request/response schemas, authentication, and examples.
 * 
 * @author PingOne Import Tool
 * @version 5.5
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express from 'express';
import path from 'path';

/**
 * Swagger configuration options
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PingOne Import Tool API',
      version: '5.5',
      description: `
        Comprehensive API for importing, exporting, and managing users in PingOne.
        
        ## Features
        - **User Import**: Upload CSV files to create users in PingOne populations
        - **User Export**: Export users from populations in JSON/CSV formats
        - **User Modification**: Update existing users with batch operations
        - **User Deletion**: Remove users from populations with CSV file support
        - **Real-time Progress**: Server-Sent Events for import progress tracking
        - **Population Management**: Create and manage user populations
        - **Token Management**: Handle PingOne API authentication
        - **Feature Flags**: Enable/disable application features
        - **Comprehensive Logging**: Detailed logging for debugging and monitoring
        - **Settings Management**: Configure PingOne credentials and settings
        - **Health Monitoring**: System health checks and status monitoring
        - **History Tracking**: Operation history and audit logs
        
        ## Authentication
        Most endpoints require valid PingOne API credentials configured via settings.
        
        ## Rate Limiting
        API endpoints are rate-limited to prevent abuse:
        - Health checks: 200 requests/second
        - Logs API: 100 requests/second
        - General API: 150 requests/second
        
        ## File Uploads
        CSV files for import/modify operations have a 10MB size limit.
        
        ## Error Handling
        All endpoints return consistent error responses with appropriate HTTP status codes.
        
        ## Server-Sent Events (SSE)
        Real-time progress updates are available via SSE connections for long-running operations.
      `,
      contact: {
        name: 'PingOne Import Tool Support',
        email: 'support@pingone-import.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
      servers: [
        {
          url: 'http://localhost:4000',
          description: 'Development server',
        },
        {
          url: 'https://api.pingone-import.com',
          description: 'Production server',
        },
      ],
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'PingOne API access token',
        },
      },
      schemas: {
        // Common response schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully',
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)',
            },
          },
          required: ['success'],
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Validation failed',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
          required: ['success', 'error'],
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-07-12T15:35:29.053Z',
            },
            uptime: {
              type: 'number',
              example: 5.561143042,
            },
            server: {
              type: 'object',
              properties: {
                isInitialized: {
                  type: 'boolean',
                  example: true,
                },
                isInitializing: {
                  type: 'boolean',
                  example: false,
                },
                pingOneInitialized: {
                  type: 'boolean',
                  example: true,
                },
                pingOne: {
                  type: 'object',
                  properties: {
                    initialized: {
                      type: 'boolean',
                      example: true,
                    },
                    environmentId: {
                      type: 'string',
                      example: 'not configured',
                    },
                    region: {
                      type: 'string',
                      example: 'not configured',
                    },
                  },
                },
              },
            },
            system: {
              type: 'object',
              properties: {
                node: {
                  type: 'string',
                  example: 'v22.16.0',
                },
                platform: {
                  type: 'string',
                  example: 'darwin',
                },
                memory: {
                  type: 'object',
                  properties: {
                    rss: {
                      type: 'number',
                      example: 105086976,
                    },
                    heapTotal: {
                      type: 'number',
                      example: 38617088,
                    },
                    heapUsed: {
                      type: 'number',
                      example: 22732848,
                    },
                  },
                },
                memoryUsage: {
                  type: 'string',
                  example: '59%',
                },
                env: {
                  type: 'string',
                  example: 'development',
                },
                pid: {
                  type: 'number',
                  example: 3317,
                },
              },
            },
            checks: {
              type: 'object',
              properties: {
                pingOneConfigured: {
                  type: 'string',
                  example: 'error',
                },
                pingOneConnected: {
                  type: 'string',
                  example: 'ok',
                },
                memory: {
                  type: 'string',
                  example: 'ok',
                },
              },
            },
          },
        },
        // Import schemas
        ImportRequest: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              format: 'binary',
              description: 'CSV file containing user data',
            },
            populationId: {
              type: 'string',
              description: 'PingOne population ID',
              example: '3840c98d-202d-4f6a-8871-f3bc66cb3fa8',
            },
            populationName: {
              type: 'string',
              description: 'PingOne population name',
              example: 'Sample Users',
            },
            totalUsers: {
              type: 'number',
              description: 'Expected number of users in CSV',
              example: 100,
            },
          },
          required: ['file', 'populationId', 'populationName'],
        },
        ImportResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            sessionId: {
              type: 'string',
              description: 'Unique session ID for progress tracking',
              example: 'session-12345',
            },
            message: {
              type: 'string',
              example: 'Import started successfully',
            },
            populationName: {
              type: 'string',
              example: 'Sample Users',
            },
            populationId: {
              type: 'string',
              example: '3840c98d-202d-4f6a-8871-f3bc66cb3fa8',
            },
            totalUsers: {
              type: 'number',
              example: 100,
            },
          },
        },
        ImportProgress: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            progress: {
              type: 'object',
              properties: {
                current: {
                  type: 'number',
                  example: 50,
                },
                total: {
                  type: 'number',
                  example: 100,
                },
                percentage: {
                  type: 'number',
                  example: 50.0,
                },
                message: {
                  type: 'string',
                  example: 'Processing user 50 of 100',
                },
                counts: {
                  type: 'object',
                  properties: {
                    processed: {
                      type: 'number',
                      example: 50,
                    },
                    created: {
                      type: 'number',
                      example: 45,
                    },
                    skipped: {
                      type: 'number',
                      example: 3,
                    },
                    failed: {
                      type: 'number',
                      example: 2,
                    },
                  },
                },
              },
            },
          },
        },
        // Export schemas
        ExportRequest: {
          type: 'object',
          properties: {
            populationId: {
              type: 'string',
              description: 'PingOne population ID to export',
              example: '3840c98d-202d-4f6a-8871-f3bc66cb3fa8',
            },
            format: {
              type: 'string',
              enum: ['json', 'csv'],
              description: 'Export format',
              example: 'json',
            },
            fields: {
              type: 'string',
              enum: ['all', 'basic', 'custom'],
              description: 'Field selection for export',
              example: 'basic',
            },
            ignoreDisabledUsers: {
              type: 'boolean',
              description: 'Include disabled users in export',
              example: false,
            },
          },
          required: ['populationId', 'format'],
        },
        ExportResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: 'user-123',
                  },
                  username: {
                    type: 'string',
                    example: 'john.doe@example.com',
                  },
                  email: {
                    type: 'string',
                    example: 'john.doe@example.com',
                  },
                  firstName: {
                    type: 'string',
                    example: 'John',
                  },
                  lastName: {
                    type: 'string',
                    example: 'Doe',
                  },
                  enabled: {
                    type: 'boolean',
                    example: true,
                  },
                },
              },
            },
            total: {
              type: 'number',
              example: 100,
            },
          },
        },
        // Modify schemas
        ModifyRequest: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              format: 'binary',
              description: 'CSV file containing user updates',
            },
            populationId: {
              type: 'string',
              description: 'PingOne population ID',
              example: '3840c98d-202d-4f6a-8871-f3bc66cb3fa8',
            },
            populationName: {
              type: 'string',
              description: 'PingOne population name',
              example: 'Sample Users',
            },
            totalUsers: {
              type: 'number',
              description: 'Expected number of users in CSV',
              example: 100,
            },
          },
          required: ['file', 'populationId', 'populationName'],
        },
        ModifyResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            sessionId: {
              type: 'string',
              description: 'Unique session ID for progress tracking',
              example: 'session-12345',
            },
            message: {
              type: 'string',
              example: 'Modify started successfully',
            },
            populationName: {
              type: 'string',
              example: 'Sample Users',
            },
            populationId: {
              type: 'string',
              example: '3840c98d-202d-4f6a-8871-f3bc66cb3fa8',
            },
            totalUsers: {
              type: 'number',
              example: 100,
            },
          },
        },
        // Delete schemas
        DeleteRequest: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              format: 'binary',
              description: 'CSV file containing users to delete',
            },
            populationId: {
              type: 'string',
              description: 'PingOne population ID',
              example: '3840c98d-202d-4f6a-8871-f3bc66cb3fa8',
            },
            populationName: {
              type: 'string',
              description: 'PingOne population name',
              example: 'Sample Users',
            },
            skipNotFound: {
              type: 'boolean',
              description: 'Skip users that are not found',
              example: true,
            },
          },
          required: ['file', 'populationId', 'populationName'],
        },
        DeleteResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            sessionId: {
              type: 'string',
              description: 'Unique session ID for progress tracking',
              example: 'session-12345',
            },
            message: {
              type: 'string',
              example: 'Delete started successfully',
            },
            populationName: {
              type: 'string',
              example: 'Sample Users',
            },
            populationId: {
              type: 'string',
              example: '3840c98d-202d-4f6a-8871-f3bc66cb3fa8',
            },
          },
        },
        // Settings schemas
        Settings: {
          type: 'object',
          properties: {
            environmentId: {
              type: 'string',
              description: 'PingOne environment ID',
              example: 'b9817c16-9910-4415-b67e-4ac687da74d9',
            },
            apiClientId: {
              type: 'string',
              description: 'PingOne client ID',
              example: '26e7f07c-11a4-402a-b064-07b55aee189e',
            },
            apiSecret: {
              type: 'string',
              description: 'PingOne client secret (encrypted)',
              example: 'enc:9p3hLItWFzw5BxKjH3.~TIGVPP~uj4os6fY93170dMvXadn1GEsWTP2lHSTAoevq',
            },
            populationId: {
              type: 'string',
              description: 'PingOne population ID',
              example: '3840c98d-202d-4f6a-8871-f3bc66cb3fa8',
            },
            region: {
              type: 'string',
              enum: ['NorthAmerica', 'Europe', 'AsiaPacific'],
              description: 'PingOne region',
              example: 'NorthAmerica',
            },
            rateLimit: {
              type: 'number',
              description: 'API rate limit (requests per minute)',
              example: 90,
            },
          },
        },
        SettingsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              $ref: '#/components/schemas/Settings',
            },
          },
        },
        SettingsUpdateRequest: {
          type: 'object',
          properties: {
            environmentId: {
              type: 'string',
              description: 'PingOne environment ID',
              example: 'b9817c16-9910-4415-b67e-4ac687da74d9',
            },
            apiClientId: {
              type: 'string',
              description: 'PingOne client ID',
              example: '26e7f07c-11a4-402a-b064-07b55aee189e',
            },
            apiSecret: {
              type: 'string',
              description: 'PingOne client secret (will be encrypted)',
              example: 'your-client-secret',
            },
            populationId: {
              type: 'string',
              description: 'PingOne population ID',
              example: '3840c98d-202d-4f6a-8871-f3bc66cb3fa8',
            },
            region: {
              type: 'string',
              enum: ['NorthAmerica', 'Europe', 'AsiaPacific'],
              description: 'PingOne region',
              example: 'NorthAmerica',
            },
            rateLimit: {
              type: 'number',
              description: 'API rate limit (requests per minute)',
              example: 90,
            },
          },
        },
        // Feature flags schemas
        FeatureFlags: {
          type: 'object',
          properties: {
            A: {
              type: 'boolean',
              description: 'Feature flag A',
              example: false,
            },
            B: {
              type: 'boolean',
              description: 'Feature flag B',
              example: false,
            },
            C: {
              type: 'boolean',
              description: 'Feature flag C',
              example: false,
            },
            progressPage: {
              type: 'boolean',
              description: 'Progress page feature flag',
              example: false,
            },
          },
        },
        FeatureFlagsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            flags: {
              $ref: '#/components/schemas/FeatureFlags',
            },
          },
        },
        FeatureFlagUpdateRequest: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              description: 'New enabled state for the flag',
              example: true,
            },
          },
          required: ['enabled'],
        },
        // Log schemas
        LogEntry: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'log-12345',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-07-12T15:35:29.053Z',
            },
            level: {
              type: 'string',
              enum: ['info', 'warning', 'error', 'debug'],
              example: 'info',
            },
            message: {
              type: 'string',
              example: 'User import completed',
            },
            data: {
              type: 'object',
              description: 'Additional log details',
            },
            ip: {
              type: 'string',
              example: '127.0.0.1',
            },
            userAgent: {
              type: 'string',
              example: 'Mozilla/5.0...',
            },
          },
          required: ['id', 'timestamp', 'level', 'message'],
        },
        LogRequest: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Log message',
              example: 'User import completed successfully',
            },
            level: {
              type: 'string',
              enum: ['info', 'warning', 'error', 'debug'],
              description: 'Log level',
              example: 'info',
            },
            data: {
              type: 'object',
              description: 'Additional log data',
              example: { userId: '123', action: 'import' },
            },
            source: {
              type: 'string',
              description: 'Source of the log',
              example: 'frontend',
            },
          },
          required: ['message'],
        },
        LogsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            count: {
              type: 'number',
              example: 100,
            },
            total: {
              type: 'number',
              example: 1000,
            },
            logs: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/LogEntry',
              },
            },
          },
        },
        // Population schemas
        Population: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '3840c98d-202d-4f6a-8871-f3bc66cb3fa8',
            },
            name: {
              type: 'string',
              example: 'Sample Users',
            },
            description: {
              type: 'string',
              example: 'This is a sample user population',
            },
            userCount: {
              type: 'number',
              example: 380,
            },
            default: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        PopulationsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Population',
              },
            },
            total: {
              type: 'number',
              example: 5,
            },
          },
        },
        // Token response schema
        TokenResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                access_token: {
                  type: 'string',
                  description: 'The access token for API authentication',
                  example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
                },
                token_type: {
                  type: 'string',
                  description: 'The type of token (always Bearer)',
                  example: 'Bearer',
                },
                expires_in: {
                  type: 'number',
                  description: 'Token expiry time in seconds',
                  example: 3600,
                },
                scope: {
                  type: 'string',
                  description: 'Comma-separated list of granted scopes',
                  example: 'p1:read:user p1:write:user p1:read:population p1:write:population',
                },
                expires_at: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Token expiry timestamp',
                  example: '2025-07-12T16:45:32.115Z',
                },
              },
            },
            message: {
              type: 'string',
              example: 'Access token retrieved successfully',
            },
          },
        },
        TokenRequest: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'PingOne client ID (optional, uses server config if not provided)',
              example: '26e7f07c-11a4-402a-b064-07b55aee189e',
            },
            client_secret: {
              type: 'string',
              description: 'PingOne client secret (optional, uses server config if not provided)',
              example: 'your-client-secret',
            },
            grant_type: {
              type: 'string',
              description: 'OAuth grant type (defaults to client_credentials)',
              example: 'client_credentials',
              default: 'client_credentials',
            },
          },
        },
        // History schemas
        HistoryEntry: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'history-12345',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-07-12T15:35:29.053Z',
            },
            operation: {
              type: 'string',
              enum: ['import', 'export', 'modify', 'delete'],
              example: 'import',
            },
            status: {
              type: 'string',
              enum: ['success', 'error', 'in_progress'],
              example: 'success',
            },
            populationName: {
              type: 'string',
              example: 'Sample Users',
            },
            populationId: {
              type: 'string',
              example: '3840c98d-202d-4f6a-8871-f3bc66cb3fa8',
            },
            totalUsers: {
              type: 'number',
              example: 100,
            },
            processedUsers: {
              type: 'number',
              example: 95,
            },
            message: {
              type: 'string',
              example: 'Import completed successfully',
            },
            details: {
              type: 'object',
              description: 'Additional operation details',
            },
          },
          required: ['id', 'timestamp', 'operation', 'status'],
        },
        HistoryResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            count: {
              type: 'number',
              example: 50,
            },
            total: {
              type: 'number',
              example: 200,
            },
            history: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/HistoryEntry',
              },
            },
          },
        },
        // SSE Event schemas
        SSEEvent: {
          type: 'object',
          properties: {
            event: {
              type: 'string',
              enum: ['progress', 'completion', 'error', 'keepalive'],
              example: 'progress',
            },
            data: {
              type: 'object',
              description: 'Event-specific data',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-07-12T15:35:29.053Z',
            },
          },
          required: ['event', 'data'],
        },
        // Version info schema
        VersionInfo: {
          type: 'object',
          properties: {
            version: {
              type: 'string',
              example: '5.5',
            },
            buildDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-07-12T15:35:29.053Z',
            },
            nodeVersion: {
              type: 'string',
              example: 'v22.16.0',
            },
            platform: {
              type: 'string',
              example: 'darwin',
            },
            environment: {
              type: 'string',
              example: 'development',
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: [
    './routes/api/index.js',
    './routes/settings.js',
    './routes/logs.js',
    './routes/pingone-proxy.js',
    './server.js',
  ],
};

/**
 * Generate Swagger specification
 */
const specs = swaggerJsdoc(swaggerOptions);

/**
 * Swagger UI configuration
 */
const swaggerUiOptions = {
  explorer: true,
  customCss: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    .swagger-ui {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .swagger-ui .topbar {
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      padding: 15px 0;
      box-shadow: 0 2px 10px rgba(0, 123, 255, 0.1);
    }
    
    .swagger-ui .topbar .topbar-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 20px;
    }
    
    .swagger-ui .topbar .topbar-wrapper .link {
      color: white;
      font-size: 24px;
      font-weight: 600;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .swagger-ui .topbar .topbar-wrapper .link::before {
      content: '';
      width: 32px;
      height: 32px;
      background: url('https://raw.githubusercontent.com/curtismu7/CDN/fd81b602d8c3635a8ca40aab169c83b86eae2dc0/Ping%20Identity_idEzgMTpXK_1.svg') no-repeat center;
      background-size: contain;
      filter: brightness(0) invert(1);
    }
    
    .swagger-ui .wrapper {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .swagger-ui .opblock {
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid #e1e5e9;
    }
    
    .swagger-ui .try-out__btn {
      background: #007bff;
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .swagger-ui .try-out__btn:hover {
      background: #0056b3;
      transform: translateY(-1px);
    }
    
    .swagger-ui .execute-wrapper .btn.execute {
      background: #28a745;
      border: none;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .swagger-ui .execute-wrapper .btn.execute:hover {
      background: #218838;
      transform: translateY(-1px);
    }
    
    .swagger-ui .auth-wrapper {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    
    .swagger-ui .auth-wrapper .authorization__btn {
      background: #007bff;
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
    }
    
    .swagger-ui .auth-wrapper .authorization__btn:hover {
      background: #0056b3;
    }
    
    .swagger-ui input[type="text"],
    .swagger-ui textarea,
    .swagger-ui select {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px 12px;
      font-family: inherit;
      font-size: 14px;
      transition: border-color 0.2s ease;
    }
    
    .swagger-ui input[type="text"]:focus,
    .swagger-ui textarea:focus,
    .swagger-ui select:focus {
      border-color: #007bff;
      outline: none;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
    
    @media (max-width: 768px) {
      .swagger-ui .wrapper {
        padding: 10px;
      }
    }
  `,
  customSiteTitle: 'PingOne Import Tool API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
  },
};

/**
 * Setup Swagger middleware
 */
const setupSwagger = (app) => {
  // Serve Swagger UI HTML file at /swagger.html
  app.get('/swagger.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/swagger/index.html'));
  });

  // Serve Swagger UI static assets at /swagger/
  app.use('/swagger', express.static(path.join(process.cwd(), 'public/swagger')));

  // Serve the OpenAPI spec at /swagger.json
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.send(specs);
  });

  // Also serve the spec at /api-docs.json for backward compatibility
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.send(specs);
  });

  // Legacy route for backward compatibility
  app.get('/swagger/html', (req, res) => {
    res.redirect('/swagger.html');
  });

  console.log('📚 Swagger UI available at /swagger.html');
  console.log('📄 Swagger JSON available at /swagger.json');
};

export { setupSwagger, specs }; 