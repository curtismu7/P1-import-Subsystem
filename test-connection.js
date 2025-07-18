import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testConnection() {
    console.log('🔍 Testing PingOne connection...');
    
    // Remove the leading dot from the region if present
    const region = process.env.PINGONE_REGION.startsWith('.') 
        ? process.env.PINGONE_REGION.substring(1)
        : process.env.PINGONE_REGION;
    
    const tokenUrl = `https://auth.pingone.${region}/b9817c16-9910-4415-b67e-4ac687da74d9/as/token`;
    
    console.log('🔧 Configuration:');
    console.log(`- Environment ID: ${process.env.PINGONE_ENVIRONMENT_ID}`);
    console.log(`- Client ID: ${process.env.PINGONE_CLIENT_ID}`);
    console.log(`- Region: ${region}`);
    console.log(`- Token URL: ${tokenUrl}`);
    
    try {
        console.log('\n🔌 Testing connection to PingOne...');
        const response = await fetch(tokenUrl, {
            method: 'HEAD',
            timeout: 10000 // 10 second timeout
        });
        
        console.log(`✅ Connection successful! Status: ${response.status}`);
        console.log('\n🔑 Testing authentication...');
        
        // Test authentication
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
        
        const authData = await authResponse.json();
        
        if (authResponse.ok) {
            console.log('✅ Authentication successful!');
            console.log('Token Type:', authData.token_type);
            console.log('Expires In:', authData.expires_in, 'seconds');
            return true;
        } else {
            console.error('❌ Authentication failed:', authData);
            return false;
        }
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Check your internet connection');
        console.log('2. Verify the PINGONE_REGION in .env is correct');
        console.log('3. Check if you need a VPN to access PingOne services');
        console.log('4. Try pinging the domain: ping auth.pingone.' + region);
        return false;
    }
}

testConnection().then(success => {
    process.exit(success ? 0 : 1);
});
