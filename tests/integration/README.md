# PingOne API Integration Tests

This directory contains integration tests that make actual API calls to PingOne services to verify the application's integration with PingOne APIs.

## Overview

Unlike unit tests that use mocks, these integration tests:
- Make real HTTP requests to PingOne APIs
- Test authentication flows with actual credentials
- Verify CRUD operations on real PingOne resources
- Test error handling with actual API responses

## Prerequisites

To run these tests, you need:

1. **Valid PingOne Credentials**: A PingOne environment with API access
2. **Environment Variables**: Set the required environment variables
3. **Network Access**: Ability to reach PingOne API endpoints

## Required Environment Variables

Set these environment variables before running the tests:

```bash
export PINGONE_CLIENT_ID="your-client-id"
export PINGONE_CLIENT_SECRET="your-client-secret"
export PINGONE_ENVIRONMENT_ID="your-environment-id"
export PINGONE_REGION="NA"  # Optional: NA, CA, EU, AU, or SG (defaults to NA)
```

## Running the Tests

### Run All Integration Tests
```bash
npm run test:integration:pingone
```

### Run with Verbose Output
```bash
npm run test:integration:pingone:verbose
```

### Run Specific Test Suites
```bash
# Authentication tests only
npx jest --config=jest.integration.config.js --testNamePattern="Authentication"

# Users API tests only
npx jest --config=jest.integration.config.js --testNamePattern="Users API"

# Error handling tests only
npx jest --config=jest.integration.config.js --testNamePattern="Error Handling"
```

## Test Structure

The integration tests are organized into the following test suites:

### 1. Authentication Tests
- **Token Acquisition**: Tests obtaining access tokens from PingOne
- **Token Validation**: Verifies tokens work with authenticated endpoints
- **Environment Access**: Confirms access to the specified environment

### 2. Populations API Tests
- **List Populations**: Fetches all populations in the environment
- **Create Population**: Creates a test population for user tests
- **Population Management**: Tests population CRUD operations

### 3. Users API Tests
- **Create User**: Creates test users in populations
- **Fetch Users**: Retrieves users from specific populations
- **Update User**: Modifies user attributes
- **User Lifecycle**: Tests complete user management workflow

### 4. Error Handling Tests
- **Invalid Token**: Tests behavior with invalid authentication
- **Non-existent Resources**: Tests 404 error handling
- **Rate Limiting**: Tests API rate limit responses (if applicable)

### 5. Cleanup Tests
- **Resource Cleanup**: Removes test data created during tests
- **Environment Reset**: Ensures no test artifacts remain

## Test Features

### Comprehensive Logging
Each test includes detailed console logging:
```
🔐 [API TEST] Testing PingOne authentication...
🔐 [API TEST] Authentication response: { status: 200, hasAccessToken: true }
🔐 [API TEST] ✅ Authentication successful
```

### Automatic Cleanup
Tests automatically clean up resources they create:
- Test users are deleted after user tests
- Test populations are removed after population tests
- No permanent changes are made to your PingOne environment

### Error Resilience
- Tests gracefully handle API errors
- Cleanup continues even if individual tests fail
- Detailed error logging helps with troubleshooting

### Conditional Execution
- Tests are automatically skipped if credentials are not provided
- Clear messaging explains what's needed to run the tests
- No failures occur when credentials are missing

## Test Data

The tests create temporary test data:
- **Test Populations**: Named with timestamps (e.g., "Test Population 1642123456789")
- **Test Users**: Email addresses with timestamps (e.g., "test.user.1642123456789@example.com")
- **Unique Identifiers**: All test data uses unique identifiers to avoid conflicts

## Regions Supported

The tests support all PingOne regions:
- **NA (North America)**: `https://api.pingone.com`
- **CA (Canada)**: `https://api.ca.pingone.ca`
- **EU (Europe)**: `https://api.eu.pingone.eu`
- **AU (Australia)**: `https://api.au.pingone.com.au`
- **SG (Singapore)**: `https://api.sg.pingone.sg`

## Troubleshooting

### Common Issues

1. **Missing Credentials**
   ```
   ⚠️  Integration tests will be skipped - missing environment variables
   ```
   **Solution**: Set the required environment variables

2. **Authentication Failures**
   ```
   🔐 [API TEST] ❌ Authentication failed: { status: 401 }
   ```
   **Solution**: Verify your client ID and secret are correct

3. **Environment Access Issues**
   ```
   🔍 [API TEST] ❌ Token validation failed: { status: 403 }
   ```
   **Solution**: Ensure your client has access to the specified environment

4. **Network Timeouts**
   ```
   Error: timeout of 10000ms exceeded
   ```
   **Solution**: Check your network connection and firewall settings

### Debug Mode

For detailed debugging, run tests with additional logging:
```bash
DEBUG=* npm run test:integration:pingone:verbose
```

## Security Considerations

- **Never commit credentials** to version control
- **Use environment-specific credentials** for testing
- **Rotate credentials regularly** if used in CI/CD
- **Monitor API usage** to avoid unexpected charges
- **Use dedicated test environments** when possible

## CI/CD Integration

For automated testing in CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run PingOne Integration Tests
  env:
    PINGONE_CLIENT_ID: ${{ secrets.PINGONE_CLIENT_ID }}
    PINGONE_CLIENT_SECRET: ${{ secrets.PINGONE_CLIENT_SECRET }}
    PINGONE_ENVIRONMENT_ID: ${{ secrets.PINGONE_ENVIRONMENT_ID }}
    PINGONE_REGION: "NA"
  run: npm run test:integration:pingone
```

## Contributing

When adding new integration tests:

1. **Follow the existing pattern** of detailed logging
2. **Include cleanup code** for any resources created
3. **Handle errors gracefully** with appropriate logging
4. **Use unique identifiers** to avoid conflicts
5. **Test both success and failure scenarios**
6. **Update this README** with new test descriptions

## Files

- `pingone-api-integration.test.js` - Main integration test suite
- `README.md` - This documentation file
- `../setup-integration.js` - Test setup and utilities
- `../global-setup-integration.js` - Global test setup
- `../global-teardown-integration.js` - Global test cleanup
- `../../jest.integration.config.js` - Jest configuration for integration tests