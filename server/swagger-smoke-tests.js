/**
 * Swagger-Based Smoke Tests
 * 
 * Automatically tests all API endpoints defined in Swagger documentation
 * to ensure they're properly mounted and responding correctly.
 * 
 * @author PingOne Import Tool Team
 * @version 7.0.2.3
 */

import fetch from 'node-fetch';
import { serverLogger } from './winston-config.js';

/**
 * Core API endpoints to test (independent of Swagger)
 */
const CORE_ENDPOINTS = [
    {
        path: '/api/health',
        method: 'GET',
        expectedStatus: [200],
        description: 'Health check endpoint'
    },
    {
        path: '/api/version',
        method: 'GET',
        expectedStatus: [200],
        description: 'Version information'
    },
    {
        path: '/api/settings',
        method: 'GET',
        expectedStatus: [200],
        description: 'Application settings'
    },
    {
        path: '/api/logs/ui',
        method: 'GET',
        expectedStatus: [200],
        description: 'UI logs endpoint'
    },
    {
        path: '/api/auth/status',
        method: 'GET',
        expectedStatus: [200, 503],
        description: 'Authentication status'
    },
    {
        path: '/api/auth/current-credentials',
        method: 'GET',
        expectedStatus: [200, 503],
        description: 'Current credentials'
    },
    {
        path: '/api/import/status',
        method: 'GET',
        expectedStatus: [200],
        description: 'Import operation status'
    },
    {
        path: '/api/export/status',
        method: 'GET',
        expectedStatus: [200],
        description: 'Export operation status'
    },
    {
        path: '/api/history',
        method: 'GET',
        expectedStatus: [200],
        description: 'Operation history'
    },
    {
        path: '/api/debug-log',
        method: 'GET',
        expectedStatus: [200],
        description: 'Debug logs'
    }
];

/**
 * Test configuration
 */
const TEST_CONFIG = {
    timeout: 5000,           // 5 second timeout per request
    retries: 2,              // Retry failed requests
    baseUrl: 'http://localhost:4000',
    userAgent: 'PingOne-Import-Tool-SmokeTest/7.0.2.3'
};

/**
 * Perform HTTP request with timeout and retry logic
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response object
 */
