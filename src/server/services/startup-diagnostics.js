/**
 * Enhanced Startup Diagnostics Service
 * 
 * Provides comprehensive startup and failure logging with actionable information
 * for debugging and monitoring server initialization.
 * 
 * @fileoverview Startup diagnostics and logging utilities
 * @version 7.0.0.2
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { STANDARD_KEYS, standardizeConfigKeys, createBackwardCompatibleConfig } from '../../utils/config-standardization.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Obfuscate sensitive values for logging
 * @param {string} value - The value to obfuscate
 * @param {number} visibleChars - Number of characters to show at the end
 * @returns {string} Obfuscated value
 */
function obfuscateSecret(value, visibleChars = 4) {
    if (!value || typeof value !== 'string') return '[NOT_SET]';
    if (value.length <= visibleChars) return '*'.repeat(value.length);
    return '*'.repeat(value.length - visibleChars) + value.slice(-visibleChars);
}

/**
 * Get application version from package.json
 * @returns {Promise<string>} Application version
 */
async function getApplicationVersion() {
    try {
        const packageJsonPath = path.resolve(__dirname, '../../../package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        return packageJson.version || '7.0.0.2';
    } catch (error) {
        return '7.0.0.2'; // Fallback version
    }
}

/**
 * Test token acquisition and return status
 * @param {Object} tokenService - Token service instance
 * @returns {Promise<Object>} Token status information
 */
async function getTokenStatus(tokenService) {
    try {
        const token = await tokenService.getToken();
        const status = tokenService.getTokenStatus();
        
        return {
            valid: true,
            acquired: true,
            expiresAt: status.expiresAt,
            expiresIn: status.expiresIn,
            environmentId: tokenService.tokenCache?.environmentId || 'unknown',
            region: tokenService.tokenCache?.region || 'unknown',
            error: null
        };
    } catch (error) {
        return {
            valid: false,
            acquired: false,
            expiresAt: null,
            expiresIn: null,
            environmentId: 'unknown',
            region: 'unknown',
            error: error.message
        };
    }
}

/**
 * Test API endpoints to ensure they're responsive
 * @param {number} port - Server port
 * @returns {Promise<Object>} API status information
 */
async function getAPIStatus(port) {
    const endpoints = [
        { name: 'Health', path: '/api/health' },
        { name: 'Version', path: '/api/version' },
        { name: 'Settings', path: '/api/settings' },
        { name: 'Logs UI', path: '/api/logs/ui?limit=1' }
    ];
    
    const results = {};
    const baseUrl = `http://localhost:${port}`;
    
    for (const endpoint of endpoints) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(`${baseUrl}${endpoint.path}`, {
                signal: controller.signal,
                headers: { 'User-Agent': 'StartupDiagnostics/7.0.0.2' }
            });
            
            clearTimeout(timeoutId);
            
            results[endpoint.name] = {
                responsive: true,
                status: response.status,
                statusText: response.statusText,
                error: null
            };
        } catch (error) {
            results[endpoint.name] = {
                responsive: false,
                status: null,
                statusText: null,
                error: error.message
            };
        }
    }
    
    return results;
}

/**
 * Get environment configuration with obfuscated secrets
 * @returns {Object} Environment configuration
 */
function getEnvironmentConfig() {
    return {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || '4000',
        
        // Standardized PingOne Configuration Keys
        [STANDARD_KEYS.CLIENT_ID]: obfuscateSecret(process.env.PINGONE_CLIENT_ID, 6),
        [STANDARD_KEYS.CLIENT_SECRET]: obfuscateSecret(process.env.PINGONE_CLIENT_SECRET, 4),
        [STANDARD_KEYS.ENVIRONMENT_ID]: obfuscateSecret(process.env.PINGONE_ENVIRONMENT_ID, 6),
        [STANDARD_KEYS.REGION]: process.env.PINGONE_REGION || '[NOT_SET]',
        
        // Legacy Environment Variables (for reference)
        PINGONE_CLIENT_ID: obfuscateSecret(process.env.PINGONE_CLIENT_ID, 6),
        PINGONE_CLIENT_SECRET: obfuscateSecret(process.env.PINGONE_CLIENT_SECRET, 4),
        PINGONE_ENVIRONMENT_ID: obfuscateSecret(process.env.PINGONE_ENVIRONMENT_ID, 6),
        PINGONE_REGION: process.env.PINGONE_REGION || '[NOT_SET]',
        
        AUTH_SUBSYSTEM_ENCRYPTION_KEY: obfuscateSecret(process.env.AUTH_SUBSYSTEM_ENCRYPTION_KEY, 4)
    };
}

