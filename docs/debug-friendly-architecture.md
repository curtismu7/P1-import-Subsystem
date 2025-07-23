# Debug-Friendly Architecture Guide

## Overview

This document outlines the debug-friendly architecture implemented in the PingOne Import Tool. The architecture prioritizes visibility, traceability, and debugging support across all layers of the application.

## Core Principles

### 1. **DRY (Don't Repeat Yourself)**
- Centralized utilities for common operations
- Shared modules for error handling, logging, and configuration
- Reusable middleware components

### 2. **Clean Module Separation**
- Clear separation of concerns between layers
- Well-defined interfaces between modules
- Minimal coupling between components

### 3. **Descriptive Error Messages**
- Structured error classification
- Context-rich error information
- User-friendly error messages with technical details for debugging

### 4. **Comprehensive Logging**
- Correlation IDs for request tracing
- Structured logging with multiple levels
- Performance monitoring integration

### 5. **Easy Navigation**
- Consistent file organization
- Clear naming conventions
- Comprehensive documentation

## Architecture Components

### Debug Utilities (`src/shared/debug-utils.js`)

Centralized debugging support with:
- **Conditional Logging**: Environment-based log level control
- **Performance Monitoring**: Built-in timing and memory tracking
- **Error Tracking**: Automatic error counting and analysis
- **Correlation Support**: Request tracing across the application

```javascript
import { debugLog, perfMonitor, errorTracker } from './debug-utils.js';

// Structured logging with categories
debugLog.info('Operation started', { userId: 123 }, DEBUG_CATEGORIES.API);

// Performance monitoring
const timer = perfMonitor.start('database-query');
// ... operation
timer.end();

// Error tracking
errorTracker.track('Database connection failed', { error }, DEBUG_CATEGORIES.DATABASE);
```

### Configuration Manager (`src/shared/config-manager.js`)

Centralized configuration with:
- **Environment-specific configs**: Development, test, production
- **Runtime validation**: Schema-based configuration validation
- **Hot reloading**: Configuration changes without restart
- **Secure handling**: Automatic sanitization of sensitive data

```javascript
import configManager from './config-manager.js';

await configManager.init();

const dbUrl = configManager.get('database.url');
const isDebugMode = configManager.get('debug.enableDebugMode');
```

### Error Handling (`src/server/middleware/error-middleware.js`)

Comprehensive error handling with:
- **Error Classification**: Automatic error type detection
- **Structured Responses**: Consistent error response format
- **Security-aware**: Safe error messages for production
- **Recovery Strategies**: Automatic retry logic for transient errors

```javascript
import { AppError, ValidationError, asyncHandler } from './error-middleware.js';

// Custom error types
throw new ValidationError('Invalid email format', { field: 'email' });

// Async route wrapper
app.get('/api/users', asyncHandler(async (req, res) => {
  // Route logic here
}));
```

### Request Correlation (`src/server/middleware/correlation-middleware.js`)

Request tracing with:
- **Correlation IDs**: Unique identifiers for each request
- **Cross-service tracing**: Propagation across service boundaries
- **Performance tracking**: Built-in request timing
- **Security monitoring**: Suspicious activity detection

```javascript
import { correlationMiddleware } from './correlation-middleware.js';

app.use(correlationMiddleware);

// Access correlation context in routes
app.get('/api/data', (req, res) => {
  const context = req.getCorrelationContext();
  debugLog.info('Processing request', context);
});
```

## File Organization

```
src/
├── shared/                 # Shared utilities and modules
│   ├── debug-utils.js     # Centralized debugging utilities
│   ├── config-manager.js  # Configuration management
│   └── error-handler.js   # Error handling utilities
├── server/                # Server-side modules
│   ├── middleware/        # Express middleware
│   │   ├── error-middleware.js      # Error handling middleware
│   │   └── correlation-middleware.js # Request correlation
│   └── services/          # Business logic services
└── client/                # Client-side modules
    ├── components/        # UI components
    ├── subsystems/        # Client-side subsystems
    └── utils/             # Client utilities
```

## Debugging Features

### 1. **Environment Variables**

Control debugging behavior through environment variables:

```bash
# Enable debug mode
DEBUG=true
DEBUG_LEVEL=debug
DEBUG_CATEGORIES=api,database,websocket

# Enable performance monitoring
ENABLE_PERFORMANCE_MONITORING=true

# Set log levels
LOG_LEVEL=debug
```

