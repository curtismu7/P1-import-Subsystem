import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testApi() {
    console.log('🚀 Testing PingOne API directly...');
    
    // 1. Get an access token
    console.log('\n🔑 Getting access token...');
    const tokenUrl = `https://auth.pingone.com/${process.env.PINGONE_ENVIRONMENT_ID}/as/token`;
    
    const authResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(
                `${process.env.PINGONE_CLIENT_ID}:${process.env.PINGONE_CLIENT_SECRET}`
            ).toString('base64')
        },
        body: 'grant_type=client_credentials&scope=pingone_api',
        timeout: 10000
    });
    
    if (!authResponse.ok) {
        const error = await authResponse.text();
        console.error('❌ Failed to get access token:', error);
        return;
    }
    
    const authData = await authResponse.json();
    const accessToken = authData.access_token;
    console.log('✅ Got access token');
    
    // 2. Test the export endpoint
    console.log('\n📤 Testing export endpoint...');
    const exportUrl = `https://api.pingone.com/v1/environments/${process.env.PINGONE_ENVIRONMENT_ID}/export-users`;
    
    const exportResponse = await fetch(exportUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            populationId: process.env.TEST_POPULATION_ID,
            format: 'json',
            fields: 'basic'
        })
    });
    
    if (!exportResponse.ok) {
        const error = await exportResponse.text();
        console.error('❌ Export failed:', error);
    } else {
        const result = await exportResponse.json();
        console.log('✅ Export successful:', result);
    }
    
    // 3. Test getting users
    console.log('\n👥 Testing get users endpoint...');
    const usersUrl = `https://api.pingone.com/v1/environments/${process.env.PINGONE_ENVIRONMENT_ID}/users`;
    
    const usersResponse = await fetch(usersUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    
    if (!usersResponse.ok) {
        const error = await usersResponse.text();
        console.error('❌ Get users failed:', error);
    } else {
        const users = await usersResponse.json();
        console.log(`✅ Found ${users._embedded?.users?.length || 0} users`);
    }
}

testApi().catch(console.error);
