import { TestHelper } from './test-utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testModify() {
    const helper = new TestHelper();
    
    console.log('🚀 Starting modify test...');
    
    // 1. Authenticate
    console.log('🔐 Authenticating...');
    const isAuthenticated = await helper.authenticate();
    if (!isAuthenticated) {
        console.error('❌ Authentication failed');
        return;
    }
    console.log('✅ Authenticated successfully');

    // 2. First, export users to get some user IDs to modify
    console.log('📥 Getting users for modification test...');
    const exportResponse = await helper.makeRequest(
        '/export-users', 
        'POST', 
        {
            populationId: process.env.TEST_POPULATION_ID,
            format: 'json',
            fields: 'basic'
        }
    );

    if (!exportResponse.ok || !exportResponse.data || exportResponse.data.length === 0) {
        console.error('❌ No users found for modification test');
        return;
    }

    // 3. Prepare test data (modify first 2 users)
    const usersToModify = exportResponse.data.slice(0, 2);
    console.log(`✏️ Found ${usersToModify.length} users to modify`);

    // 4. Create a CSV file with user updates
    let modifyCsv = 'id,givenName,surname,email\n';
    usersToModify.forEach((user, index) => {
        const newName = `Modified${index + 1}`;
        modifyCsv += `${user.id},${newName},User,${user.email}\n`;
    });
    
    const tempFilePath = path.join(__dirname, 'temp-modify.csv');
    fs.writeFileSync(tempFilePath, modifyCsv);
    
    try {
        // 5. Create form data
        const formData = new FormData();
        formData.append('file', fs.createReadStream(tempFilePath));
        formData.append('dryRun', 'false');
        
        // 6. Make the modify request
        console.log('✏️ Sending modify request...');
        const response = await fetch('http://localhost:4000/api/modify-users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${helper.token}`,
                ...formData.getHeaders()
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Modify successful!');
            console.log('Modify results:', {
                total: data.results.total,
                succeeded: data.results.succeeded,
                failed: data.results.failed,
                details: data.results.details
            });
            
            // 7. Verify the changes
            console.log('🔍 Verifying changes...');
            const verifyResponse = await helper.makeRequest(
                '/export-users', 
                'POST', 
                {
                    populationId: process.env.TEST_POPULATION_ID,
                    format: 'json',
                    fields: 'all',
                    userIds: usersToModify.map(u => u.id)
                }
            );
            
            if (verifyResponse.ok) {
                console.log('✅ Verification results:');
                verifyResponse.data.forEach((user, index) => {
                    console.log(`  User ${index + 1}:`);
                    console.log(`    Original Name: ${usersToModify[index].name?.given || 'N/A'}`);
                    console.log(`    New Name: ${user.name?.given || 'N/A'}`);
                });
            }
        } else {
            console.error('❌ Modify failed:', data.error || 'Unknown error');
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

testModify();
