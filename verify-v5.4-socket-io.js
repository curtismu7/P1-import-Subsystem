#!/usr/bin/env node

/**
 * Verification script for v5.4 Socket.IO and WebSocket implementation
 * Tests all the new real-time communication features
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000';

async function testHealthEndpoint() {
    console.log('🔍 Testing health endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/api/health`);
        const data = await response.json();
        
        if (data.status === 'ok') {
            console.log('✅ Health endpoint working');
            return true;
        } else {
            console.log('❌ Health endpoint failed');
            return false;
        }
    } catch (error) {
        console.log('❌ Health endpoint error:', error.message);
        return false;
    }
}

async function testSocketIOEndpoint() {
    console.log('🔍 Testing Socket.IO endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/socket.io/`);
        const data = await response.text();
        
        if (data.includes('Transport unknown') || data.includes('{"code":0')) {
            console.log('✅ Socket.IO endpoint working');
            return true;
        } else {
            console.log('❌ Socket.IO endpoint failed');
            return false;
        }
    } catch (error) {
        console.log('❌ Socket.IO endpoint error:', error.message);
        return false;
    }
}

async function testImportEndpoint() {
    console.log('🔍 Testing import endpoint...');
    try {
        // Create a simple test CSV
        const testCsv = 'username,email,firstName,lastName\ntestuser,test@example.com,Test,User';
        const blob = new Blob([testCsv], { type: 'text/csv' });
        
        const formData = new FormData();
        formData.append('file', blob, 'test.csv');
        formData.append('populationId', 'test-population');
        formData.append('populationName', 'Test Population');
        formData.append('totalUsers', '1');
        
        const response = await fetch(`${BASE_URL}/api/import`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.sessionId) {
                console.log('✅ Import endpoint working, session ID:', data.sessionId);
                return data.sessionId;
            } else {
                console.log('❌ Import endpoint returned invalid response');
                return false;
            }
        } else {
            console.log('❌ Import endpoint failed:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Import endpoint error:', error.message);
        return false;
    }
}

async function testProgressEndpoint(sessionId) {
    console.log('🔍 Testing progress endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/api/import/progress/${sessionId}`);
        
        if (response.ok) {
            console.log('✅ Progress endpoint working');
            return true;
        } else {
            console.log('❌ Progress endpoint failed:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Progress endpoint error:', error.message);
        return false;
    }
}

async function testTestPage() {
    console.log('🔍 Testing Socket.IO test page...');
    try {
        const response = await fetch(`${BASE_URL}/test-socket-io.html`);
        
        if (response.ok) {
            const html = await response.text();
            if (html.includes('Socket.IO') && html.includes('WebSocket')) {
                console.log('✅ Socket.IO test page working');
                return true;
            } else {
                console.log('❌ Socket.IO test page missing expected content');
                return false;
            }
        } else {
            console.log('❌ Socket.IO test page failed:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Socket.IO test page error:', error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 Starting v5.4 Socket.IO and WebSocket verification...\n');
    
    const tests = [
        { name: 'Health Endpoint', fn: testHealthEndpoint },
        { name: 'Socket.IO Endpoint', fn: testSocketIOEndpoint },
        { name: 'Import Endpoint', fn: testImportEndpoint },
        { name: 'Socket.IO Test Page', fn: testTestPage }
    ];
    
    let sessionId = null;
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        console.log(`\n📋 Running: ${test.name}`);
        const result = await test.fn();
        
        if (result === true) {
            console.log(`✅ ${test.name}: PASSED`);
            passedTests++;
        } else if (result && typeof result === 'string') {
            console.log(`✅ ${test.name}: PASSED (session ID: ${result})`);
            sessionId = result;
            passedTests++;
        } else {
            console.log(`❌ ${test.name}: FAILED`);
        }
    }
    
    // Test progress endpoint if we have a session ID
    if (sessionId) {
        console.log('\n📋 Running: Progress Endpoint');
        const progressResult = await testProgressEndpoint(sessionId);
        if (progressResult) {
            console.log('✅ Progress Endpoint: PASSED');
            passedTests++;
        } else {
            console.log('❌ Progress Endpoint: FAILED');
        }
        totalTests++;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! v5.4 Socket.IO implementation is working correctly.');
        console.log('\n📝 Next steps:');
        console.log('1. Open http://localhost:4000 in your browser');
        console.log('2. Test the import functionality with a real CSV file');
        console.log('3. Monitor the browser console for Socket.IO connection status');
        console.log('4. Test the fallback mechanisms by blocking Socket.IO in dev tools');
    } else {
        console.log('⚠️  Some tests failed. Please check the server logs and try again.');
    }
    
    console.log('\n🔗 Test page: http://localhost:4000/test-socket-io.html');
    console.log('🔗 Main app: http://localhost:4000');
}

// Run the tests
runAllTests().catch(console.error); 