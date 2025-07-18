# 🧪 Real API Integration Tests

This document describes the comprehensive integration test suite for the PingOne Import Tool that makes **real API calls** to PingOne using actual credentials and validates behavior against the live system.

## 🚀 Quick Start

### 1. Setup Test Environment

```bash
# Copy test environment template
npm run test:setup

# Edit the test environment file
nano test/integration/.env.test
```

### 2. Configure Test Credentials

Edit `test/integration/.env.test` with your PingOne test environment credentials:

```bash
# REQUIRED: PingOne Test Environment Credentials
PINGONE_TEST_CLIENT_ID=your-test-client-id-here
PINGONE_TEST_CLIENT_SECRET=your-test-client-secret-here
PINGONE_TEST_ENVIRONMENT_ID=your-test-environment-id-here
PINGONE_TEST_REGION=NorthAmerica

# OPTIONAL: API Configuration
API_BASE_URL=http://localhost:4000
TEST_TIMEOUT=60000
```

### 3. Start API Server

```bash
npm start
```

### 4. Run Integration Tests

```bash
# Run all integration tests
npm run test:integration:real

# Run with verbose output
npm run test:integration:real -- --verbose

# Run specific test file
npm run test:integration:real -- test/integration/real-api-integration.test.js
```

## 🔒 Security Features

### Environment Validation
- **Production Guard**: Tests cannot run in production environment
- **Credential Validation**: All required credentials must be present
- **Region Validation**: Only valid PingOne regions allowed
- **Secure Logging**: Credentials are masked in logs

### Test Data Isolation
- **Unique Test Data**: All test data uses unique timestamps
- **Automatic Cleanup**: Created data is automatically deleted
- **Test Environment Only**: Uses dedicated test environment
- **No Production Impact**: Cannot accidentally affect production

### Credential Management
- **Environment Variables**: Credentials loaded from `.env.test` only
- **Masked Logging**: Sensitive data hidden in console output
- **Secure Storage**: No credentials stored in code
- **Temporary Access**: Credentials only used during test execution

## 📋 Test Coverage

### Health and Status Endpoints
- ✅ Server health status
- ✅ System information
- ✅ Memory usage monitoring
- ✅ Environment validation

### Settings Management
- ✅ Retrieve current settings
- ✅ Update settings successfully
- ✅ Validate required fields
- ✅ Handle invalid data

### PingOne API Integration
- ✅ Authenticate with PingOne API
- ✅ Create and delete test populations
- ✅ Create and delete test users
- ✅ Validate API responses

### User Import Operations
- ✅ Import users from CSV file
- ✅ Handle import progress tracking
- ✅ Validate imported data
- ✅ Test file upload functionality

### User Export Operations
- ✅ Export users in JSON format
- ✅ Export users in CSV format
- ✅ Validate exported data structure
- ✅ Test export filtering

### Feature Flags
- ✅ Retrieve feature flags
- ✅ Update feature flag states
- ✅ Reset feature flags
- ✅ Validate flag operations

### Logging Endpoints
- ✅ Retrieve application logs
- ✅ Create log entries
- ✅ Validate log structure
- ✅ Test log levels

### Error Handling
- ✅ Handle invalid endpoints
- ✅ Handle invalid request data
- ✅ Handle authentication errors
- ✅ Validate error responses

### Performance and Limits
- ✅ Handle rate limiting
- ✅ Test timeout scenarios
- ✅ Validate performance metrics
- ✅ Test concurrent requests

## 🛠️ Test Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PINGONE_TEST_CLIENT_ID` | ✅ | - | PingOne test client ID |
| `PINGONE_TEST_CLIENT_SECRET` | ✅ | - | PingOne test client secret |
| `PINGONE_TEST_ENVIRONMENT_ID` | ✅ | - | PingOne test environment ID |
| `PINGONE_TEST_REGION` | ❌ | `NorthAmerica` | PingOne region |
| `API_BASE_URL` | ❌ | `http://localhost:4000` | API server URL |
| `TEST_TIMEOUT` | ❌ | `60000` | Test timeout in ms |
| `TEST_RETRY_ATTEMPTS` | ❌ | `3` | Retry attempts for failed requests |
| `TEST_CLEANUP_DELAY` | ❌ | `5000` | Cleanup delay in ms |

### Test Features

| Feature | Description | Default |
|---------|-------------|---------|
| **Environment Guard** | Prevents production runs | `true` |
| **Automatic Cleanup** | Deletes test data after tests | `true` |
| **Request Logging** | Logs all HTTP requests | `true` |
| **Response Logging** | Logs all HTTP responses | `true` |
| **Retry Logic** | Retries failed requests | `3 attempts` |
| **Timeout Handling** | Handles request timeouts | `30 seconds` |

## 📊 Test Data Management

### Test Data Creation
- **Unique Populations**: Each test creates unique populations
- **Unique Users**: Each test creates unique users
- **Timestamped Data**: All data includes timestamps
- **Isolated Sessions**: Import sessions are isolated

