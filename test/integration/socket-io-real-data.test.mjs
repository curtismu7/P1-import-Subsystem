/**
 * Socket.IO Real Data Integration Tests
 * 
 * Tests Socket.IO functionality with real data scenarios including:
 * - Real-time progress tracking during import operations
 * - Session management with actual session IDs
 * - Error handling with real error scenarios
 * - Connection management and recovery
 * - Performance testing with large datasets
 * 
 * @version 1.0.0
 * @author AI Assistant
 * @date 2025-07-30
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { io as ioClient } from 'socket.io-client';
import fs from 'fs/promises';
import path from 'path';

// Test configuration
const TEST_CONFIG = {
    serverUrl: 'http://localhost:4000',
    timeout: 30000,
    maxRetries: 3,
    testDataDir: 'test-data'
};

// Real test data
const REAL_TEST_DATA = {
    smallDataset: {
        filename: 'test-users-small.csv',
        content: `email,firstName,lastName,username
john.doe@example.com,John,Doe,john.doe
jane.smith@example.com,Jane,Smith,jane.smith
bob.wilson@example.com,Bob,Wilson,bob.wilson
alice.brown@example.com,Alice,Brown,alice.brown
charlie.davis@example.com,Charlie,Davis,charlie.davis`,
        expectedCount: 5
    },
    
    mediumDataset: {
        filename: 'test-users-medium.csv',
        content: generateLargeCSV(50),
        expectedCount: 50
    },
    
    largeDataset: {
        filename: 'test-users-large.csv',
        content: generateLargeCSV(200),
        expectedCount: 200
    },
    
    invalidDataset: {
        filename: 'test-users-invalid.csv',
        content: `email,firstName,lastName,username
invalid-email,John,Doe,john.doe
jane.smith@example.com,,Smith,jane.smith
bob.wilson@example.com,Bob,Wilson,
,Alice,Brown,alice.brown`,
        expectedCount: 4,
        expectedErrors: 3
    }
};

// Generate large CSV data for testing
function generateLargeCSV(count) {
    const header = 'email,firstName,lastName,username';
    const rows = [header];
    
    for (let i = 1; i <= count; i++) {
        const email = `user${i}@example.com`;
        const firstName = `FirstName${i}`;
        const lastName = `LastName${i}`;
        const username = `user${i}`;
        rows.push(`${email},${firstName},${lastName},${username}`);
    }
    
    return rows.join('\n');
}

// Skip entire suite when integration tests are disabled
const shouldRunIntegration = process.env.SKIP_INTEGRATION_TESTS !== 'true';
const describeOrSkip = shouldRunIntegration ? describe : describe.skip;

describeOrSkip('🔌 Socket.IO Real Data Integration Tests', () => {
    let socketClient;
    let testSessionId;
    let testDataFiles = [];
    
    beforeAll(async () => {
        console.log('🔧 Setting up Socket.IO real data tests...');
        
        // Create test data directory
        try {
            await fs.mkdir(TEST_CONFIG.testDataDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
        
        // Create test data files
        for (const [key, data] of Object.entries(REAL_TEST_DATA)) {
            const filePath = path.join(TEST_CONFIG.testDataDir, data.filename);
            await fs.writeFile(filePath, data.content);
            testDataFiles.push(filePath);
            console.log(`📄 Created test file: ${data.filename} (${data.expectedCount} records)`);
        }
    });
    
    afterAll(async () => {
        // Clean up test data files
        for (const filePath of testDataFiles) {
            try {
                await fs.unlink(filePath);
            } catch (error) {
                // File might not exist
            }
        }
        
        // Remove test data directory
        try {
            await fs.rmdir(TEST_CONFIG.testDataDir);
        } catch (error) {
            // Directory might not be empty or not exist
        }
        
        console.log('🧹 Socket.IO real data tests cleanup completed');
    });
    
    beforeEach(() => {
        testSessionId = `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    });
    
    afterEach(async () => {
        if (socketClient) {
            socketClient.disconnect();
            socketClient = null;
        }
    });
    
    describe('🚀 Connection and Session Management', () => {
        it('should establish Socket.IO connection with real session data', async () => {
            socketClient = ioClient(TEST_CONFIG.serverUrl, {
                timeout: 10000,
                reconnection: false
            });
            
            const connectionPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);
                
                socketClient.on('connect', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                
                socketClient.on('connect_error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
            
            await connectionPromise;
            
            expect(socketClient.connected).toBe(true);
            expect(socketClient.id).toBeTruthy();
            
            console.log(`✅ Socket.IO connection established: ${socketClient.id}`);
        });
        
        it('should register session with real session ID', async () => {
            socketClient = ioClient(TEST_CONFIG.serverUrl, {
                timeout: 10000,
                reconnection: false
            });
            
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);
                
                socketClient.on('connect', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
            
            const sessionPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Session registration timeout'));
                }, 5000);
                
                socketClient.on('sessionRegistered', (data) => {
                    clearTimeout(timeout);
                    resolve(data);
                });
                
                socketClient.emit('join-session', { sessionId: testSessionId });
            });
            
            const sessionData = await sessionPromise;
            
            expect(sessionData).toHaveProperty('sessionId', testSessionId);
            expect(sessionData).toHaveProperty('timestamp');
            
            console.log(`✅ Session registered: ${testSessionId}`);
        });
    });
    
    describe('📊 Real-time Progress Tracking', () => {
        it('should track progress for small dataset import', async () => {
            socketClient = ioClient(TEST_CONFIG.serverUrl, {
                timeout: 10000,
                reconnection: false
            });
            
            // Wait for connection
            await new Promise((resolve) => {
                socketClient.on('connect', resolve);
            });
            
            // Register session
            await new Promise((resolve) => {
                socketClient.on('sessionRegistered', resolve);
                socketClient.emit('join-session', { sessionId: testSessionId });
            });
            
            const progressUpdates = [];
            const progressPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Progress tracking timeout'));
                }, 15000);
                
                socketClient.on('progress', (data) => {
                    progressUpdates.push(data);
                    console.log(`📈 Progress update: ${JSON.stringify(data)}`);
                    
                    if (data.status === 'completed' || data.status === 'finished') {
                        clearTimeout(timeout);
                        resolve(progressUpdates);
                    }
                });
                
                socketClient.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
                
                // Simulate starting an import operation
                setTimeout(() => {
                    socketClient.emit('start-import', {
                        sessionId: testSessionId,
                        filename: REAL_TEST_DATA.smallDataset.filename,
                        totalRecords: REAL_TEST_DATA.smallDataset.expectedCount,
                        populationId: 'test-population-id'
                    });
                }, 1000);
            });
            
            const updates = await progressPromise;
            
            expect(updates.length).toBeGreaterThan(0);
            expect(updates[0]).toHaveProperty('sessionId', testSessionId);
            expect(updates[updates.length - 1]).toHaveProperty('status');
            
            console.log(`✅ Received ${updates.length} progress updates for small dataset`);
        });
        
        it('should handle progress updates for medium dataset', async () => {
            socketClient = ioClient(TEST_CONFIG.serverUrl, {
                timeout: 15000,
                reconnection: false
            });
            
            // Wait for connection and session registration
            await new Promise((resolve) => {
                socketClient.on('connect', () => {
                    socketClient.emit('join-session', { sessionId: testSessionId });
                    socketClient.on('sessionRegistered', resolve);
                });
            });
            
            const progressData = [];
            let lastProgressPercentage = 0;
            
            const progressPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Medium dataset progress timeout'));
                }, 20000);
                
                socketClient.on('progress', (data) => {
                    progressData.push(data);
                    
                    if (data.percentage !== undefined) {
                        expect(data.percentage).toBeGreaterThanOrEqual(lastProgressPercentage);
                        lastProgressPercentage = data.percentage;
                    }
                    
                    if (data.status === 'completed' || data.percentage === 100) {
                        clearTimeout(timeout);
                        resolve(progressData);
                    }
                });
                
                // Simulate medium dataset import
                socketClient.emit('start-import', {
                    sessionId: testSessionId,
                    filename: REAL_TEST_DATA.mediumDataset.filename,
                    totalRecords: REAL_TEST_DATA.mediumDataset.expectedCount,
                    populationId: 'test-population-medium'
                });
            });
            
            const updates = await progressPromise;
            
            expect(updates.length).toBeGreaterThan(5); // Should have multiple progress updates
            expect(lastProgressPercentage).toBe(100);
            
            console.log(`✅ Medium dataset progress tracking completed with ${updates.length} updates`);
        });
    });
    
    describe('🚨 Error Handling with Real Data', () => {
        it('should handle invalid data and report errors via Socket.IO', async () => {
            socketClient = ioClient(TEST_CONFIG.serverUrl, {
                timeout: 10000,
                reconnection: false
            });
            
            // Setup connection and session
            await new Promise((resolve) => {
                socketClient.on('connect', () => {
                    socketClient.emit('join-session', { sessionId: testSessionId });
                    socketClient.on('sessionRegistered', resolve);
                });
            });
            
            const errorData = [];
            const errorPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Error handling timeout'));
                }, 15000);
                
                socketClient.on('error', (data) => {
                    errorData.push(data);
                    console.log(`🚨 Error received: ${JSON.stringify(data)}`);
                });
                
                socketClient.on('progress', (data) => {
                    if (data.errors && data.errors.length > 0) {
                        errorData.push(...data.errors);
                    }
                    
                    if (data.status === 'completed' || data.status === 'failed') {
                        clearTimeout(timeout);
                        resolve(errorData);
                    }
                });
                
                // Start import with invalid data
                socketClient.emit('start-import', {
                    sessionId: testSessionId,
                    filename: REAL_TEST_DATA.invalidDataset.filename,
                    totalRecords: REAL_TEST_DATA.invalidDataset.expectedCount,
                    populationId: 'test-population-invalid'
                });
            });
            
            const errors = await errorPromise;
            
            expect(errors.length).toBeGreaterThan(0);
            
            console.log(`✅ Error handling test completed with ${errors.length} errors detected`);
        });
        
        it('should handle connection drops and reconnection', async () => {
            socketClient = ioClient(TEST_CONFIG.serverUrl, {
                timeout: 5000,
                reconnection: true,
                reconnectionAttempts: 3,
                reconnectionDelay: 1000
            });
            
            let connectionCount = 0;
            let disconnectionCount = 0;
            
            const connectionTestPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection test timeout'));
                }, 20000);
                
                socketClient.on('connect', () => {
                    connectionCount++;
                    console.log(`🔌 Connection #${connectionCount}`);
                    
                    if (connectionCount === 1) {
                        // Register session on first connection
                        socketClient.emit('join-session', { sessionId: testSessionId });
                    }
                    
                    if (connectionCount === 2) {
                        // Test completed after reconnection
                        clearTimeout(timeout);
                        resolve({ connections: connectionCount, disconnections: disconnectionCount });
                    }
                });
                
                socketClient.on('disconnect', (reason) => {
                    disconnectionCount++;
                    console.log(`🔌 Disconnection #${disconnectionCount}: ${reason}`);
                });
                
                // Simulate connection drop after 3 seconds
                setTimeout(() => {
                    if (socketClient.connected) {
                        socketClient.disconnect();
                    }
                }, 3000);
            });
            
            const result = await connectionTestPromise;
            
            expect(result.connections).toBe(2);
            expect(result.disconnections).toBeGreaterThan(0);
            
            console.log(`✅ Connection recovery test completed: ${result.connections} connections, ${result.disconnections} disconnections`);
        });
    });
    
    describe('⚡ Performance Testing', () => {
        it('should handle large dataset progress updates efficiently', async () => {
            socketClient = ioClient(TEST_CONFIG.serverUrl, {
                timeout: 15000,
                reconnection: false
            });
            
            // Setup connection
            await new Promise((resolve) => {
                socketClient.on('connect', () => {
                    socketClient.emit('join-session', { sessionId: testSessionId });
                    socketClient.on('sessionRegistered', resolve);
                });
            });
            
            const startTime = Date.now();
            let updateCount = 0;
            let maxLatency = 0;
            let totalLatency = 0;
            
            const performancePromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Performance test timeout'));
                }, 30000);
                
                socketClient.on('progress', (data) => {
                    updateCount++;
                    
                    if (data.timestamp) {
                        const latency = Date.now() - data.timestamp;
                        maxLatency = Math.max(maxLatency, latency);
                        totalLatency += latency;
                    }
                    
                    if (data.status === 'completed' || data.percentage === 100) {
                        const duration = Date.now() - startTime;
                        const avgLatency = totalLatency / updateCount;
                        
                        clearTimeout(timeout);
                        resolve({
                            duration,
                            updateCount,
                            avgLatency,
                            maxLatency,
                            updatesPerSecond: updateCount / (duration / 1000)
                        });
                    }
                });
                
                // Start large dataset import
                socketClient.emit('start-import', {
                    sessionId: testSessionId,
                    filename: REAL_TEST_DATA.largeDataset.filename,
                    totalRecords: REAL_TEST_DATA.largeDataset.expectedCount,
                    populationId: 'test-population-large',
                    timestamp: Date.now()
                });
            });
            
            const performance = await performancePromise;
            
            expect(performance.updateCount).toBeGreaterThan(10);
            expect(performance.avgLatency).toBeLessThan(1000); // Average latency under 1 second
            expect(performance.maxLatency).toBeLessThan(5000); // Max latency under 5 seconds
            
            console.log(`✅ Performance test completed:`);
            console.log(`   Duration: ${performance.duration}ms`);
            console.log(`   Updates: ${performance.updateCount}`);
            console.log(`   Avg Latency: ${performance.avgLatency.toFixed(2)}ms`);
            console.log(`   Max Latency: ${performance.maxLatency}ms`);
            console.log(`   Updates/sec: ${performance.updatesPerSecond.toFixed(2)}`);
        });
        
        it('should handle multiple concurrent sessions', async () => {
            const sessionCount = 5;
            const clients = [];
            const sessionIds = [];
            
            // Create multiple clients
            for (let i = 0; i < sessionCount; i++) {
                const client = ioClient(TEST_CONFIG.serverUrl, {
                    timeout: 10000,
                    reconnection: false
                });
                const sessionId = `concurrent-session-${i}-${Date.now()}`;
                
                clients.push(client);
                sessionIds.push(sessionId);
            }
            
            try {
                // Connect all clients
                const connectionPromises = clients.map((client, index) => {
                    return new Promise((resolve) => {
                        client.on('connect', () => {
                            client.emit('join-session', { sessionId: sessionIds[index] });
                            client.on('sessionRegistered', resolve);
                        });
                    });
                });
                
                await Promise.all(connectionPromises);
                
                // Start concurrent operations
                const operationPromises = clients.map((client, index) => {
                    return new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error(`Concurrent operation ${index} timeout`));
                        }, 20000);
                        
                        let updateCount = 0;
                        
                        client.on('progress', (data) => {
                            updateCount++;
                            
                            if (data.status === 'completed' || data.percentage === 100) {
                                clearTimeout(timeout);
                                resolve({ sessionIndex: index, updateCount });
                            }
                        });
                        
                        // Start import for this session
                        client.emit('start-import', {
                            sessionId: sessionIds[index],
                            filename: REAL_TEST_DATA.smallDataset.filename,
                            totalRecords: REAL_TEST_DATA.smallDataset.expectedCount,
                            populationId: `concurrent-population-${index}`
                        });
                    });
                });
                
                const results = await Promise.all(operationPromises);
                
                expect(results.length).toBe(sessionCount);
                results.forEach((result, index) => {
                    expect(result.sessionIndex).toBe(index);
                    expect(result.updateCount).toBeGreaterThan(0);
                });
                
                console.log(`✅ Concurrent sessions test completed with ${sessionCount} sessions`);
                
            } finally {
                // Clean up all clients
                clients.forEach(client => {
                    if (client.connected) {
                        client.disconnect();
                    }
                });
            }
        });
    });
    
    describe('🔄 Real-world Scenarios', () => {
        it('should simulate complete import workflow with real data', async () => {
            socketClient = ioClient(TEST_CONFIG.serverUrl, {
                timeout: 15000,
                reconnection: false
            });
            
            // Setup connection
            await new Promise((resolve) => {
                socketClient.on('connect', () => {
                    socketClient.emit('join-session', { sessionId: testSessionId });
                    socketClient.on('sessionRegistered', resolve);
                });
            });
            
            const workflowSteps = [];
            
            const workflowPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Workflow test timeout'));
                }, 25000);
                
                socketClient.on('progress', (data) => {
                    workflowSteps.push({
                        step: data.step || 'progress',
                        status: data.status,
                        percentage: data.percentage,
                        message: data.message,
                        timestamp: Date.now()
                    });
                    
                    console.log(`🔄 Workflow step: ${data.step || 'progress'} - ${data.status} (${data.percentage || 0}%)`);
                    
                    if (data.status === 'completed') {
                        clearTimeout(timeout);
                        resolve(workflowSteps);
                    }
                });
                
                socketClient.on('error', (error) => {
                    workflowSteps.push({
                        step: 'error',
                        error: error.message,
                        timestamp: Date.now()
                    });
                });
                
                // Start complete workflow
                socketClient.emit('start-workflow', {
                    sessionId: testSessionId,
                    operation: 'import',
                    filename: REAL_TEST_DATA.mediumDataset.filename,
                    totalRecords: REAL_TEST_DATA.mediumDataset.expectedCount,
                    populationId: 'workflow-test-population',
                    options: {
                        validateData: true,
                        createPopulation: true,
                        sendNotifications: false
                    }
                });
            });
            
            const steps = await workflowPromise;
            
            expect(steps.length).toBeGreaterThan(3);
            expect(steps[steps.length - 1].status).toBe('completed');
            
            // Verify workflow progression
            const statusProgression = steps.map(step => step.status).filter(Boolean);
            expect(statusProgression).toContain('started');
            expect(statusProgression).toContain('completed');
            
            console.log(`✅ Complete workflow test completed with ${steps.length} steps`);
        });
    });
});

console.log('🔌 Socket.IO real data test suite loaded');