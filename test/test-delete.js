import { TestHelper } from './test-utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testDelete() {
    const helper = new TestHelper();
    
    console.log('🚀 Starting delete test...');
    
    // 1. Authenticate
    console.log('🔐 Authenticating...');
    const isAuthenticated = await helper.authenticate();
    if (!isAuthenticated) {
        console.error('❌ Authentication failed');
        return;
    }
    console.log('✅ Authenticated successfully');

    // 2. First, export users to get some user IDs to delete
    console.log('📥 Getting users for deletion test...');
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
        console.error('❌ No users found for deletion test');
        return;
    }

    // 3. Prepare test data (delete first 2 users)
    const usersToDelete = exportResponse.data.slice(0, 2);
    console.log(`🗑️ Found ${usersToDelete.length} users to delete`);

    // 4. Create a CSV file with users to delete
    const deleteCsv = usersToDelete.map(user => user.id).join('\n');
    const tempFilePath = path.join(__dirname, 'temp-delete.csv');
    fs.writeFileSync(tempFilePath, deleteCsv);
    
    try {
        // 5. Create form data
        const formData = new FormData();
        formData.append('file', fs.createReadStream(tempFilePath));
        formData.append('type', 'csv');
        
        // 6. Make the delete request
        console.log('🗑️ Sending delete request...');
        const response = await fetch('http://localhost:4000/api/delete-users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${helper.token}`,
                ...formData.getHeaders()
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Delete successful!');
            console.log('Delete results:', {
                total: data.totalUsers,
                deleted: data.deletedCount,
                failed: data.failedCount,
                errors: data.errors
            });
        } else {
            console.error('❌ Delete failed:', data.error || 'Unknown error');
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

testDelete();
