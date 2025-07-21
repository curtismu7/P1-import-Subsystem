/**
 * Test Runner API Routes
 * 
 * Provides API endpoints for running tests and retrieving results.
 */

import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Get available tests
router.get('/tests', (req, res) => {
    // In a real implementation, this would scan the test directory
    // For now, we'll return a static list of tests
    res.json({
        success: true,
        tests: {
            "api-client": [
                {
                    id: "api-client-request-config",
                    name: "Request Configuration",
                    description: "Tests the request configuration UI and validation",
                    file: "test/ui/api-client-subsystem.test.js",
                    testName: "should populate request form fields"
                },
                // Additional tests would be listed here
            ],
            // Other subsystems would be listed here
        }
    });
});

// Run a test
router.post('/run', (req, res) => {
    const { testId, file, testName } = req.body;
    
    if (!file) {
        return res.status(400).json({
            success: false,
            error: 'Missing required parameter: file'
        });
    }
    
    // Build the command to run the test
    let command = `npx jest --config=jest.ui.config.cjs ${file}`;
    
    // Add test name filter if provided
    if (testName) {
        command += ` -t "${testName}"`;
    }
    
    // Execute the test
    exec(command, { cwd: rootDir }, (error, stdout, stderr) => {
        const success = !error;
        
        res.json({
            success,
            testId,
            output: stdout || stderr,
            error: error ? error.message : null
        });
    });
});

// Run multiple tests
router.post('/run-batch', (req, res) => {
    const { tests } = req.body;
    
    if (!tests || !Array.isArray(tests) || tests.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Missing or invalid tests parameter'
        });
    }
    
    // In a real implementation, we would run the tests in sequence or parallel
    // For now, we'll just acknowledge the request
    res.json({
        success: true,
        message: `Started running ${tests.length} tests`,
        batchId: Date.now().toString()
    });
    
    // The actual test execution would happen asynchronously
    // Results would be sent via WebSocket or retrieved via polling
});

// Get test results
router.get('/results/:batchId', (req, res) => {
    const { batchId } = req.params;
    
    // In a real implementation, we would retrieve the results from a database or cache
    // For now, we'll just return a mock response
    res.json({
        success: true,
        batchId,
        completed: true,
        results: [
            {
                testId: 'api-client-request-config',
                success: true,
                output: 'Test passed',
                duration: 0.5
            },
            // Additional results would be included here
        ]
    });
});

export default router;