/**
 * Generate startup recommendations based on configuration
 * @param {Object} config - Environment configuration
 * @param {Object} tokenStatus - Token status
 * @returns {Array<string>} Array of recommendations
 */
function generateStartupRecommendations(config, tokenStatus) {
    const recommendations = [];
    
    // Check for missing standardized environment variables
    if (config[STANDARD_KEYS.CLIENT_ID] === '[NOT_SET]') {
        recommendations.push('⚠️  Set PINGONE_CLIENT_ID in .env file');
        recommendations.push('📝 Use standardized key: ' + STANDARD_KEYS.CLIENT_ID);
    }
    
    if (config[STANDARD_KEYS.CLIENT_SECRET] === '[NOT_SET]') {
        recommendations.push('⚠️  Set PINGONE_CLIENT_SECRET in .env file');
        recommendations.push('📝 Use standardized key: ' + STANDARD_KEYS.CLIENT_SECRET);
    }
    
    if (config[STANDARD_KEYS.ENVIRONMENT_ID] === '[NOT_SET]') {
        recommendations.push('⚠️  Set PINGONE_ENVIRONMENT_ID in .env file');
        recommendations.push('📝 Use standardized key: ' + STANDARD_KEYS.ENVIRONMENT_ID);
    }
    
    if (config[STANDARD_KEYS.REGION] === '[NOT_SET]') {
        recommendations.push('⚠️  Set PINGONE_REGION in .env file (recommended: NA, EU, or AP)');
        recommendations.push('📝 Use standardized key: ' + STANDARD_KEYS.REGION);
    }
    
    // Check token status
    if (!tokenStatus.valid) {
        if (tokenStatus.error?.includes('credentials')) {
            recommendations.push('🔑 Verify PingOne API credentials are correct');
        }
        if (tokenStatus.error?.includes('environment')) {
            recommendations.push('🌍 Verify PingOne Environment ID is correct');
        }
        if (tokenStatus.error?.includes('region')) {
            recommendations.push('🗺️  Verify PingOne Region is correct (NA, EU, or AP)');
        }
        if (tokenStatus.error?.includes('network')) {
            recommendations.push('🌐 Check network connectivity to PingOne API');
        }
    }
    
    return recommendations;
}

/**
 * Log comprehensive startup success information
 * @param {Object} logger - Winston logger instance
 * @param {Object} options - Startup options
 */
