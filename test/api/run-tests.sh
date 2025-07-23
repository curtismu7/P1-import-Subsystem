#!/bin/bash

# Run API Tests Script
# This script runs the comprehensive API test suite for the PingOne Import Tool

# Set environment to test
export NODE_ENV=test

# Create reports directory if it doesn't exist
mkdir -p test/reports

# Display banner
echo "=================================================="
echo "  PingOne Import Tool - API Test Suite Runner"
echo "=================================================="
echo "Starting tests at $(date)"
echo ""

# Run the tests
node --experimental-modules --experimental-json-modules test/api/run-api-tests.js

# Check exit code
EXIT_CODE=$?

echo ""
echo "Tests completed at $(date)"
echo "Exit code: $EXIT_CODE"

# Open the report if on a desktop system
if [ -f "test/reports/api-test-results.json" ]; then
  echo "Test report saved to test/reports/api-test-results.json"
  
  # Check if we're on macOS and can open the report
  if [ "$(uname)" == "Darwin" ]; then
    echo "Opening test report..."
    open test/reports/api-test-results.json
  fi
fi

exit $EXIT_CODE