async function performRequest(url, options = {}) {
    const requestOptions = {
        method: 'GET',
        timeout: TEST_CONFIG.timeout,
        headers: {
            'User-Agent': TEST_CONFIG.userAgent,
            'Accept': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    let lastError;
    
    for (let attempt = 1; attempt <= TEST_CONFIG.retries + 1; attempt++) {
        try {
            const response = await fetch(url, requestOptions);
            
            return {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                contentType: response.headers.get('content-type'),
                ok: response.ok,
                url: response.url,
                attempt
            };
            
        } catch (error) {
            lastError = error;
            
            if (attempt <= TEST_CONFIG.retries) {
                serverLogger.warn(`Request attempt ${attempt} failed, retrying...`, {
                    url,
                    error: error.message
                });
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    
    throw lastError;
}

/**
 * Test a single endpoint
 * @param {Object} endpoint - Endpoint configuration
 * @param {string} baseUrl - Base URL for requests
 * @returns {Promise<Object>} Test result
 */
async function testEndpoint(endpoint, baseUrl = TEST_CONFIG.baseUrl) {
    const startTime = Date.now();
    const url = `${baseUrl}${endpoint.path}`;
    
    try {
        const response = await performRequest(url, {
            method: endpoint.method || 'GET'
        });
        
        const duration = Date.now() - startTime;
        const isExpectedStatus = endpoint.expectedStatus.includes(response.status);
        
        return {
            success: isExpectedStatus,
            endpoint: endpoint.path,
            method: endpoint.method || 'GET',
            description: endpoint.description,
            status: response.status,
            statusText: response.statusText,
            expectedStatus: endpoint.expectedStatus,
            contentType: response.contentType,
            duration,
            attempt: response.attempt,
            url,
            error: isExpectedStatus ? null : `Unexpected status: ${response.status}`
        };
        
    } catch (error) {
        const duration = Date.now() - startTime;
        
        return {
            success: false,
            endpoint: endpoint.path,
            method: endpoint.method || 'GET',
            description: endpoint.description,
            status: null,
            statusText: null,
            expectedStatus: endpoint.expectedStatus,
            contentType: null,
            duration,
            attempt: null,
            url,
            error: error.message
        };
    }
}

/**
 * Run smoke tests on all core endpoints
 * @param {string} baseUrl - Base URL for testing
 * @returns {Promise<Object>} Test results summary
 */
export async function runSmokeTests(baseUrl = TEST_CONFIG.baseUrl) {
    const startTime = Date.now();
    
    serverLogger.info('🧪 Starting API Smoke Tests', {
        baseUrl,
        endpointCount: CORE_ENDPOINTS.length,
        timeout: TEST_CONFIG.timeout
    });
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    // Test each endpoint
    for (const endpoint of CORE_ENDPOINTS) {
        const result = await testEndpoint(endpoint, baseUrl);
        results.push(result);
        
        if (result.success) {
            successCount++;
            serverLogger.debug(`✅ ${result.method} ${result.endpoint} - ${result.status} (${result.duration}ms)`);
        } else {
            failureCount++;
            serverLogger.error(`❌ ${result.method} ${result.endpoint} - ${result.error}`, {
                status: result.status,
                duration: result.duration,
                url: result.url
            });
        }
    }
    
    const totalDuration = Date.now() - startTime;
    const successRate = Math.round((successCount / CORE_ENDPOINTS.length) * 100);
    
    const summary = {
        success: failureCount === 0,
        timestamp: new Date().toISOString(),
        duration: totalDuration,
        baseUrl,
        endpoints: {
            total: CORE_ENDPOINTS.length,
            passed: successCount,
            failed: failureCount,
            successRate: `${successRate}%`
        },
        results,
        recommendations: generateRecommendations(results)
    };
    
    // Log summary
    if (summary.success) {
        serverLogger.info('✅ API Smoke Tests PASSED', {
            successRate: summary.endpoints.successRate,
            duration: `${totalDuration}ms`,
            endpoints: `${successCount}/${CORE_ENDPOINTS.length}`
        });
    } else {
        serverLogger.error('❌ API Smoke Tests FAILED', {
            successRate: summary.endpoints.successRate,
            duration: `${totalDuration}ms`,
            endpoints: `${successCount}/${CORE_ENDPOINTS.length}`,
            failures: results.filter(r => !r.success).map(r => r.endpoint)
        });
        
        // Write to stderr for immediate attention
        console.error('🚨 API SMOKE TEST FAILURES:');
        results.filter(r => !r.success).forEach(result => {
            console.error(`  • ${result.method} ${result.endpoint}: ${result.error}`);
        });
    }
    
    return summary;
}

/**
 * Generate recommendations based on test results
 * @param {Array} results - Test results
 * @returns {Array} Recommendations
 */
function generateRecommendations(results) {
    const recommendations = [];
    const failures = results.filter(r => !r.success);
    
    if (failures.length === 0) {
        recommendations.push('All endpoints are responding correctly');
        return recommendations;
    }
    
    // Check for 404 errors (route mounting issues)
    const notFoundErrors = failures.filter(r => r.status === 404);
    if (notFoundErrors.length > 0) {
        recommendations.push('Route mounting issues detected - check server.js route configuration');
        recommendations.push('Verify API router imports and mounting order');
    }
    
    // Check for 500 errors (server issues)
    const serverErrors = failures.filter(r => r.status >= 500);
    if (serverErrors.length > 0) {
        recommendations.push('Server errors detected - check application logs');
        recommendations.push('Verify all required dependencies are available');
    }
    
    // Check for timeout errors
    const timeoutErrors = failures.filter(r => r.error && r.error.includes('timeout'));
    if (timeoutErrors.length > 0) {
        recommendations.push('Timeout errors detected - check server performance');
        recommendations.push('Consider increasing timeout values or optimizing endpoints');
    }
    
    // Check for connection errors
    const connectionErrors = failures.filter(r => r.error && (
        r.error.includes('ECONNREFUSED') || 
        r.error.includes('ENOTFOUND') ||
        r.error.includes('fetch failed')
    ));
    if (connectionErrors.length > 0) {
        recommendations.push('Connection errors detected - verify server is running');
        recommendations.push('Check server port and network configuration');
    }
    
    return recommendations;
}

/**
 * Run smoke tests on startup
 * @param {string} baseUrl - Base URL for testing
 * @param {number} delay - Delay before running tests (ms)
 * @returns {Promise<Object>} Test results
 */
export async function runStartupSmokeTests(baseUrl = TEST_CONFIG.baseUrl, delay = 2000) {
    // Wait for server to fully initialize
    await new Promise(resolve => setTimeout(resolve, delay));
    
    serverLogger.info('🚀 Running startup smoke tests...');
    
    try {
        const results = await runSmokeTests(baseUrl);
        
        if (!results.success) {
            console.error('\n🚨 STARTUP SMOKE TESTS FAILED');
            console.error('Some API endpoints are not responding correctly.');
            console.error('Check the server logs for detailed error information.\n');
        }
        
        return results;
        
    } catch (error) {
        serverLogger.error('💥 Startup smoke tests failed with error:', error);
        console.error('🚨 STARTUP SMOKE TESTS ERROR:', error.message);
        
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Generate smoke test report
 * @param {Object} results - Test results
 * @returns {string} Formatted report
 */
export function generateSmokeTestReport(results) {
    let report = '\n' + '='.repeat(60) + '\n';
    report += '🧪 API SMOKE TEST REPORT\n';
    report += '='.repeat(60) + '\n';
    report += `Timestamp: ${results.timestamp}\n`;
    report += `Duration: ${results.duration}ms\n`;
    report += `Status: ${results.success ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `Success Rate: ${results.endpoints.successRate}\n`;
    report += `Endpoints: ${results.endpoints.passed}/${results.endpoints.total}\n\n`;
    
    // Passed endpoints
    const passed = results.results.filter(r => r.success);
    if (passed.length > 0) {
        report += '✅ PASSED ENDPOINTS:\n';
        passed.forEach(result => {
            report += `  • ${result.method} ${result.endpoint} - ${result.status} (${result.duration}ms)\n`;
        });
        report += '\n';
    }
    
    // Failed endpoints
    const failed = results.results.filter(r => !r.success);
    if (failed.length > 0) {
        report += '❌ FAILED ENDPOINTS:\n';
        failed.forEach(result => {
            report += `  • ${result.method} ${result.endpoint} - ${result.error}\n`;
        });
        report += '\n';
    }
    
    // Recommendations
    if (results.recommendations && results.recommendations.length > 0) {
        report += '💡 RECOMMENDATIONS:\n';
        results.recommendations.forEach((rec, index) => {
            report += `  ${index + 1}. ${rec}\n`;
        });
        report += '\n';
    }
    
    report += '='.repeat(60) + '\n';
    
    return report;
}

export default {
    runSmokeTests,
    runStartupSmokeTests,
    generateSmokeTestReport,
    CORE_ENDPOINTS,
    TEST_CONFIG
};
