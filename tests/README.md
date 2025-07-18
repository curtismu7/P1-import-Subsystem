# Test Files Directory

This directory contains all test files, scripts, and test data for the PingOne Import Tool.

## Directory Structure

### HTML Test Files
- **UI Component Tests**: Test files for specific UI components and features
- **Integration Tests**: End-to-end test scenarios
- **Debug Tests**: Files for debugging specific issues

### JavaScript Test Files
- **Unit Tests**: Individual component and function tests
- **Integration Scripts**: Scripts for testing API integrations
- **Validation Scripts**: Data validation and verification scripts

### CSV Test Data Files
- **Sample Data**: CSV files with test user data
- **Validation Data**: Files for testing data validation scenarios
- **Error Scenarios**: Files designed to test error handling

### Configuration Files
- **babel.test.config.js**: Babel configuration for test environment

## Test Categories

### UI Tests
- `test-comprehensive-ui-verification.html` - Complete UI verification suite
- `test-button-fixes.html` - Button functionality tests
- `test-dropdown-fixes.html` - Dropdown component tests
- `test-import-spinner-fix.html` - Import progress indicator tests
- `test-log-entry-enhancements.html` - Log display tests
- `test-modify-file-info.html` - File information display tests
- `test-export-enhancement.html` - Export functionality tests
- `test-delete-enhancement.html` - Delete functionality tests

### Authentication & Token Tests
- `test-token-status-verification.js` - Token status verification
- `test-token-status-indicator.test.js` - Token indicator component tests
- `test-token-expiration.html` - Token expiration handling
- `test-token-validation.cjs` - Token validation logic
- `test-token-success.cjs` - Successful token scenarios

### Population Management Tests
- `test-population-verification-simple.js` - Basic population verification
- `test-population-verification.js` - Comprehensive population tests
- `test-population-selection-verification.html` - Population selection UI
- `test-population-dropdown-fix.html` - Population dropdown fixes
- `test-population-fix.html` - Population-related fixes
- `test-population-debug.html` - Population debugging tools
- `test-population-selection.html` - Population selection tests

### Import/Export Tests
- `test-import-spinner-fix.html` - Import progress tests
- `test-import-button-spinner-fix.html` - Import button behavior
- `test-import-button-fix.html` - Import button fixes
- `test-import-manual.html` - Manual import testing
- `test-import-simple.js` - Simple import scenarios
- `test-import-functionality.js` - Import functionality tests
- `test-import.js` - Core import tests
- `test-import-with-file.cjs` - File-based import tests
- `test-actual-import.cjs` - Real import scenarios
- `test-csv-import.js` - CSV import processing
- `test-csv-import-new.js` - New CSV import features

### Disclaimer & Modal Tests
- `test-disclaimer-verification.js` - Disclaimer acceptance tests
- `test-disclaimer-simple.html` - Basic disclaimer tests
- `test-disclaimer-banner.test.js` - Disclaimer banner tests
- `test-disclaimer-fix-verification.html` - Disclaimer fix verification
- `test-disclaimer-debug-current.html` - Current disclaimer debugging
- `test-disclaimer-fix.html` - Disclaimer fixes
- `test-disclaimer-debug.html` - Disclaimer debugging
- `test-disclaimer-debug-live.html` - Live disclaimer debugging
- `test-disclaimer-console.js` - Console-based disclaimer tests
- `test-disclaimer-force.js` - Force disclaimer scenarios
- `test-disclaimer-app.js` - Disclaimer application tests

### API & Integration Tests
- `test-swagger-ui.html` - Swagger UI integration
- `test-swagger-integration.html` - Swagger API integration
- `test-worker-token-endpoint.html` - Worker token endpoint tests
- `test-production-error-handling.html` - Production error scenarios
- `test-connection-fix.html` - Connection handling fixes

### Logging & Debugging Tests
- `test-logs-search-simple.html` - Simple log search
- `test-logs-search.html` - Advanced log search
- `test-log-expansion.html` - Log entry expansion
- `test-sse-verification.html` - Server-Sent Events verification
- `test-sse-debugging.html` - SSE debugging tools

### File Handling Tests
- `test-file-upload-fix.html` - File upload fixes
- `test-file-parsing-fix.html` - File parsing fixes
- `test-robust-csv.html` - Robust CSV handling
- `test-getTotalUsers-fix.html` - User count fixes

### Progress & Status Tests
- `test-progress-manager.html` - Progress management
- `test-standardized-messages.html` - Standardized messaging
- `test-universal-token-status.html` - Universal token status
- `test-user-status-update.js` - User status updates
- `test-modify-status-update.js` - Modification status updates

### Test Data Files
- `test-users.csv` - Sample user data
- `test_users.csv` - Additional user data
- `test-import-only.csv` - Import-only test data
- `test-import-with-errors.csv` - Error scenario data
- `test-import-with-updates.csv` - Update scenario data
- `test-invalid-population.csv` - Invalid population data
- `test-population-conflict.csv` - Population conflict data
- `test-population-verification.csv` - Population verification data
- `test-population-validation.csv` - Population validation data
- `test-modify.csv` - Modification test data
- `test-delete.csv` - Deletion test data
- `A-fresh_test_users.csv` - Fresh test users
- `A2-fresh_test_users.csv` - Additional fresh test users

## Usage

### Running HTML Tests
1. Open any HTML test file in a web browser
2. Follow the instructions in the test file
3. Check the browser console for test results

### Running JavaScript Tests
```bash
# Run specific test files
node tests/test-token-validation.cjs
node tests/test-import-simple.js

# Run test runner
node tests/test-runner.js
```

### Running CSV Tests
1. Use CSV files with the import functionality
2. Verify expected behavior with different data scenarios
3. Check for proper error handling with invalid data

## Test Configuration

The `babel.test.config.js` file contains Babel configuration specifically for test files, ensuring proper transpilation of modern JavaScript features.

## Contributing

When adding new tests:
1. Use descriptive file names starting with `test-`
2. Include clear documentation in the test file
3. Group related tests together
4. Update this README when adding new test categories 