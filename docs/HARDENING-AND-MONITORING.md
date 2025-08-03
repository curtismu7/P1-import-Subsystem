# 🛡️ Hardening & Monitoring Systems

## Overview

The PingOne Import Tool now includes comprehensive hardening and monitoring systems to prevent route mounting issues and ensure system reliability. These systems automatically detect and alert on critical failures, providing proactive monitoring and automated health checks.

## 🔧 Implemented Systems

### 1. 🔁 Route Health Check System

**File**: `server/route-health-checker.js`

**Features**:
- Automatic detection of all registered Express routes
- Validation of critical API endpoints
- Real-time route availability monitoring
- Detailed health reports with recommendations

**Critical Routes Monitored**:
- `/api/health` - System health endpoint
- `/api/logs` - Logging system endpoints
- `/api/auth/*` - Authentication management
- `/api/settings` - Configuration management
- `/api/import/*` - Import operations
- `/api/export/*` - Export operations
- `/api/history` - Operation history
- `/api/pingone` - PingOne API proxy
- `/api/debug-log` - Debug logging

**Usage**:
```bash
# Manual route health check
npm run test:health

# Integration tests for route availability
npm run test:routes
npm run test:routes:watch
```

### 2. 🔔 Memory Monitoring & Alerting

**File**: `server/memory-monitor.js`

**Features**:
- Real-time memory usage tracking
- Configurable alert thresholds (80%, 90%, 95%)
- Automatic garbage collection suggestions
- Memory trend analysis
- Alert cooldown to prevent spam

**Thresholds**:
- **Warning**: 80% memory usage
- **Critical**: 90% memory usage  
- **Emergency**: 95% memory usage

**Usage**:
```bash
# Check current memory status
npm run monitor:memory

# Memory monitoring runs automatically on server startup
```

### 3. 🧪 API Smoke Tests

**File**: `server/swagger-smoke-tests.js`

**Features**:
- Automated testing of all critical API endpoints
- Startup validation of API availability
- Performance monitoring (response times)
- Retry logic with exponential backoff
- Comprehensive reporting with recommendations

**Usage**:
```bash
# Run API smoke tests
npm run test:smoke

# Smoke tests run automatically on server startup
```

### 4. 📦 Integration Test Suite

**File**: `test/integration/route-availability.test.js`

**Features**:
- Jest-based integration tests for route availability
- Response format validation
- Performance testing
- Security header validation
- Error handling verification

**Test Categories**:
- Critical API Routes
- POST Route Availability
- Response Format Validation
- Route Error Handling
- Route Performance
- Route Security
- Route Consistency

## 🚀 Automatic Startup Integration

All monitoring systems are automatically initialized during server startup:

1. **Route Health Check** (2 seconds after startup)
2. **Memory Monitoring** (continuous, 30-second intervals)
3. **API Smoke Tests** (3 seconds after startup)
4. **Continuous Route Monitoring** (5-minute intervals)

### Startup Output Example:
```
🛡️ HARDENING & MONITORING SYSTEMS ACTIVE
   🔍 Route Health: HEALTHY
   📊 Memory Status: NORMAL
   🧪 API Health: OPERATIONAL
   🔄 Monitoring: ACTIVE
```

## 📊 Monitoring Dashboard

### System Status Indicators:
- **Route Health**: `healthy` | `unhealthy`
- **Memory Status**: `normal` | `warning` | `critical` | `emergency`
- **API Health**: `operational` | `degraded`
- **Monitoring**: `active` | `inactive`

### Real-time Alerts:
- **Console Output**: Immediate alerts to stderr for critical issues
- **Winston Logging**: Structured logging with detailed context
- **Recommendations**: Actionable suggestions for issue resolution

## 🛠️ Manual Commands

### Health Checks:
```bash
# Route health check
npm run test:health

# Memory status
npm run monitor:memory

# API smoke tests
npm run test:smoke
```

### Testing:
```bash
# Route availability tests
npm run test:routes

# Watch mode for route tests
npm run test:routes:watch

# Full integration test suite
npm test
```

### Monitoring:
```bash
# Check server logs for monitoring output
tail -f logs/server-background.log | grep -E "(HARDENING|Route Health|Memory|Smoke)"

# Check application health
curl http://localhost:4000/api/health
```

## 🔧 Configuration

### Memory Monitoring Configuration:
```javascript
const MEMORY_THRESHOLDS = {
    WARNING: 80,    // 80% memory usage
    CRITICAL: 90,   // 90% memory usage
    EMERGENCY: 95   // 95% memory usage
};

const MONITORING_CONFIG = {
    checkInterval: 30000,      // Check every 30 seconds
    alertCooldown: 300000,     // 5 minutes between similar alerts
    historySize: 100,          // Keep last 100 memory readings
    gcThreshold: 85            // Trigger GC suggestion at 85%
};
```

### Route Monitoring Configuration:
```javascript
const CRITICAL_ROUTES = [
    '/api/health',
    '/api/logs',
    '/api/auth/status',
    '/api/settings',
    // ... additional critical routes
];
```

### Smoke Test Configuration:
```javascript
const TEST_CONFIG = {
    timeout: 5000,           // 5 second timeout per request
    retries: 2,              // Retry failed requests
    baseUrl: 'http://localhost:4000',
    userAgent: 'PingOne-Import-Tool-SmokeTest/7.0.2.3'
};
```

## 🚨 Alert Types & Responses

### Route Mounting Issues:
- **Detection**: Missing critical routes during health check
- **Alert**: Console error + Winston logging
- **Response**: Detailed route report with mounting suggestions

### Memory Issues:
- **Detection**: Memory usage exceeds thresholds
- **Alert**: Graduated alerts (warning → critical → emergency)
- **Response**: GC suggestions, memory optimization recommendations

### API Failures:
- **Detection**: Endpoints returning unexpected status codes
- **Alert**: Smoke test failure reports
- **Response**: Endpoint-specific troubleshooting recommendations

## 🧽 Graceful Shutdown

All monitoring systems are properly cleaned up during graceful shutdown:

```javascript
// Cleanup monitoring systems
if (process.monitoringCleanup) {
    process.monitoringCleanup.memory();     // Stop memory monitoring
    process.monitoringCleanup.routes();     // Stop route monitoring
}
```

## 📈 Benefits

### Proactive Issue Detection:
- **Route mounting issues detected immediately**
- **Memory leaks caught before system failure**
- **API degradation identified in real-time**

### Automated Recovery:
- **Garbage collection suggestions**
- **Detailed troubleshooting recommendations**
- **Automatic retry logic for transient failures**

### Production Readiness:
- **Comprehensive logging for debugging**
- **Performance monitoring and optimization**
- **Health check endpoints for load balancers**

## 🔮 Future Enhancements

### Planned Features:
- **Integration with external monitoring services** (New Relic, DataDog)
- **Custom alert webhooks** (Slack, email notifications)
- **Performance metrics dashboard**
- **Automated recovery actions**
- **Predictive failure analysis**

### Extensibility:
- **Plugin architecture for custom monitors**
- **Configurable alert thresholds**
- **Custom health check endpoints**
- **Integration with CI/CD pipelines**

---

## 📞 Support

For issues with the hardening and monitoring systems:

1. **Check the logs**: `logs/server-background.log`
2. **Run manual health checks**: `npm run test:health`
3. **Review system status**: `npm run monitor:memory`
4. **Run smoke tests**: `npm run test:smoke`

The hardening systems are designed to be self-healing and provide clear guidance for issue resolution.
