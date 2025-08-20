/**
 * @fileoverview Modern Swagger/OpenAPI configuration for PingOne Import Tool API
 * 
 * This file configures a modern, logical Swagger documentation interface
 * with proper endpoint ordering, improved UI styling, and developer-friendly features.
 * 
 * @author PingOne Import Tool
 * @version 6.5.1.3
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express from 'express';
import path from 'path';

/**
 * Modern Swagger configuration options
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PingOne Import Tool API',
      version: '6.5.1.3',
      description: `
        # 🚀 PingOne Import Tool API Documentation
        
        ## ⚙️ Quickstart Guide
        
        **Follow this order to get started:**
        
        1. **🔑 Authentication** - Get your worker token first
           - Run \`POST /token/worker\` to obtain access token
           - Check token status with \`GET /token/status\`
        
        2. **⚙️ Settings & Connection** - Configure your PingOne credentials
           - Save credentials via \`POST /settings\`
           - Test connection with \`GET /settings/test\`
        
        3. **👥 Populations** - View available user populations
           - List populations with \`GET /populations\`
        
        4. **📤 Import/Export** - Manage user data
           - Import users via \`POST /import\`
           - Export users via \`GET /users/export\`
           - View history with \`GET /history\`
        
        5. **👤 User Management** - Modify existing users
           - Delete users via \`POST /users/delete\`
           - Modify users via \`POST /users/modify\`
        
        ---
        
        ## 🔧 Features
        
        - **User Import**: Upload CSV files to create users in PingOne populations
        - **User Export**: Export users from populations in JSON/CSV formats  
        - **User Modification**: Update existing users with batch operations
        - **User Deletion**: Remove users from populations with CSV file support
        - **Real-time Progress**: Server-Sent Events for import progress tracking
        - **Population Management**: Create and manage user populations
        - **Token Management**: Handle PingOne API authentication
        - **Settings Management**: Configure PingOne credentials and settings
        - **Health Monitoring**: System health checks and status monitoring
        - **History Tracking**: Operation history and audit logs
        
        ## 🔐 Authentication
        
        Most endpoints require valid PingOne API credentials configured via settings.
        Token status is displayed at the top of the interface.
        
        ## 📁 File Uploads
        
        CSV files for import/modify operations have a 10MB size limit.
        
        ## ⚡ Rate Limiting
        
        API endpoints are rate-limited to prevent abuse:
        - Health checks: 200 requests/second
        - Logs API: 100 requests/second  
        - General API: 150 requests/second
        
        ## 🚨 Error Handling
        
        All endpoints return consistent error responses with appropriate HTTP status codes.
        
        ## 📡 Server-Sent Events (SSE)
        
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
    tags: [
      {
        name: 'Authentication',
        description: 'Token management and authentication endpoints',
        'x-displayName': '🔑 Authentication',
      },
      {
        name: 'Settings & Connection',
        description: 'PingOne credentials and connection configuration',
        'x-displayName': '⚙️ Settings & Connection',
      },
      {
        name: 'Populations',
        description: 'PingOne population management',
        'x-displayName': '👥 Populations',
      },
      {
        name: 'Import/Export',
        description: 'User import and export operations',
        'x-displayName': '📤 Import/Export',
      },
      {
        name: 'User Management',
        description: 'User modification and deletion operations',
        'x-displayName': '👤 User Management',
      },
      {
        name: 'System',
        description: 'System health and monitoring endpoints',
        'x-displayName': '🔧 System',
      },
    ],
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
        
        // Authentication schemas
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
                  example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
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
        TokenStatus: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                hasValidToken: {
                  type: 'boolean',
                  example: true,
                },
                expiresIn: {
                  type: 'number',
                  example: 1800,
                },
                expiresAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-07-12T16:45:32.115Z',
                },
                message: {
                  type: 'string',
                  example: 'Token is valid and expires in 30 minutes',
                },
              },
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
        
        // User Management schemas
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
        
        // Health schemas
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
                      example: 'b9817c16-9910-4415-b67e-4ac687da74d9',
                    },
                    region: {
                      type: 'string',
                      example: 'NorthAmerica',
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
                  example: 'ok',
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
    './routes/logs.js',
    './routes/api/history.js',
    './routes/api/logging.js',
    './routes/api/import.js',
    './routes/api/export.js',
    './routes/pingone-proxy.js',
    './auth-subsystem/server/index.js'
  ],
};

/**
 * Generate Swagger specification
 */
const specs = swaggerJsdoc(swaggerOptions);

/**
 * Modern Swagger UI configuration with PingOne styling
 */
