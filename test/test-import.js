import { TestHelper } from './test-utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testImport() {
    const helper = new TestHelper();
    
    console.log('🚀 Starting import test...');
    
    // 1. Authenticate
    console.log('🔐 Authenticating...');
    const isAuthenticated = await helper.authenticate();
    if (!isAuthenticated) {
        console.error('❌ Authentication failed');
        return;
    }
    console.log('✅ Authenticated successfully');

    // 2. Prepare test data
    const testCsv = `email,givenName,surname,enabled,populationId
test.user1@example.com,Test,User1,true,${process.env.TEST_POPULATION_ID}
test.user2@example.com,Test,User2,true,${process.env.TEST_POPULATION_ID}`;
    
    // 3. Create a temporary CSV file
    const tempFilePath = path.join(__dirname, 'temp-import.csv');
    fs.writeFileSync(tempFilePath, testCsv);
    
    try {
        // 4. Create form data
        const formData = new FormData();
        formData.append('file', fs.createReadStream(tempFilePath));
        formData.append('populationId', process.env.TEST_POPULATION_ID);
        formData.append('sendActivationEmail', 'false');
        
        // 5. Make the request
        console.log('📤 Sending import request...');
        const response = await fetch('http://localhost:4000/api/import', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${helper.token}`,
                ...formData.getHeaders()
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Import successful!');
            console.log('Import results:', {
                total: data.total,
                created: data.created,
                updated: data.updated,
                failed: data.failed,
                sessionId: data.sessionId
            });
            
            // 6. Check import status
            if (data.sessionId) {
                console.log('🔍 Checking import status...');
                const statusResponse = await helper.makeRequest(`/import/status/${data.sessionId}`);
                console.log('Import status:', statusResponse.data);
            }
        } else {
            console.error('❌ Import failed:', data.error || 'Unknown error');
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        // Clean up
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
}

testImport();
