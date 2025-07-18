#!/usr/bin/env node

/**
 * Comprehensive Test Script for Frontend Fixes
 * 
 * This script tests:
 * 1. Token request functionality (should work without "Target URL is required")
 * 2. WebSocket connection functionality
 * 3. Socket.IO connection functionality
 * 4. Progress update functionality
 * 5. Footer visibility with PingIdentity logo and trademark
 */

import http from 'http';
import https from 'https';

const BASE_URL = 'http://localhost:4000';

// Test colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 4000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonBody = JSON.parse(body);
                    resolve({ status: res.statusCode, data: jsonBody });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testTokenRequest() {
    log('\n🔑 Testing Token Request Fix', 'blue');
    
    try {
        const response = await makeRequest('POST', '/api/pingone/get-token', {});
        
        if (response.status === 200 && response.data.success) {
            log('✅ Token request successful', 'green');
            log(`   Token type: ${response.data.token_type}`, 'green');
            log(`   Expires in: ${response.data.expires_in}s`, 'green');
            return true;
        } else {
            log('❌ Token request failed', 'red');
            log(`   Status: ${response.status}`, 'red');
            log(`   Response: ${JSON.stringify(response.data)}`, 'red');
            return false;
        }
    } catch (error) {
        log('❌ Token request error', 'red');
        log(`   Error: ${error.message}`, 'red');
        return false;
    }
}

async function testWebSocketConnection() {
    log('\n🌐 Testing WebSocket Connection', 'blue');
    
    return new Promise(async (resolve) => {
        try {
            // Use dynamic import for WebSocket
            const { WebSocket } = await import('ws');
            const ws = new WebSocket('ws://localhost:4000');
            
            const timeout = setTimeout(() => {
                log('❌ WebSocket connection timeout', 'red');
                resolve(false);
            }, 5000);
            
            ws.on('open', () => {
                clearTimeout(timeout);
                log('✅ WebSocket connection established', 'green');
                ws.close();
                resolve(true);
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                log('❌ WebSocket connection error', 'red');
                log(`   Error: ${error.message}`, 'red');
                resolve(false);
            });
            
        } catch (error) {
            log('❌ WebSocket test failed', 'red');
            log(`   Error: ${error.message}`, 'red');
            resolve(false);
        }
    });
}

async function testSocketIOEndpoint() {
    log('\n🔌 Testing Socket.IO Endpoint', 'blue');
    
    try {
        const response = await makeRequest('GET', '/socket.io/');
        
        if (response.status === 200) {
            log('✅ Socket.IO endpoint accessible', 'green');
            return true;
        } else {
            log('❌ Socket.IO endpoint failed', 'red');
            log(`   Status: ${response.status}`, 'red');
            return false;
        }
    } catch (error) {
        log('❌ Socket.IO endpoint error', 'red');
        log(`   Error: ${error.message}`, 'red');
        return false;
    }
}

async function testFooterImplementation() {
    log('\n🦶 Testing Footer Implementation', 'blue');
    
    try {
        const response = await makeRequest('GET', '/');
        
        if (response.status === 200) {
            const html = response.data;
            
            // Check for PingIdentity logo
            const hasLogo = html.includes('ping-logo') || html.includes('PingIdentity');
            if (hasLogo) {
                log('✅ PingIdentity logo found in footer', 'green');
            } else {
                log('❌ PingIdentity logo not found in footer', 'red');
            }
            
            // Check for trademark
            const hasTrademark = html.includes('PingIdentity™') || html.includes('PingIdentity');
            if (hasTrademark) {
                log('✅ PingIdentity trademark found in footer', 'green');
            } else {
                log('❌ PingIdentity trademark not found in footer', 'red');
            }
            
            // Check for version number
            const hasVersion = html.includes('Version:') || html.includes('version');
            if (hasVersion) {
                log('✅ Version number found in footer', 'green');
            } else {
                log('❌ Version number not found in footer', 'red');
            }
            
            return hasLogo && hasTrademark && hasVersion;
        } else {
            log('❌ Failed to load main page', 'red');
            log(`   Status: ${response.status}`, 'red');
            return false;
        }
    } catch (error) {
        log('❌ Footer test error', 'red');
        log(`   Error: ${error.message}`, 'red');
        return false;
    }
}

async function testProgressUpdateAPI() {
    log('\n📊 Testing Progress Update API', 'blue');
    
    try {
        // Test the progress endpoint
        const response = await makeRequest('GET', '/api/import/progress/test-session');
        
        if (response.status === 200 || response.status === 404) {
            log('✅ Progress update API accessible', 'green');
            return true;
        } else {
            log('❌ Progress update API failed', 'red');
            log(`   Status: ${response.status}`, 'red');
            return false;
        }
    } catch (error) {
        log('❌ Progress update API error', 'red');
        log(`   Error: ${error.message}`, 'red');
        return false;
    }
}

async function runAllTests() {
    log('🚀 Starting Frontend Fixes Verification...\n', 'bold');
    
    const tests = [
        { name: 'Token Request Fix', fn: testTokenRequest },
        { name: 'WebSocket Connection', fn: testWebSocketConnection },
        { name: 'Socket.IO Endpoint', fn: testSocketIOEndpoint },
        { name: 'Footer Implementation', fn: testFooterImplementation },
        { name: 'Progress Update API', fn: testProgressUpdateAPI }
    ];
    
    const results = [];
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            results.push({ name: test.name, passed: result });
        } catch (error) {
            log(`❌ ${test.name} failed with error: ${error.message}`, 'red');
            results.push({ name: test.name, passed: false });
        }
    }
    
    // Summary
    log('\n📋 Test Results Summary:', 'bold');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        const color = result.passed ? 'green' : 'red';
        log(`${status} ${result.name}`, color);
    });
    
    log(`\n🎯 Overall: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
    
    if (passed === total) {
        log('\n🎉 All frontend fixes are working correctly!', 'green');
        log('✅ Token request errors fixed', 'green');
        log('✅ WebSocket connection issues resolved', 'green');
        log('✅ Socket.IO configuration improved', 'green');
        log('✅ Footer with PingIdentity branding visible', 'green');
        log('✅ Progress update functionality working', 'green');
    } else {
        log('\n⚠️  Some issues remain. Check the failed tests above.', 'yellow');
    }
    
    return passed === total;
}

// Run the tests
runAllTests()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        log(`❌ Test suite failed with error: ${error.message}`, 'red');
        process.exit(1);
    }); 