/**
 * Test App Factory
 * 
 * Creates isolated Express app instances for testing without
 * interfering with the main server or causing port conflicts.
 * 
 * @author PingOne Import Tool Team
 * @version 7.0.2.3
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

/**
 * Create a test Express app with minimal configuration
 * @returns {Express} Test app instance
 */
export async function createTestApp() {
    const app = express();
    
    // Basic middleware
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    app.use(cors());
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    }));
    
    // Import and mount API routes
    try {
        const apiRouter = await import('../../../routes/api/index.js');
        app.use('/api', apiRouter.default);
        
        // Add basic health endpoint if not included
        app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
        
        // 404 handler
        app.use('*', (req, res) => {
            res.status(404).json({ error: 'Route not found', path: req.originalUrl });
        });
        
        // Error handler
        app.use((err, req, res, next) => {
            res.status(500).json({ error: 'Internal server error', message: err.message });
        });
        
    } catch (error) {
        console.error('Error setting up test app:', error);
        throw error;
    }
    
    return app;
}

/**
 * Create a minimal test app for basic route testing
 * @returns {Express} Minimal test app
 */
export function createMinimalTestApp() {
    const app = express();
    
    app.use(express.json());
    
    // Basic test routes
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', test: true });
    });
    
    app.get('/api/version', (req, res) => {
        res.json({ version: '7.0.2.3', test: true });
    });
    
    return app;
}

export default {
    createTestApp,
    createMinimalTestApp
};
