/**
 * Bulletproof Export API Tests
 * 
 * Comprehensive tests for the bulletproof export API to verify:
 * - Circuit breaker functionality
 * - Input validation
 * - Chunking for large exports
 * - Error handling
 * - Health monitoring
 * 
 * @version 6.5.2.4
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import bulletproofExportRouter from '../../routes/api/bulletproof-export.js';
import CircuitBreakerRegistry from '../../server/circuit-breaker.js';

// Mock dependencies
jest.mock('../../server/winston-config.js', () => ({
    createWinstonLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    })
}));

describe('Bulletproof Export API', () => {
    let app;
    
    beforeEach(() => {
        // Create a fresh Express app for each test
        app = express();
        app.use(express.json());
        app.use('/api/export', bulletproofExportRouter);
        
        // Reset circuit breaker state
        CircuitBreakerRegistry.reset();
    });
    
    describe('GET /api/export/status', () => {
        test('should return current export status', async () => {
            const response = await request(app).get('/api/export/status');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('isRunning');
            expect(response.body).toHaveProperty('progress');
            expect(response.body.progress).toHaveProperty('chunks');
        });
        
        test('should handle circuit breaker failures', async () => {
            // Force circuit breaker into open state
            const circuitBreaker = CircuitBreakerRegistry.getOrCreate('export-api');
            circuitBreaker._state.failureCount = 10;
            circuitBreaker._state.state = 'OPEN';
            
            const response = await request(app).get('/api/export/status');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error', 'Export service temporarily unavailable');
        });
    });
    
    describe('POST /api/export/start', () => {
        test('should start export operation with valid input', async () => {
            const exportData = {
                populationId: 'test-population',
                totalRecords: 5000,
                format: 'csv'
            };
            
            const response = await request(app)
                .post('/api/export/start')
                .send(exportData);
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('sessionId');
            expect(response.body).toHaveProperty('status', 'running');
            expect(response.body).toHaveProperty('chunks');
            expect(response.body.chunks).toHaveProperty('size', 1000); // Default chunk size for 5000 records
            expect(response.body.chunks).toHaveProperty('total', 5);
        });
        
        test('should reject invalid input', async () => {
            const invalidData = {
                // Missing required populationId
                totalRecords: -100, // Invalid negative value
                format: 'invalid-format' // Invalid format
            };
            
            const response = await request(app)
                .post('/api/export/start')
                .send(invalidData);
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('errors');
        });
        
        test('should prevent concurrent exports', async () => {
            // Start first export
            await request(app)
                .post('/api/export/start')
                .send({ populationId: 'test-population' });
            
            // Try to start second export
            const response = await request(app)
                .post('/api/export/start')
                .send({ populationId: 'another-population' });
            
            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error', 'Export operation already running');
        });
        
        test('should calculate optimal chunk size for different record counts', async () => {
            // Test with small record count
            let response = await request(app)
                .post('/api/export/start')
                .send({ populationId: 'test-small', totalRecords: 500 });
            
            expect(response.body.chunks.size).toBe(100);
            expect(response.body.chunks.total).toBe(5);
            
            // Reset export status
            await request(app).delete('/api/export/reset');
            
            // Test with medium record count
            response = await request(app)
                .post('/api/export/start')
                .send({ populationId: 'test-medium', totalRecords: 5000 });
            
            expect(response.body.chunks.size).toBe(1000);
            expect(response.body.chunks.total).toBe(5);
            
            // Reset export status
            await request(app).delete('/api/export/reset');
            
            // Test with large record count
            response = await request(app)
                .post('/api/export/start')
                .send({ populationId: 'test-large', totalRecords: 200000 });
            
            expect(response.body.chunks.size).toBe(5000);
            expect(response.body.chunks.total).toBe(40);
        });
    });
    
    describe('POST /api/export/progress', () => {
        test('should update export progress', async () => {
            // Start export
            await request(app)
                .post('/api/export/start')
                .send({ populationId: 'test-population', totalRecords: 1000 });
            
            // Update progress
            const progressData = {
                processed: 500,
                errors: 5,
                warnings: 10,
                chunkIndex: 4
            };
            
            const response = await request(app)
                .post('/api/export/progress')
                .send(progressData);
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('progress');
            expect(response.body.progress).toHaveProperty('current', 500);
            expect(response.body.progress).toHaveProperty('percentage', 50);
            expect(response.body.progress.chunks).toHaveProperty('processed', 5);
        });
        
        test('should reject invalid progress data', async () => {
            // Start export
            await request(app)
                .post('/api/export/start')
                .send({ populationId: 'test-population', totalRecords: 1000 });
            
            // Update with invalid progress data
            const invalidData = {
                processed: -100, // Invalid negative value
                errors: 'not-a-number' // Invalid type
            };
            
            const response = await request(app)
                .post('/api/export/progress')
                .send(invalidData);
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
        });
        
        test('should reject progress updates when no export is running', async () => {
            // Reset export status
            await request(app).delete('/api/export/reset');
            
            // Try to update progress
            const response = await request(app)
                .post('/api/export/progress')
                .send({ processed: 500 });
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error', 'No export operation running');
        });
    });
    
    describe('POST /api/export/complete', () => {
        test('should complete export operation successfully', async () => {
            // Start export
            await request(app)
                .post('/api/export/start')
                .send({ populationId: 'test-population', totalRecords: 1000 });
            
            // Complete export
            const completeData = {
                success: true,
                finalStats: {
                    processed: 1000,
                    errors: 0,
                    warnings: 5,
                    chunks: {
                        processed: 10,
                        total: 10
                    }
                },
                outputFile: 'export-123.csv',
                downloadUrl: '/downloads/export-123.csv'
            };
            
            const response = await request(app)
                .post('/api/export/complete')
                .send(completeData);
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('status', 'completed');
            expect(response.body).toHaveProperty('finalStats');
            expect(response.body).toHaveProperty('outputFile', 'export-123.csv');
            expect(response.body).toHaveProperty('downloadUrl', '/downloads/export-123.csv');
        });
        
        test('should handle failed export completion', async () => {
            // Start export
            await request(app)
                .post('/api/export/start')
                .send({ populationId: 'test-population', totalRecords: 1000 });
            
            // Complete export with failure
            const completeData = {
                success: false,
                finalStats: {
                    processed: 500,
                    errors: 500,
                    warnings: 0
                }
            };
            
            const response = await request(app)
                .post('/api/export/complete')
                .send(completeData);
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('status', 'failed');
            expect(response.body.finalStats).toHaveProperty('errors', 500);
        });
    });
    
    describe('POST /api/export/cancel', () => {
        test('should cancel running export', async () => {
            // Start export
            await request(app)
                .post('/api/export/start')
                .send({ populationId: 'test-population', totalRecords: 1000 });
            
            // Cancel export
            const response = await request(app)
                .post('/api/export/cancel');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('status', 'cancelled');
        });
        
        test('should reject cancel when no export is running', async () => {
            // Reset export status
            await request(app).delete('/api/export/reset');
            
            // Try to cancel
            const response = await request(app)
                .post('/api/export/cancel');
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error', 'No export operation running');
        });
    });
    
    describe('DELETE /api/export/reset', () => {
        test('should reset export status', async () => {
            // Start export
            await request(app)
                .post('/api/export/start')
                .send({ populationId: 'test-population', totalRecords: 1000 });
            
            // Reset export status
            const response = await request(app)
                .delete('/api/export/reset');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('status', 'idle');
            
            // Verify reset by checking status
            const statusResponse = await request(app).get('/api/export/status');
            expect(statusResponse.body).toHaveProperty('isRunning', false);
            expect(statusResponse.body).toHaveProperty('status', 'idle');
        });
    });
    
    describe('GET /api/export/health', () => {
        test('should return healthy status when circuit breaker is closed', async () => {
            const response = await request(app).get('/api/export/health');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('circuitBreaker');
            expect(response.body.circuitBreaker).toHaveProperty('state', 'CLOSED');
            expect(response.body).toHaveProperty('exportService');
            expect(response.body.exportService).toHaveProperty('status', 'available');
        });
        
        test('should return degraded status when circuit breaker is open', async () => {
            // Force circuit breaker into open state
            const circuitBreaker = CircuitBreakerRegistry.getOrCreate('export-api');
            circuitBreaker._state.failureCount = 10;
            circuitBreaker._state.state = 'OPEN';
            
            const response = await request(app).get('/api/export/health');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'degraded');
            expect(response.body.circuitBreaker).toHaveProperty('state', 'OPEN');
        });
        
        test('should report busy status when export is running', async () => {
            // Start export
            await request(app)
                .post('/api/export/start')
                .send({ populationId: 'test-population', totalRecords: 1000 });
            
            const response = await request(app).get('/api/export/health');
            
            expect(response.status).toBe(200);
            expect(response.body.exportService).toHaveProperty('status', 'busy');
            expect(response.body.exportService).toHaveProperty('activeExport');
            expect(response.body.exportService.activeExport).toHaveProperty('population');
            expect(response.body.exportService.activeExport).toHaveProperty('progress', 0);
        });
    });
    
    describe('Circuit Breaker Integration', () => {
        test('should trigger circuit breaker after multiple failures', async () => {
            // Create a circuit breaker that will fail
            const circuitBreaker = CircuitBreakerRegistry.getOrCreate('export-api', {
                failureThreshold: 3,
                resetTimeout: 100
            });
            
            // Mock internal execute method to always fail
            const originalExecute = circuitBreaker.execute;
            circuitBreaker.execute = jest.fn().mockImplementation(async () => {
                throw new Error('Simulated failure');
            });
            
            // Make multiple requests to trigger circuit breaker
            try {
                await request(app).get('/api/export/status');
            } catch (e) {}
            
            try {
                await request(app).get('/api/export/status');
            } catch (e) {}
            
            try {
                await request(app).get('/api/export/status');
            } catch (e) {}
            
            // Check circuit breaker state
            expect(circuitBreaker._state.state).toBe('OPEN');
            expect(circuitBreaker._state.failureCount).toBeGreaterThanOrEqual(3);
            
            // Restore original method
            circuitBreaker.execute = originalExecute;
        });
        
        test('should use fallback function when circuit is open', async () => {
            // Force circuit breaker into open state
            const circuitBreaker = CircuitBreakerRegistry.getOrCreate('export-api');
            circuitBreaker._state.failureCount = 10;
            circuitBreaker._state.state = 'OPEN';
            
            // Make request
            const response = await request(app).get('/api/export/status');
            
            // Should get fallback response
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error', 'Export service temporarily unavailable');
            expect(response.body).toHaveProperty('retryAfter', 30);
        });
    });
    
    describe('End-to-End Export Flow', () => {
        test('should handle complete export lifecycle', async () => {
            // 1. Start export
            let response = await request(app)
                .post('/api/export/start')
                .send({
                    populationId: 'test-population',
                    populationName: 'Test Population',
                    totalRecords: 10000,
                    format: 'csv',
                    outputFileName: 'test-export.csv'
                });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('sessionId');
            const sessionId = response.body.sessionId;
            
            // 2. Update progress for multiple chunks
            for (let i = 0; i < 10; i++) {
                response = await request(app)
                    .post('/api/export/progress')
                    .send({
                        processed: (i + 1) * 1000,
                        errors: i,
                        warnings: i * 2,
                        chunkIndex: i
                    });
                
                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('success', true);
                expect(response.body.progress).toHaveProperty('current', (i + 1) * 1000);
                expect(response.body.progress).toHaveProperty('percentage', (i + 1) * 10);
                expect(response.body.progress.chunks).toHaveProperty('processed', i + 1);
            }
            
            // 3. Check status during export
            response = await request(app).get('/api/export/status');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('isRunning', true);
            expect(response.body).toHaveProperty('progress');
            expect(response.body.progress).toHaveProperty('current', 10000);
            expect(response.body.progress).toHaveProperty('percentage', 100);
            
            // 4. Check health during export
            response = await request(app).get('/api/export/health');
            expect(response.status).toBe(200);
            expect(response.body.exportService).toHaveProperty('status', 'busy');
            expect(response.body.exportService).toHaveProperty('currentSession', sessionId);
            
            // 5. Complete export
            response = await request(app)
                .post('/api/export/complete')
                .send({
                    success: true,
                    finalStats: {
                        processed: 10000,
                        errors: 9,
                        warnings: 18,
                        chunks: {
                            processed: 10,
                            total: 10
                        }
                    },
                    outputFile: 'test-export.csv',
                    downloadUrl: '/downloads/test-export.csv'
                });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('status', 'completed');
            expect(response.body.finalStats).toHaveProperty('processed', 10000);
            expect(response.body.finalStats).toHaveProperty('duration');
            expect(response.body).toHaveProperty('outputFile', 'test-export.csv');
            
            // 6. Check status after completion
            response = await request(app).get('/api/export/status');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('isRunning', false);
            expect(response.body).toHaveProperty('status', 'completed');
            
            // 7. Check health after completion
            response = await request(app).get('/api/export/health');
            expect(response.status).toBe(200);
            expect(response.body.exportService).toHaveProperty('status', 'available');
            expect(response.body.exportService).toHaveProperty('activeExport', null);
            
            // 8. Reset export status
            response = await request(app).delete('/api/export/reset');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'idle');
        });
    });
});