### 2. **Debug Helper Script**

Use the debug helper for runtime debugging:

```bash
# Show current configuration
node scripts/debug-helper.js config

# Show debug statistics
node scripts/debug-helper.js stats

# Show memory usage
node scripts/debug-helper.js memory

# Test logging functionality
node scripts/debug-helper.js test-logging
```

### 3. **Correlation IDs**

Every request gets a unique correlation ID for tracing:

```
[2025-01-22T10:30:45.123Z] [INFO] [API] Incoming request {
  "correlationId": "req-1642851045123-abc123def",
  "method": "POST",
  "url": "/api/users/import"
}
```

### 4. **Performance Monitoring**

Built-in performance tracking:

```javascript
// Automatic timing for operations
const timer = perfMonitor.start('user-import');
await importUsers(data);
timer.end(); // Logs: "Performance: user-import completed in 1234.56ms"
```

### 5. **Error Classification**

Automatic error classification and handling:

```javascript
// Errors are automatically classified
throw new ValidationError('Invalid email format');
// Results in: { type: 'validation', severity: 'low', statusCode: 400 }

throw new DatabaseError('Connection failed');
// Results in: { type: 'database', severity: 'high', statusCode: 500 }
```

## Best Practices

### 1. **Logging Guidelines**

- Use appropriate log levels (trace, debug, info, warn, error)
- Include correlation IDs in all log messages
- Use structured logging with context objects
- Sanitize sensitive data before logging

```javascript
// Good
debugLog.info('User created successfully', {
  correlationId: req.correlationId,
  userId: user.id,
  email: '[REDACTED]'
}, DEBUG_CATEGORIES.API);

// Bad
console.log('User created: ' + user.email);
```

### 2. **Error Handling Guidelines**

- Use specific error types for different scenarios
- Include context information in errors
- Provide user-friendly messages
- Log errors with appropriate severity

```javascript
// Good
throw new ValidationError('Email format is invalid', {
  field: 'email',
  value: '[REDACTED]',
  pattern: 'email'
});

// Bad
throw new Error('Bad email');
```

### 3. **Performance Monitoring Guidelines**

- Monitor critical operations
- Set performance budgets
- Track memory usage for long-running operations
- Use correlation IDs for performance tracking

```javascript
// Good
const timer = perfMonitor.start('database-query', DEBUG_CATEGORIES.DATABASE);
const result = await db.query(sql, params);
const metrics = timer.end();

if (metrics.durationMs > 1000) {
  debugLog.warn('Slow query detected', {
    duration: metrics.duration,
    query: sql
  }, DEBUG_CATEGORIES.PERFORMANCE);
}
```

## Testing Integration

### 1. **Debug Mode in Tests**

```javascript
// Enable debug mode for specific tests
process.env.DEBUG = 'true';
process.env.DEBUG_LEVEL = 'debug';

// Test with correlation IDs
const correlationId = 'test-correlation-id';
const response = await request(app)
  .get('/api/users')
  .set('X-Correlation-ID', correlationId);
```

### 2. **Error Testing**

```javascript
// Test error handling
it('should handle validation errors', async () => {
  const response = await request(app)
    .post('/api/users')
    .send({ email: 'invalid-email' });
    
  expect(response.status).toBe(400);
  expect(response.body.error.type).toBe('validation');
  expect(response.body.error.correlationId).toBeDefined();
});
```

## Monitoring and Observability

### 1. **Health Checks**

```javascript
// Built-in health check endpoint
GET /api/health

{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "external_api": "ok",
    "memory": "ok"
  },
  "correlationId": "health-check-123"
}
```

### 2. **Metrics Collection**

- Request/response times
- Error rates by type
- Memory usage patterns
- Database query performance

### 3. **Log Analysis**

- Structured logs for easy parsing
- Correlation ID tracking across services
- Error pattern detection
- Performance trend analysis

## Troubleshooting Guide

### Common Issues

1. **High Memory Usage**
   ```bash
   node scripts/debug-helper.js memory
   ```

2. **Slow Requests**
   - Check performance logs for correlation ID
   - Review database query times
   - Monitor external API calls

3. **Error Patterns**
   ```bash
   node scripts/debug-helper.js errors
   ```

4. **Configuration Issues**
   ```bash
   node scripts/debug-helper.js config
   ```

This architecture provides comprehensive debugging support while maintaining clean, maintainable code that's ready for rigorous testing and production deployment.