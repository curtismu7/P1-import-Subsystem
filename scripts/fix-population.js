#!/usr/bin/env node

/**
 * PingOne Population ID Fixer
 * 
 * This script automatically fetches the default population from PingOne
 * and updates both settings.json and .env files with the correct population ID.
 * 
 * Usage: node scripts/fix-population.js
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { URLSearchParams } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function getAccessToken(clientId, clientSecret, environmentId, region = 'NorthAmerica') {
    // Get region-specific auth domain
    const getAuthDomain = (region) => {
        const domainMap = {
            'NorthAmerica': 'auth.pingone.com',
            'Europe': 'auth.eu.pingone.com',
            'Canada': 'auth.ca.pingone.com',
            'Asia': 'auth.apsoutheast.pingone.com',
            'Australia': 'auth.aus.pingone.com',
            'US': 'auth.pingone.com',
            'EU': 'auth.eu.pingone.com',
            'AP': 'auth.apsoutheast.pingone.com'
        };
        return domainMap[region] || 'auth.pingone.com';
    };
    
    const authDomain = getAuthDomain(region);
    const tokenUrl = `https://${authDomain}/${environmentId}/as/token`;
    console.log(`Using token URL: ${tokenUrl} (region: ${region})`);
    
    const postData = new URLSearchParams({ 'grant_type': 'client_credentials' }).toString();
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    return new Promise((resolve, reject) => {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(tokenUrl, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.access_token) {
                        resolve(response.access_token);
                    } else {
                        reject(new Error(`Token request failed: ${data}`));
                    }
                } catch (error) {
                    reject(new Error(`Invalid JSON response: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function getPopulations(accessToken, environmentId, region = 'NorthAmerica') {
    // Get region-specific API domain
    const getApiDomain = (region) => {
        const domainMap = {
            'NorthAmerica': 'api.pingone.com',
            'Europe': 'api.eu.pingone.com',
            'Canada': 'api.ca.pingone.com',
            'Asia': 'api.apsoutheast.pingone.com',
            'Australia': 'api.aus.pingone.com',
            'US': 'api.pingone.com',
            'EU': 'api.eu.pingone.com',
            'AP': 'api.apsoutheast.pingone.com'
        };
        return domainMap[region] || 'api.pingone.com';
    };
    
    const apiDomain = getApiDomain(region);
    const apiUrl = `https://${apiDomain}/v1/environments/${environmentId}/populations`;
    console.log(`Using API URL: ${apiUrl} (region: ${region})`);
    
    
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(apiUrl, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    reject(new Error(`Invalid JSON response: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function main() {
    try {
        console.log('🔧 PingOne Population ID Fixer');
        console.log('==============================\n');
        
        // Read environment variables
        const envPath = path.join(projectRoot, '.env');
        const envContent = await fs.readFile(envPath, 'utf8');
        
        const envVars = {};
        envContent.split('\n').forEach(line => {
            if (line.trim() && !line.startsWith('#')) {
                const [key, value] = line.split('=');
                if (key && value) {
                    envVars[key.trim()] = value.trim();
                }
            }
        });

        const clientId = envVars.PINGONE_CLIENT_ID;
        const clientSecret = envVars.PINGONE_CLIENT_SECRET;
        const environmentId = envVars.PINGONE_ENVIRONMENT_ID;
        const region = envVars.PINGONE_REGION || 'NorthAmerica';

        if (!clientId || !clientSecret || !environmentId) {
            throw new Error('Missing required environment variables in .env file');
        }

        console.log('🔑 Authenticating with PingOne...');
        const accessToken = await getAccessToken(clientId, clientSecret, environmentId, region);
        console.log('✅ Authentication successful\n');

        console.log('👥 Fetching available populations...');
        const populationsResponse = await getPopulations(accessToken, environmentId, region);
        
        if (!populationsResponse._embedded || !populationsResponse._embedded.populations) {
            throw new Error('No populations found in the environment');
        }

        const populations = populationsResponse._embedded.populations;
        console.log(`📊 Found ${populations.length} population(s):\n`);
        
        populations.forEach((pop, index) => {
            console.log(`  ${index + 1}. ${pop.name}`);
            console.log(`     ID: ${pop.id}`);
            console.log(`     Users: ${pop.userCount || 0}\n`);
        });

        // Use the first population as default
        const defaultPopulation = populations[0];
        console.log(`🎯 Using: ${defaultPopulation.name} (${defaultPopulation.id})\n`);

        // Update settings.json
        const settingsPath = path.join(projectRoot, 'data/settings.json');
        const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
        
        const oldPopulationId = settings.populationId;
        settings.populationId = defaultPopulation.id;
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
        console.log('✅ Updated data/settings.json');

        // Update .env file
        const lines = envContent.split('\n');
        let updatedLines = [];
        let foundPopulationLine = false;

        for (const line of lines) {
            if (line.startsWith('PINGONE_POPULATION_ID=')) {
                updatedLines.push(`PINGONE_POPULATION_ID=${defaultPopulation.id}`);
                foundPopulationLine = true;
            } else {
                updatedLines.push(line);
            }
        }

        if (!foundPopulationLine) {
            updatedLines.push(`PINGONE_POPULATION_ID=${defaultPopulation.id}`);
        }

        await fs.writeFile(envPath, updatedLines.join('\n'));
        console.log('✅ Updated .env file\n');

        console.log('🎉 Population ID configuration updated successfully!');
        console.log('─'.repeat(50));
        console.log(`Environment ID: ${environmentId}`);
        console.log(`Population ID:  ${defaultPopulation.id}`);
        console.log(`Population:     ${defaultPopulation.name}`);
        console.log(`User Count:     ${defaultPopulation.userCount || 0}`);
        
        if (oldPopulationId && oldPopulationId !== defaultPopulation.id) {
            console.log(`\n⚠️  Changed from: ${oldPopulationId}`);
        }
        
        console.log('\n💡 Please restart your server to pick up the changes.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main(); 