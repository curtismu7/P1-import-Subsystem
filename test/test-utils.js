import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export class TestHelper {
    constructor(baseUrl = 'http://localhost:4000/api') {
        this.baseUrl = baseUrl;
        this.token = null;
    }

    async authenticate() {
        try {
            // Get a token directly from PingOne
            // Handle region format (with or without leading dot)
            const region = process.env.PINGONE_REGION.startsWith('.') 
                ? process.env.PINGONE_REGION.substring(1)
                : process.env.PINGONE_REGION;
                
            const tokenUrl = `https://auth.pingone.${region}/${process.env.PINGONE_ENVIRONMENT_ID}/as/token`;
            
            console.log(`🔑 Authenticating with URL: ${tokenUrl}`);
            
            const authHeader = 'Basic ' + Buffer.from(
                `${process.env.PINGONE_CLIENT_ID}:${process.env.PINGONE_CLIENT_SECRET}`
            ).toString('base64');
            
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': authHeader
                },
                body: 'grant_type=client_credentials&scope=pingone_api'
            });

            const data = await response.json();
            
            if (response.ok && data.access_token) {
                this.token = data.access_token;
                console.log('🔑 Successfully authenticated with PingOne');
                return true;
            } else {
                console.error('❌ Authentication failed:', data.error_description || 'Unknown error');
                console.log('Response status:', response.status, response.statusText);
                console.log('Response data:', data);
                return false;
            }
        } catch (error) {
            console.error('❌ Error during authentication:', error.message);
            return false;
        }
    }

    async makeRequest(endpoint, method = 'GET', body = null) {
        try {
            // Always get a fresh token for each request to ensure it's not expired
            const isAuthenticated = await this.authenticate();
            if (!isAuthenticated) {
                throw new Error('Unable to authenticate with PingOne');
            }

            // Build the URL - handle both full URLs and relative endpoints
            let url;
            if (endpoint.startsWith('http')) {
                url = endpoint;
            } else if (endpoint.startsWith('/api/')) {
                // For API routes that should go to our server
                url = `http://localhost:4000${endpoint}`;
            } else {
                // For direct PingOne API calls
                const baseUrl = `https://api.pingone.com/v1/environments/${process.env.PINGONE_ENVIRONMENT_ID}`;
                url = `${baseUrl}${endpoint}`;
            }
            
            console.log(`🌐 ${method} ${url}`);
            
            // Log the first few characters of the token for debugging
            const tokenPreview = this.token ? `${this.token.substring(0, 10)}...` : 'none';
            console.log(`🔑 Using token: ${tokenPreview}`);
            
            // Create headers object
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/json'
            };
            
            const options = {
                method,
                headers,
                body: body ? JSON.stringify(body) : null,
            };
            
            const response = await fetch(url, options);
            let data;
            
            // Handle empty responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (response.status === 204) { // No content
                data = {};
            } else {
                data = await response.text();
            }
            
            if (!response.ok) {
                console.error(`❌ Request failed (${response.status}):`, data);
                return {
                    ok: false,
                    status: response.status,
                    error: data.error_description || data.message || 'Request failed',
                    data: data
                };
            }
            
            console.log(`✅ Request successful (${response.status})`);
            return {
                ok: true,
                status: response.status,
                data: data,
                headers: Object.fromEntries(response.headers.entries())
            };
            
        } catch (error) {
            console.error('❌ Request error:', error.message);
            return {
                ok: false,
                error: error.message
            };
        }
    }
}

// ES Modules export is handled by the 'export' keyword above
