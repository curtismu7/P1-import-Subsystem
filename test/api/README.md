# PingOne Import Tool API Testing Suite

This directory contains a comprehensive API testing suite for the PingOne Import Tool. The suite includes various test files that focus on different aspects of API testing, including endpoint validation, integration testing, performance testing, security testing, load testing, and mock testing.

## Test Files

- **comprehensive-api.test.js**: Core API tests covering all major endpoints
- **endpoints-api.test.js**: Detailed tests for individual API endpoints
- **integration-api.test.js**: Tests for API integration and multi-step workflows
- **performance-api.test.js**: Tests for API performance and response times
- **security-api.test.js**: Tests for API security, authentication, and authorization
- **load-api.test.js**: Tests for API behavior under load and stress conditions
- **mock-api.test.js**: Tests using mocked external services and simulated scenarios

## Running Tests

You can run the entire test suite using the `run-api-tests.js` script:

```bash
node test/api/run-api-tests.js
```

Or run individual test files using Jest:

```bash
npm run test:api -- endpoints-api.test.js
```

## Test Configuration

The test suite uses the following configuration:

- **Timeouts**: Each test suite has a specific timeout configured in `run-api-tests.js`
- **Priorities**: Test suites are run in order of priority (lower number = higher priority)
- **Environment**: Tests run in the `test` environment by default

## Test Reports

After running the tests, a detailed report is generated in the `test/reports` directory. The report includes:

- Overall test results (passed, failed, skipped)
- Individual test suite results
- Performance metrics
- Error details

## Adding New Tests

To add new tests:

1. Create a new test file in the `test/api` directory
2. Add the test file to the `testSuites` array in `run-api-tests.js`
3. Run the tests to verify they work correctly

## Best Practices

- Use descriptive test names
- Group related tests using `describe` blocks
- Use `beforeAll` and `afterAll` for setup and teardown
- Handle authentication properly in each test
- Validate response structure and content
- Test both success and error cases
- Monitor performance metrics