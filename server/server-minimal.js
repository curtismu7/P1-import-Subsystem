#!/usr/bin/env node

/**
 * Minimal Server - PingOne User Import Tool
 * 
 * A simplified server that avoids Winston logger issues
 * for development and testing purposes.
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple console logger
const logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || '')
};

// Simple credential decryption for minimal server
async function decryptCredential(encryptedValue) {
    if (!encryptedValue || !encryptedValue.startsWith('enc:')) {
        return encryptedValue;
    }
    
    try {
        // Get encryption key from environment or use default
        const envKey = process.env.AUTH_SUBSYSTEM_ENCRYPTION_KEY;
        let key;
        
        if (envKey) {
            key = Buffer.from(envKey.padEnd(32).slice(0, 32));
        } else {
            // Use default key (same as credential encryptor)
            key = Buffer.from('PingOneImportToolDefaultEncryptionKey32'.slice(0, 32));
        }
        
        // Remove 'enc:' prefix
        const data = encryptedValue.substring(4);
        
        // Split IV and encrypted data
        const parts = data.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        
        // Decrypt using AES-256-CBC
        const crypto = await import('crypto');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        logger.error('Decryption failed:', error.message);
        throw new Error('Failed to decrypt credential');
    }
}

// Auto-set PingOne environment variables from settings.json on server startup
async function setPingOneEnvVars() {
    try {
        const settingsPath = path.resolve(process.cwd(), 'data/settings.json');
        try {
            await fs.access(settingsPath);
            const settingsRaw = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsRaw);
            
            // Decrypt client secret if it's encrypted
            let clientSecret = settings.pingone_client_secret || '';
            if (clientSecret.startsWith('enc:')) {
                try {
                    clientSecret = await decryptCredential(clientSecret);
                    logger.info('[PingOne ENV] Successfully decrypted client secret');
                } catch (decryptError) {
                    logger.error('[PingOne ENV] Failed to decrypt client secret:', decryptError.message);
                    logger.warn('[PingOne ENV] Using encrypted value as-is (may cause API issues)');
                }
            }
            
            process.env.PINGONE_ENVIRONMENT_ID = settings.pingone_environment_id || '';
            process.env.PINGONE_CLIENT_ID = settings.pingone_client_id || '';
            process.env.PINGONE_CLIENT_SECRET = clientSecret;
            process.env.PINGONE_REGION = settings.pingone_region || 'NorthAmerica';
            
            logger.info('[PingOne ENV] Environment variables set from settings.json.');
            logger.info(`[PingOne ENV] Environment ID: ${process.env.PINGONE_ENVIRONMENT_ID ? 'Set' : 'Not set'}`);
            logger.info(`[PingOne ENV] Client ID: ${process.env.PINGONE_CLIENT_ID ? 'Set' : 'Not set'}`);
            logger.info(`[PingOne ENV] Client Secret: ${process.env.PINGONE_CLIENT_SECRET ? 'Set' : 'Not set'}`);
            logger.info(`[PingOne ENV] Region: ${process.env.PINGONE_REGION}`);
            
        } catch {
            logger.info('[PingOne ENV] settings.json not found. Environment variables not set.');
        }
    } catch (error) {
        logger.error('[PingOne ENV] Failed to set environment variables from settings.json:', error.message);
    }
}

await setPingOneEnvVars();

// Core dependencies
import express from 'express';
import http from 'http';
import cors from 'cors';

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const memoryUsage = process.memoryUsage();
        const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal * 100).toFixed(2);
        
        const response = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '7.4.6.1',
            uptime: process.uptime(),
            memory: {
                rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
                heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
                heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
                percentUsed: parseFloat(memoryUsagePercent)
            },
            checks: {
                memory: memoryUsagePercent < 90 ? 'ok' : 'warn'
            }
        };

        res.json(response);
    } catch (error) {
        logger.error('Health check failed', { error: error.message });
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Basic status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        data: {
            status: 'running',
            uptime: process.uptime(),
            version: '7.4.6.1',
            timestamp: new Date().toISOString()
        }
    });
});

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
        url: req.originalUrl,
        method: req.method
    });

    res.status(500).json({
        status: 'error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    try {
        server.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });
        
        // Force shutdown after timeout
        setTimeout(() => {
            logger.warn('Forcing shutdown after timeout');
            process.exit(1);
        }, 10000);
        
    } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
    }
};

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
const startServer = async () => {
    try {
        const port = process.env.PORT || 4000;
        
        server.listen(port, () => {
            const serverUrl = `http://localhost:${port}`;
            logger.info(`🚀 Minimal server is running on ${serverUrl}`);
            logger.info(`📊 Health check: ${serverUrl}/api/health`);
            logger.info(`📋 Status: ${serverUrl}/api/status`);
        });
        
    } catch (error) {
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
};

// Start the server
startServer().catch(error => {
    logger.error('Fatal error during server startup', { error: error.message });
    process.exit(1);
});
