#!/usr/bin/env node

/**
 * Comprehensive Test Script for Token Request Fix and Footer Implementation
 * 
 * This script tests:
 * 1. Token request functionality (should no longer return "Target URL is required")
 * 2. Footer implementation with PingIdentity logo and trademark
 * 3. Overall application functionality
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
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const response = {
                        status: res.statusCode,
                        headers: res.headers,
                        body: body,
                        json: null
                    };
                    
                    if (body && res.headers['content-type']?.includes('application/json')) {
                        response.json = JSON.parse(body);
                    }
                    
                    resolve(response);
                } catch (error) {
                    reject(error);
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
    log('\n🔐 Testing Token Request Fix...', 'blue');
    
    try {
        const response = await makeRequest('POST', '/api/pingone/get-token', {});
        
        if (response.status === 200 && response.json?.success) {
            log('✅ Token request successful!', 'green');
            log(`   Token type: ${response.json.token_type}`, 'green');
            log(`   Expires in: ${response.json.expires_in} seconds`, 'green');
            log(`   Token length: ${response.json.access_token?.length || 0} characters`, 'green');
            return true;
        } else if (response.status === 400 && response.json?.error === 'Target URL is required') {
            log('❌ Token request still failing with "Target URL is required"', 'red');
            log(`   Status: ${response.status}`, 'red');
            log(`   Error: ${response.json?.error}`, 'red');
            return false;
        } else {
            log('⚠️  Token request returned unexpected response', 'yellow');
            log(`   Status: ${response.status}`, 'yellow');
            log(`   Response: ${JSON.stringify(response.json, null, 2)}`, 'yellow');
            return false;
        }
    } catch (error) {
        log('❌ Token request failed with error', 'red');
        log(`   Error: ${error.message}`, 'red');
        return false;
    }
}

async function testFooterImplementation() {
    log('\n🦶 Testing Footer Implementation...', 'blue');
    
    try {
        const response = await makeRequest('GET', '/');
        
        if (response.status === 200) {
            const html = response.body;
            
            // Check for PingIdentity logo
            const hasLogo = html.includes('ping-logo-img') || html.includes('PingIdentity');
            const hasTrademark = html.includes('trademark-symbol') || html.includes('™');
            const hasCopyright = html.includes('© 2025 Ping Identity Corporation');
            const hasFooterLinks = html.includes('support.pingidentity.com') || html.includes('docs.pingidentity.com');
            
            if (hasLogo && hasTrademark && hasCopyright) {
                log('✅ Footer implementation successful!', 'green');
                log('   ✅ PingIdentity logo present', 'green');
                log('   ✅ Trademark symbol (™) present', 'green');
                log('   ✅ Copyright notice present', 'green');
                if (hasFooterLinks) {
                    log('   ✅ Footer links present', 'green');
                }
                return true;
            } else {
                log('❌ Footer implementation incomplete', 'red');
                log(`   Logo: ${hasLogo ? '✅' : '❌'}`, hasLogo ? 'green' : 'red');
                log(`   Trademark: ${hasTrademark ? '✅' : '❌'}`, hasTrademark ? 'green' : 'red');
                log(`   Copyright: ${hasCopyright ? '✅' : '❌'}`, hasCopyright ? 'green' : 'red');
                log(`   Links: ${hasFooterLinks ? '✅' : '❌'}`, hasFooterLinks ? 'green' : 'red');
                return false;
            }
        } else {
            log('❌ Failed to load main page', 'red');
            log(`   Status: ${response.status}`, 'red');
            return false;
        }
    } catch (error) {
        log('❌ Footer test failed with error', 'red');
        log(`   Error: ${error.message}`, 'red');
        return false;
    }
}

async function testServerHealth() {
    log('\n🏥 Testing Server Health...', 'blue');
    
    try {
        const response = await makeRequest('GET', '/api/health');
        
        if (response.status === 200 && response.json?.status === 'ok') {
            log('✅ Server health check passed!', 'green');
            return true;
        } else {
            log('⚠️  Server health check returned unexpected response', 'yellow');
            log(`   Status: ${response.status}`, 'yellow');
            log(`   Response: ${JSON.stringify(response.json, null, 2)}`, 'yellow');
            return false;
        }
    } catch (error) {
        log('❌ Server health check failed', 'red');
        log(`   Error: ${error.message}`, 'red');
        return false;
    }
}

async function runAllTests() {
    log('🚀 Starting Comprehensive Test Suite...', 'bold');
    log('Testing Token Request Fix and Footer Implementation', 'bold');
    
    const results = {
        serverHealth: await testServerHealth(),
        tokenRequest: await testTokenRequest(),
        footerImplementation: await testFooterImplementation()
    };
    
    log('\n📊 Test Results Summary:', 'bold');
    log('================================', 'bold');
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    log(`Server Health: ${results.serverHealth ? '✅ PASS' : '❌ FAIL'}`, results.serverHealth ? 'green' : 'red');
    log(`Token Request Fix: ${results.tokenRequest ? '✅ PASS' : '❌ FAIL'}`, results.tokenRequest ? 'green' : 'red');
    log(`Footer Implementation: ${results.footerImplementation ? '✅ PASS' : '❌ FAIL'}`, results.footerImplementation ? 'green' : 'red');
    
    log('\n================================', 'bold');
    log(`Overall Result: ${passed}/${total} tests passed`, passed === total ? 'green' : 'red');
    
    if (passed === total) {
        log('\n🎉 All tests passed! The fixes are working correctly.', 'green');
        log('✅ Token request no longer returns "Target URL is required"', 'green');
        log('✅ PingIdentity logo and trademark are properly displayed in footer', 'green');
    } else {
        log('\n⚠️  Some tests failed. Please check the implementation.', 'yellow');
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