export async function logStartupSuccess(logger, options = {}) {
    const {
        port,
        tokenService,
        startTime,
        serverUrl
    } = options;
    
    const timestamp = new Date().toISOString();
    const version = await getApplicationVersion();
    const duration = Date.now() - startTime;
    
    // Get comprehensive status information
    const [tokenStatus, apiStatus] = await Promise.all([
        getTokenStatus(tokenService),
        getAPIStatus(port)
    ]);
    
    const environmentConfig = getEnvironmentConfig();
    
    // Count responsive endpoints
    const responsiveEndpoints = Object.values(apiStatus).filter(ep => ep.responsive).length;
    const totalEndpoints = Object.keys(apiStatus).length;
    
    // Create comprehensive startup report
    const startupReport = {
        timestamp,
        version,
        status: 'SUCCESS',
        duration: `${duration}ms`,
        server: {
            url: serverUrl,
            port,
            environment: environmentConfig.NODE_ENV
        },
        token: {
            status: tokenStatus.valid ? 'VALID' : 'INVALID',
            acquired: tokenStatus.acquired,
            expiresAt: tokenStatus.expiresAt,
            expiresIn: tokenStatus.expiresIn,
            environmentId: tokenStatus.environmentId,
            region: tokenStatus.region,
            error: tokenStatus.error
        },
        api: {
            responsive: `${responsiveEndpoints}/${totalEndpoints}`,
            endpoints: apiStatus
        },
        environment: environmentConfig
    };
    
    // Log structured data
    logger.info('🚀 SERVER STARTUP SUCCESS', startupReport);

    // Colorized output using chalk
    let chalk;
    try {
        chalk = (await import('chalk')).default;
    } catch (e) {
        chalk = null;
    }

    const color = (type, text) => {
        if (!chalk) return text;
        switch (type) {
            case 'success': return chalk.green(text);
            case 'error': return chalk.red(text);
            case 'warn': return chalk.yellow(text);
            case 'info': return chalk.cyan(text);
            case 'title': return chalk.bold.blue(text);
            default: return text;
        }
    };

    // Human-readable console output
    console.log('\n' + color('title', '='.repeat(80)));
    console.log(color('title', '🚀 PINGONE IMPORT TOOL - SERVER STARTUP SUCCESS'));
    console.log(color('title', '='.repeat(80)));
    console.log(color('info', `📅 Timestamp: ${timestamp}`));
    console.log(color('info', `🏷️  Version: ${version}`));
    console.log(color('info', `⏱️  Startup Duration: ${duration}ms`));
    console.log(color('info', `🌐 Server URL: ${serverUrl}`));
    console.log(color('info', `🔌 Port: ${port}`));
    console.log(color('info', `🌍 Environment: ${environmentConfig.NODE_ENV}`));

    // Token status
    console.log('\n' + color('title', '🔑 TOKEN STATUS:'));
    if (tokenStatus.valid) {
        console.log(color('success', `   ✅ Status: VALID`));
        console.log(color('info', `   🏢 Environment ID: ${tokenStatus.environmentId}`));
        console.log(color('info', `   🗺️  Region: ${tokenStatus.region}`));
        console.log(color('info', `   ⏰ Expires: ${tokenStatus.expiresAt}`));
        console.log(color('info', `   ⏳ Expires In: ${tokenStatus.expiresIn}`));
    } else {
        console.log(color('error', `   ❌ Status: INVALID`));
        console.log(color('error', `   🚨 Error: ${tokenStatus.error}`));
    }

    // API endpoints status
    console.log('\n' + color('title', '📡 API ENDPOINTS STATUS:'));
    console.log(color('info', `   📊 Responsive: ${responsiveEndpoints}/${totalEndpoints}`));
    for (const [name, status] of Object.entries(apiStatus)) {
        const icon = status.responsive ? color('success', '✅') : color('error', '❌');
        const statusText = status.responsive ? color('success', `${status.status} ${status.statusText}`) : color('error', status.error);
        console.log(`   ${icon} ${name}: ${statusText}`);
    }

    // Environment configuration
    console.log('\n' + color('title', '🔧 ENVIRONMENT CONFIGURATION:'));
    for (const [key, value] of Object.entries(environmentConfig)) {
        const icon = value === '[NOT_SET]' ? color('warn', '⚠️ ') : color('success', '✅');
        const val = value === '[NOT_SET]' ? color('warn', value) : color('info', value);
        console.log(`   ${icon} ${key}: ${val}`);
    }

    // Startup Recommendations
    const recommendations = generateStartupRecommendations(environmentConfig, tokenStatus);
    if (recommendations.length > 0) {
        console.log('\n' + color('title', '📝 STARTUP RECOMMENDATIONS:'));
        recommendations.forEach(rec => {
            console.log(color('warn', `   ${rec}`));
        });
    }

    console.log('\n' + color('title', '='.repeat(80)));
    console.log(color('success', '🎉 SERVER READY - All systems operational!'));
    console.log(color('title', '='.repeat(80)) + '\n');
}

/**
 * Log comprehensive startup failure information
 * @param {Object} logger - Winston logger instance
 * @param {Error} error - The startup error
 * @param {Object} options - Startup options
 */
