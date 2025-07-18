# Testing and Documentation Guide

This document provides comprehensive instructions for running automated tests and accessing API documentation for the PingOne Import Tool.

## 🧪 Automated Testing

### Test Structure

The project includes comprehensive automated testing with the following structure:

```
tests/
├── setup.js                    # Test environment configuration
├── api/
│   ├── comprehensive-api.test.js    # Full API route testing
│   └── route-coverage.test.js       # Systematic route coverage
```

### Running Tests

#### Prerequisites

All testing dependencies are already installed:
- **Jest**: Test framework
- **Supertest**: HTTP testing library
- **Cross-env**: Environment variable management

#### Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run specific test suites
npm run test:api          # API tests only
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only

# Run tests in watch mode (development)
npm run test:watch

# Run tests with debugging
npm run test:debug
```

#### Test Coverage

The test suite covers:

1. **All REST API Routes** (37+ endpoints)
   - GET, POST, PUT, DELETE methods
   - Valid and invalid payloads
   - Authentication scenarios
   - Error handling

2. **Edge Cases**
   - Missing required fields
   - Invalid data formats
   - Rate limiting behavior
   - File upload validation

3. **Security Testing**
   - Authentication headers
   - CORS configuration
   - Rate limiting headers
   - Security headers

4. **Performance Testing**
   - Response time validation
   - Concurrent request handling
   - Large payload processing

### Test Categories

#### 1. Comprehensive API Testing (`comprehensive-api.test.js`)

Tests all API endpoints with:
- ✅ Valid request scenarios
- ❌ Invalid request scenarios
- 🔐 Authentication testing
- 📁 File upload testing
- ⚡ Performance testing
- 🛡️ Security testing

#### 2. Route Coverage Testing (`route-coverage.test.js`)

Systematic validation that:
- All expected routes exist
- Routes respond with correct status codes
- Error handling is consistent
- Headers are properly set

### Test Output

Tests generate detailed output including:
- Pass/fail status with line numbers
- Coverage reports
- Performance metrics
- Error details

Example output:
```
✓ GET /api/health - should return healthy status (45ms)
✓ POST /api/import - should handle valid CSV file upload (123ms)
✓ POST /api/export-users - should handle missing required fields (12ms)
✗ POST /api/feature-flags/invalid - should handle invalid flag name (8ms)

Test Suites: 2 passed, 0 failed
Tests:       45 passed, 1 failed
Coverage:    98.5%
```

## 📚 API Documentation

### Swagger/OpenAPI Documentation

The API is fully documented using Swagger/OpenAPI 3.0 specification.

#### Accessing Documentation

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open Swagger UI:**
   - URL: `http://localhost:4000/api-docs`
   - Interactive API documentation
   - Try-it-out functionality
   - Request/response examples

3. **Access OpenAPI JSON:**
   - URL: `http://localhost:4000/api-docs.json`
   - Raw OpenAPI specification
   - Can be imported into other tools

#### Documentation Features

- **Interactive Testing**: Try API endpoints directly from the UI
- **Request/Response Examples**: Pre-filled examples for all endpoints
- **Authentication**: Bearer token support
- **Schema Validation**: Detailed request/response schemas
- **Error Documentation**: All possible error responses

### Documented Endpoints

#### Health & Status
- `GET /api/health` - System health check

#### Feature Flags
- `GET /api/feature-flags` - Get all feature flags
- `POST /api/feature-flags/{flag}` - Update feature flag
- `POST /api/feature-flags/reset` - Reset all flags

#### Import Operations
- `POST /api/import` - Import users from CSV
- `GET /api/import/progress/{sessionId}` - SSE progress tracking
- `POST /api/import/resolve-invalid-population` - Population resolution

#### Export Operations
- `POST /api/export-users` - Export users in JSON/CSV

#### User Management
- `POST /api/modify` - Modify existing users

#### PingOne API
- `GET /api/pingone/populations` - List populations
- `POST /api/pingone/get-token` - Get access token

#### Settings
- `GET /api/settings` - Get current settings
- `POST /api/settings` - Update settings
- `PUT /api/settings` - Partial settings update