### Test Data Cleanup
- **Automatic Deletion**: All created data is deleted
- **Population Cleanup**: Test populations are removed
- **User Cleanup**: Test users are deleted
- **File Cleanup**: Temporary CSV files are removed

### Cleanup Tracking
```javascript
// Test configuration tracks created data
createdData: {
  populations: [], // Population IDs to delete
  users: [],      // User IDs to delete
  sessions: []    // Session IDs to track
}
```

## 🔍 Debugging and Troubleshooting

### Common Issues

#### Authentication Errors
```bash
# Check credentials
echo $PINGONE_TEST_CLIENT_ID
echo $PINGONE_TEST_ENVIRONMENT_ID

# Verify test environment is active
# Check API permissions for your client
```

#### Timeout Errors
```bash
# Increase timeout
export TEST_TIMEOUT=120000

# Check network connectivity
curl http://localhost:4000/api/health

# Verify API server is running
npm start
```

#### Cleanup Failures
```bash
# Check cleanup is enabled
export TEST_CLEANUP_ENABLED=true

# Verify API permissions for deletion
# Check logs for specific error messages
```

### Debug Mode
```bash
# Run with debug logging
TEST_LOG_LEVEL=debug npm run test:integration:real

# Run with request/response logging
TEST_LOG_REQUESTS=true TEST_LOG_RESPONSES=true npm run test:integration:real
```

### Manual Cleanup
```bash
# If automatic cleanup fails, manually clean up test data
# Check the test logs for created resource IDs
# Use PingOne Admin Console to delete test populations/users
```

## 📈 Performance Monitoring

### Test Metrics
- **Request/Response Times**: Logged for all API calls
- **Success/Failure Rates**: Tracked per endpoint
- **Memory Usage**: Monitored during test execution
- **Cleanup Performance**: Measured cleanup times

### Performance Thresholds
- **API Response Time**: < 5 seconds per request
- **Import Time**: < 30 seconds for 10 users
- **Export Time**: < 10 seconds for 100 users
- **Cleanup Time**: < 10 seconds for all test data

## 🔧 Advanced Configuration

### Custom Test Environment
```bash
# Create custom test environment
cp test/integration/env.test.example test/integration/.env.custom

# Run with custom environment
NODE_ENV=test dotenv -e test/integration/.env.custom npm run test:integration:real
```

### CI/CD Integration
```bash
# For CI/CD environments, set environment variables
export PINGONE_TEST_CLIENT_ID=$CI_PINGONE_CLIENT_ID
export PINGONE_TEST_CLIENT_SECRET=$CI_PINGONE_CLIENT_SECRET
export PINGONE_TEST_ENVIRONMENT_ID=$CI_PINGONE_ENVIRONMENT_ID

# Run tests
npm run test:integration:real
```

### Parallel Test Execution
```bash
# Run tests in parallel (use with caution)
npm run test:integration:real -- --maxWorkers=2

# Note: Parallel execution may cause rate limiting issues
```

## 📝 Test Development

### Adding New Tests
```javascript
// Example: Add new API endpoint test
test('should handle new endpoint', async () => {
  const response = await api.post('/api/new-endpoint', {
    testData: 'value'
  });
  
  expect(response.status).toBe(200);
  expect(response.data).toHaveProperty('success', true);
});
```

### Test Utilities
```javascript
// Create test CSV file
const csvPath = testUtils.createTestCSV(testUsers);

// Wait for async operations
await testUtils.wait(5000);

// Generate unique test data
const uniqueId = testUtils.generateUniqueId();
```

### Cleanup Functions
```javascript
// Manual cleanup if needed
await cleanup.cleanupAllData();

// Clean up specific resources
TEST_CONFIG.createdData.populations.push(populationId);
```

## 🚨 Important Notes

### Security Warnings
- ⚠️ **Never use production credentials**
- ⚠️ **Never commit `.env.test` to version control**
- ⚠️ **Use dedicated test environment only**
- ⚠️ **Monitor test data cleanup**

### Performance Considerations
- ⚡ **Tests make real API calls** - may be rate limited
- ⚡ **Cleanup operations** - may take time
- ⚡ **File uploads** - may be slow on slow connections
- ⚡ **Concurrent requests** - may hit rate limits

### Best Practices
- ✅ **Run tests in isolation**
- ✅ **Use unique test data**
- ✅ **Monitor cleanup success**
- ✅ **Check logs for errors**
- ✅ **Validate test results**

## 📞 Support

### Getting Help
1. Check the test logs for detailed error messages
2. Verify your PingOne test environment credentials
3. Ensure the API server is running
4. Check network connectivity
5. Review the troubleshooting section above

### Useful Commands
```bash
# Check test environment
node test/integration/test-env.config.js

# Validate environment variables
npm run test:integration:real -- --verbose

# Run specific test suite
npm run test:integration:real -- --testNamePattern="Health and Status"

# Debug test execution
NODE_OPTIONS='--inspect-brk' npm run test:integration:real
```

---

**Last Updated**: July 2025  
**Version**: 4.9  
**Compatibility**: Node.js 18+, PingOne API v1 