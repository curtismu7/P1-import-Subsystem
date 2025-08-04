// Simple server for Import Maps prototype
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4001; // Different port from main app

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Mock API endpoints for testing
app.get('/api/settings', (req, res) => {
    res.json({
        environmentId: 'mock-env-id',
        clientId: 'mock-client-id',
        clientSecret: 'mock-secret',
        region: 'NA',
        populationId: 'mock-population-id'
    });
});

app.post('/api/settings', (req, res) => {
    console.log('Settings saved:', req.body);
    res.json({ success: true, message: 'Settings saved successfully' });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Serve the prototype
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Performance comparison endpoint
app.get('/api/performance', (req, res) => {
    res.json({
        importMaps: {
            supported: true,
            loadTime: Math.random() * 100 + 50, // Simulated
            moduleCount: 3
        },
        bundles: {
            supported: true,
            loadTime: Math.random() * 200 + 100, // Simulated
            buildTime: Math.random() * 3000 + 1000
        }
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Import Maps Prototype Server running on http://localhost:${PORT}`);
    console.log(`📊 Performance comparison available at http://localhost:${PORT}`);
    console.log(`🔧 Mock API endpoints:`);
    console.log(`   GET  /api/settings`);
    console.log(`   POST /api/settings`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/performance`);
});

export default app;
