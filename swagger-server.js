#!/usr/bin/env node

/**
 * Dedicated Swagger UI Server
 * 
 * Serves Swagger UI on port 4004 while the main API runs on port 4000
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4004;

// Enable CORS for cross-origin requests to the main API
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

// Serve static files from the swagger directory
app.use('/swagger', express.static(path.join(__dirname, 'public', 'swagger')));

// Serve the main Swagger UI at the root
app.get('/', (req, res) => {
  res.redirect('/swagger/index.html');
});

// Health check for the Swagger server
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'swagger-ui',
    port: PORT,
    timestamp: new Date().toISOString(),
    mainApiUrl: 'http://localhost:4000'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Swagger UI Server started on port ${PORT}`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/swagger/index.html`);
  console.log(`🔗 Main API: http://localhost:4000`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Swagger UI Server shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Swagger UI Server shutting down...');
  process.exit(0);
});