#### Logging
- `GET /api/logs` - Get application logs
- `POST /api/logs/ui` - Create UI log entry
- `POST /api/logs/error` - Create error log
- `POST /api/logs/info` - Create info log
- `POST /api/logs/warning` - Create warning log
- `DELETE /api/logs` - Clear logs

### Adding Documentation for New Routes

To add Swagger documentation for new routes:

1. **Add JSDoc comments** above your route handler:

```javascript
/**
 * @swagger
 * /api/new-endpoint:
 *   get:
 *     summary: Brief description
 *     description: Detailed description
 *     tags: [Category]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get('/new-endpoint', (req, res) => {
  // Route implementation
});
```

2. **Define schemas** in `swagger.js` if needed:

```javascript
// In swagger.js components.schemas
NewResponse: {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { type: 'object' }
  }
}
```

3. **Reference schemas** in your route documentation:

```javascript
schema:
  $ref: '#/components/schemas/NewResponse'
```

## 🔧 Development Workflow

### Adding New Tests

1. **Create test file** in appropriate directory:
   ```bash
   touch tests/api/new-feature.test.js
   ```

2. **Write test cases** following existing patterns:
   ```javascript
   import request from 'supertest';
   import { describe, it, expect } from '@jest/globals';

   describe('New Feature', () => {
     it('should handle valid request', async () => {
       const response = await request(app)
         .post('/api/new-feature')
         .send({ data: 'test' })
         .expect(200);

       expect(response.body).toHaveProperty('success', true);
     });
   });
   ```

3. **Run tests** to verify:
   ```bash
   npm test tests/api/new-feature.test.js
   ```

### Adding New Documentation

1. **Add Swagger annotations** to your route
2. **Update swagger.js** if new schemas are needed
3. **Test documentation** by visiting `/api-docs`
4. **Validate OpenAPI spec** using online validators

## 🚀 Production Deployment

### Testing in Production

1. **Run full test suite** before deployment:
   ```bash
   npm run test:coverage
   ```

2. **Verify documentation** is accessible:
   - `/api-docs` - Swagger UI
   - `/api-docs.json` - OpenAPI spec

3. **Check test coverage** meets requirements:
   - Minimum 90% coverage
   - All critical paths tested

### Documentation in Production

- Swagger UI is automatically available at `/api-docs`
- OpenAPI spec available at `/api-docs.json`
- Documentation is protected by same rate limiting as API
- Consider adding basic auth for production environments

## 📊 Monitoring and Metrics

### Test Metrics

- **Coverage**: Track test coverage percentage
- **Performance**: Monitor test execution time
- **Reliability**: Track test flakiness
- **Security**: Validate security headers and auth

### Documentation Metrics

- **Usage**: Track documentation page views
- **API Usage**: Monitor endpoint usage via Swagger
- **Feedback**: Collect user feedback on documentation

## 🛠️ Troubleshooting

### Common Test Issues

1. **Port conflicts**: Tests use port 4001, ensure it's available
2. **Mock failures**: Check mock configurations in `tests/setup.js`
3. **Timeout errors**: Increase timeout in test configuration
4. **Environment issues**: Ensure NODE_ENV=test is set

### Documentation Issues

1. **Swagger not loading**: Check server is running on correct port
2. **Missing routes**: Verify route annotations are correct
3. **Schema errors**: Validate OpenAPI spec using online tools
4. **CORS issues**: Check CORS configuration for documentation

## 📝 Best Practices

### Testing Best Practices

- ✅ Test both success and failure scenarios
- ✅ Use descriptive test names
- ✅ Mock external dependencies
- ✅ Test edge cases and error conditions
- ✅ Maintain test isolation
- ✅ Keep tests fast and reliable

### Documentation Best Practices

- ✅ Keep documentation up to date
- ✅ Provide clear examples
- ✅ Document all error responses
- ✅ Use consistent naming conventions
- ✅ Include authentication requirements
- ✅ Add rate limiting information

## 🔗 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)

---

**Last Updated**: Version 4.9  
**Maintained By**: PingOne Import Tool Team 