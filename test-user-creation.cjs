#!/usr/bin/env node

/**
 * Test script to investigate user creation issues
 * This script will test creating a single user directly via PingOne API
 */

const fs = require('fs');
const path = require('path');

// Load settings
const settingsPath = path.join(__dirname, 'data', 'settings.json');
let settings = {};

try {
    const settingsData = fs.readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(settingsData);
    console.log('✅ Settings loaded successfully');
} catch (error) {
    console.error('❌ Failed to load settings:', error.message);
    process.exit(1);
}

// Test user data
const testUser = {
    username: 'uniquetestuser' + Date.now(), // Make it truly unique
    email: 'uniquetestuser' + Date.now() + '@test.com',
    givenName: 'Alice',
    familyName: 'Johnson',
    population: {
        id: 'af772f0d-9b92-4fda-a8c4-b18199ac5f07' // NewUsers population
    }
};

async function getAccessToken() {
    const authUrl = `https://auth.pingone.com/${settings['environment-id']}/as/token`;
    const credentials = Buffer.from(`${settings['api-client-id']}:${settings['api-secret']}`).toString('base64');
    
    const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    
    if (!response.ok) {
        throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.access_token;
}

async function checkIfUserExists(token, username) {
    const environmentId = settings['environment-id'];
    const checkUrl = `https://api.pingone.com/v1/environments/${environmentId}/users?username=${encodeURIComponent(username)}`;
    
    console.log(`🔍 Checking if user exists: ${username}`);
    console.log(`🔗 URL: ${checkUrl}`);
    
    const response = await fetch(checkUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
        const data = await response.json();
        console.log(`📋 Response data:`, JSON.stringify(data, null, 2));
        
        if (data._embedded && data._embedded.users && data._embedded.users.length > 0) {
            console.log(`❌ User ${username} already exists!`);
            return true;
        } else {
            console.log(`✅ User ${username} does not exist`);
            return false;
        }
    } else {
        console.log(`⚠️ Check failed: ${response.status} ${response.statusText}`);
        return false;
    }
}

async function createUser(token, userData) {
    const environmentId = settings['environment-id'];
    const createUrl = `https://api.pingone.com/v1/environments/${environmentId}/users`;
    
    console.log(`🚀 Creating user: ${userData.username}`);
    console.log(`🔗 URL: ${createUrl}`);
    console.log(`📦 User data:`, JSON.stringify(userData, null, 2));
    
    const response = await fetch(createUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    });
    
    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
        const data = await response.json();
        console.log(`✅ User created successfully!`);
        console.log(`📋 Response data:`, JSON.stringify(data, null, 2));
        return true;
    } else {
        const errorText = await response.text();
        console.log(`❌ User creation failed!`);
        console.log(`📋 Error response:`, errorText);
        
        try {
            const errorData = JSON.parse(errorText);
            console.log(`🔍 Parsed error:`, JSON.stringify(errorData, null, 2));
        } catch (e) {
            console.log(`⚠️ Could not parse error response as JSON`);
        }
        
        return false;
    }
}

async function testPopulationAccess(token) {
    const environmentId = settings['environment-id'];
    const populationId = 'af772f0d-9b92-4fda-a8c4-b18199ac5f07';
    const populationUrl = `https://api.pingone.com/v1/environments/${environmentId}/populations/${populationId}`;
    
    console.log(`🔍 Testing population access: ${populationId}`);
    console.log(`🔗 URL: ${populationUrl}`);
    
    const response = await fetch(populationUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    console.log(`📊 Population response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
        const data = await response.json();
        console.log(`✅ Population found:`, JSON.stringify(data, null, 2));
        return true;
    } else {
        const errorText = await response.text();
        console.log(`❌ Population access failed:`, errorText);
        return false;
    }
}

async function main() {
    try {
        console.log('🧪 Starting user creation test...\n');
        
        // Get access token
        console.log('🔑 Getting access token...');
        const token = await getAccessToken();
        console.log('✅ Access token obtained\n');
        
        // Test population access
        console.log('🏢 Testing population access...');
        const populationAccess = await testPopulationAccess(token);
        console.log('');
        
        if (!populationAccess) {
            console.log('❌ Cannot proceed - population access failed');
            return;
        }
        
        // Check if test user exists
        console.log('🔍 Step 1: Checking if test user exists...');
        const userExists = await checkIfUserExists(token, testUser.username);
        console.log('');
        
        if (userExists) {
            console.log('❌ Test user already exists - cannot test creation');
            return;
        }
        
        // Try to create the user
        console.log('🚀 Step 2: Attempting to create test user...');
        const created = await createUser(token, testUser);
        console.log('');
        
        if (created) {
            console.log('✅ Test completed successfully!');
        } else {
            console.log('❌ Test failed - user creation unsuccessful');
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
main(); 