const swaggerUiOptions = {
  explorer: true,
  customCss: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    /* Modern PingOne-inspired styling */
    .swagger-ui {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8f9fa;
    }
    
    /* Header styling */
    .swagger-ui .topbar {
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      padding: 20px 0;
      box-shadow: 0 4px 20px rgba(0, 123, 255, 0.15);
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    
    .swagger-ui .topbar .topbar-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .swagger-ui .topbar .topbar-wrapper .link {
      color: white;
      font-size: 28px;
      font-weight: 700;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .swagger-ui .topbar .topbar-wrapper .link::before {
      content: '';
      width: 40px;
      height: 40px;
      background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDRDMTEuNzIgNCA0IDExLjcyIDQgMjBDNCAyOC4yOCAxMS43MiAzNiAyMCAzNkMyOC4yOCAzNiAzNiAyOC4yOCAzNiAyMEMzNiAxMS43MiAyOC4yOCA0IDIwIDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTggMTJIMjJWMjBIMThWMTJaIiBmaWxsPSIjMDA3YmZmIi8+CjxwYXRoIGQ9Ik0xNiAxNkgyNFYxOEgxNlYxNloiIGZpbGw9IiMwMDc2ZmYiLz4KPC9zdmc+') no-repeat center;
      background-size: contain;
    }
    
    /* Token status indicator */
    .swagger-ui .topbar .token-status {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 8px 16px;
      color: white;
      font-size: 14px;
      font-weight: 500;
    }
    
    .swagger-ui .topbar .token-status.valid {
      background: rgba(40, 167, 69, 0.2);
      border: 1px solid rgba(40, 167, 69, 0.3);
    }
    
    .swagger-ui .topbar .token-status.invalid {
      background: rgba(220, 53, 69, 0.2);
      border: 1px solid rgba(220, 53, 69, 0.3);
    }
    
    /* Main content area */
    .swagger-ui .wrapper {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    /* Quickstart section */
    .swagger-ui .quickstart-section {
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      border-radius: 12px;
      padding: 24px;
      margin: 20px 0;
      border-left: 4px solid #2196f3;
    }
    
    .swagger-ui .quickstart-section h3 {
      color: #1976d2;
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: 600;
    }
    
    .swagger-ui .quickstart-section ol {
      margin: 0;
      padding-left: 20px;
    }
    
    .swagger-ui .quickstart-section li {
      margin: 8px 0;
      color: #424242;
      font-weight: 500;
    }
    
    /* Operation blocks */
    .swagger-ui .opblock {
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      border: 1px solid #e1e5e9;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .swagger-ui .opblock:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
    }
    
    .swagger-ui .opblock.opblock-post {
      border-color: #28a745;
    }
    
    .swagger-ui .opblock.opblock-get {
      border-color: #007bff;
    }
    
    .swagger-ui .opblock.opblock-delete {
      border-color: #dc3545;
    }
    
    .swagger-ui .opblock.opblock-put {
      border-color: #ffc107;
    }
    
    /* Operation headers */
    .swagger-ui .opblock .opblock-summary {
      padding: 20px;
      background: #fff;
      border-bottom: 1px solid #e1e5e9;
    }
    
    .swagger-ui .opblock .opblock-summary-description {
      font-weight: 500;
      color: #424242;
    }
    
    /* Try it out button */
    .swagger-ui .try-out__btn {
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      border: none;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 14px;
    }
    
    .swagger-ui .try-out__btn:hover {
      background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
    }
    
    /* Execute button */
    .swagger-ui .execute-wrapper .btn.execute {
      background: linear-gradient(135deg, #28a745 0%, #218838 100%);
      border: none;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 14px;
    }
    
    .swagger-ui .execute-wrapper .btn.execute:hover {
      background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }
    
    /* Form inputs */
    .swagger-ui input[type="text"],
    .swagger-ui textarea,
    .swagger-ui select {
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      padding: 12px 16px;
      font-family: inherit;
      font-size: 14px;
      transition: all 0.3s ease;
      background: #fff;
    }
    
    .swagger-ui input[type="text"]:focus,
    .swagger-ui textarea:focus,
    .swagger-ui select:focus {
      border-color: #007bff;
      outline: none;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }
    
    /* Response sections */
    .swagger-ui .responses-wrapper {
      background: #f8f9fa;
      border-radius: 8px;
      margin: 16px 0;
    }
    
    .swagger-ui .responses-inner {
      padding: 20px;
    }
    
    /* Code blocks */
    .swagger-ui .microlight {
      background: #2d3748;
      color: #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
    }
    
    /* Tags styling */
    .swagger-ui .opblock-tag {
      border-bottom: 2px solid #e1e5e9;
      margin-bottom: 24px;
    }
    
    .swagger-ui .opblock-tag-section h3 {
      color: #424242;
      font-size: 24px;
      font-weight: 600;
      padding: 20px 0;
      margin: 0;
    }
    
    /* Footer */
    .swagger-ui .footer {
      background: #f8f9fa;
      border-top: 1px solid #e1e5e9;
      padding: 20px;
      text-align: center;
      color: #6c757d;
      font-size: 14px;
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      .swagger-ui .wrapper {
        padding: 10px;
      }
      
      .swagger-ui .topbar .topbar-wrapper {
        flex-direction: column;
        gap: 16px;
      }
      
      .swagger-ui .topbar .topbar-wrapper .link {
        font-size: 24px;
      }
    }
    
    /* Status indicators */
    .swagger-ui .status-success {
      color: #28a745;
    }
    
    .swagger-ui .status-error {
      color: #dc3545;
    }
    
    .swagger-ui .status-warning {
      color: #ffc107;
    }
    
    .swagger-ui .status-info {
      color: #17a2b8;
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
    displayOperationId: false,
    displayHost: false,
    displayBasePath: false,
    showExtensions: true,
    showCommonExtensions: true,
    validatorUrl: null,
  },
};

/**
 * Setup modern Swagger middleware
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

  console.log('📚 Modern Swagger UI available at /swagger.html');
  console.log('📄 Swagger JSON available at /swagger.json');
  console.log('🎨 UI Version: 6.5.1.3');
};

export { setupSwagger, specs, swaggerUiOptions };