export async function logStartupFailure(logger, error, options = {}) {
    const {
        port,
        startTime,
        tokenService
    } = options;
    
    const timestamp = new Date().toISOString();
    const version = await getApplicationVersion();
    const duration = startTime ? Date.now() - startTime : 'unknown';
    
    const environmentConfig = getEnvironmentConfig();
    const recommendations = generateStartupRecommendations(environmentConfig, { valid: false, error: error.message });
    
    // Try to get token status if service is available
    let tokenStatus = { valid: false, error: 'Token service unavailable' };
    if (tokenService) {
        try {
            tokenStatus = await getTokenStatus(tokenService);
        } catch (tokenError) {
            tokenStatus.error = tokenError.message;
        }
    }
    
    // Create comprehensive failure report
    const failureReport = {
        timestamp,
        version,
        status: 'FAILURE',
        duration: typeof duration === 'number' ? `${duration}ms` : duration,
        error: {
            message: error.message,
            code: error.code,
            stack: error.stack
        },
        server: {
            port,
            environment: environmentConfig.NODE_ENV
        },
        token: tokenStatus,
        environment: environmentConfig,
        recommendations
    };
    
    // Log structured data
    logger.error('💥 SERVER STARTUP FAILURE', failureReport);
    
    // Log human-readable console output
    console.log('\n' + '='.repeat(80));
    console.log('💥 PINGONE IMPORT TOOL - SERVER STARTUP FAILURE');
    console.log('='.repeat(80));
    console.log(`📅 Timestamp: ${timestamp}`);
    console.log(`🏷️  Version: ${version}`);
    console.log(`⏱️  Startup Duration: ${duration}`);
    console.log(`🔌 Port: ${port || 'unknown'}`);
    console.log(`🌍 Environment: ${environmentConfig.NODE_ENV}`);
    
    console.log('\n🚨 ERROR DETAILS:');
    console.log(`   💬 Message: ${error.message}`);
    if (error.code) {
        console.log(`   🔢 Code: ${error.code}`);
    }
    if (error.stack) {
        console.log(`   📚 Stack Trace:`);
        console.log(error.stack.split('\n').map(line => `      ${line}`).join('\n'));
    }
    
    console.log('\n🔑 TOKEN STATUS:');
    if (tokenStatus.valid) {
        console.log(`   ✅ Status: VALID`);
    } else {
        console.log(`   ❌ Status: INVALID`);
        console.log(`   🚨 Error: ${tokenStatus.error}`);
    }
    
    console.log('\n🔧 ENVIRONMENT CONFIGURATION:');
    for (const [key, value] of Object.entries(environmentConfig)) {
        const icon = value === '[NOT_SET]' ? '⚠️ ' : '✅';
        console.log(`   ${icon} ${key}: ${value}`);
    }
    
    if (recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:');
        recommendations.forEach(rec => console.log(`   ${rec}`));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('❌ SERVER STARTUP FAILED - Check the issues above');
    console.log('='.repeat(80) + '\n');
}

/**
 * Run automated startup tests
 * @param {Object} options - Test options
 * @returns {Promise<Object>} Test results
 */
export async function runStartupTests(options = {}) {
    const {
        port,
        tokenService
    } = options;
    
    const tests = {
        tokenAcquisition: { name: 'Token Acquisition', passed: false, error: null },
        apiEndpoints: { name: 'API Endpoints', passed: false, error: null },
        environmentConfig: { name: 'Environment Config', passed: false, error: null }
    };
    
    // Test 1: Token Acquisition
    try {
        const tokenStatus = await getTokenStatus(tokenService);
        tests.tokenAcquisition.passed = tokenStatus.valid;
        tests.tokenAcquisition.error = tokenStatus.error;
    } catch (error) {
        tests.tokenAcquisition.error = error.message;
    }
    
    // Test 2: API Endpoints
    try {
        const apiStatus = await getAPIStatus(port);
        const responsiveCount = Object.values(apiStatus).filter(ep => ep.responsive).length;
        tests.apiEndpoints.passed = responsiveCount >= 3; // At least 3 endpoints should be responsive
        tests.apiEndpoints.details = apiStatus;
    } catch (error) {
        tests.apiEndpoints.error = error.message;
    }
    
    // Test 3: Environment Configuration
    try {
        const config = getEnvironmentConfig();
        const requiredVars = ['PINGONE_CLIENT_ID', 'PINGONE_CLIENT_SECRET', 'PINGONE_ENVIRONMENT_ID'];
        const missingVars = requiredVars.filter(key => config[key] === '[NOT_SET]');
        tests.environmentConfig.passed = missingVars.length === 0;
        tests.environmentConfig.missingVars = missingVars;
    } catch (error) {
        tests.environmentConfig.error = error.message;
    }
    
    return tests;
}

export default {
    logStartupSuccess,
    logStartupFailure,
    runStartupTests,
    getTokenStatus,
    getAPIStatus,
    getEnvironmentConfig
};
