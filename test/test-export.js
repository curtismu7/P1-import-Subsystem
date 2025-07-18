import { TestHelper } from './test-utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testExport() {
    const helper = new TestHelper();
    
    console.log('🚀 Starting export test...');
    
    // 1. Authenticate
    console.log('🔐 Authenticating...');
    const isAuthenticated = await helper.authenticate();
    if (!isAuthenticated) {
        console.error('❌ Authentication failed');
        return;
    }
    console.log('✅ Authenticated successfully');

    try {
        // Test JSON export
        console.log('\n📤 Testing JSON export...');
        const jsonResponse = await helper.makeRequest('/api/export-users', 'POST', {
            populationId: process.env.TEST_POPULATION_ID || '',
            format: 'json',
            fields: 'basic',
            ignoreDisabledUsers: true
        });
        
        console.log('✅ JSON export successful');
        console.log('   Total users:', jsonResponse.total || (Array.isArray(jsonResponse) ? jsonResponse.length : 'N/A'));
        
        // Test CSV export
        console.log('\n📤 Testing CSV export...');
        const csvResponse = await helper.makeRequest('/api/export-users', 'POST', {
            populationId: process.env.TEST_POPULATION_ID || '',
            format: 'csv',
            fields: 'basic',
            ignoreDisabledUsers: true
        });
        
        console.log('✅ CSV export successful');
        console.log('   Response length:', typeof csvResponse === 'string' ? csvResponse.length : 'N/A', 'bytes');
        
        // If we got here, both exports worked
        process.exit(0);
    } catch (error) {
        console.error('❌ Export test failed:', error.message);
        process.exit(1);
    }
}

testExport();
