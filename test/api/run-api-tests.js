#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class APITestRunner {
    constructor() {
        this.testSuites = [
            {
                name: 'Comprehensive API Tests',
                file: 'comprehensive-api.test.js',
                timeout: 30000,
                priority: 1
            },
            {
                name: 'Endpoints API Tests',
                file: 'endpoints-api.test.js',
                timeout: 30000,
                priority: 2
            },
            {
                name: 'Integration API Tests',
                file: 'integration-api.test.js',
                timeout: 45000,
                priority: 3
            },
            {
                name: 'Performance Tests',
                file: 'performance-api.test.js',
                timeout: 60000,
                priority: 4
            },
            {
                name: 'Security Tests',
                file: 'security-api.test.js',
                timeout: 45000,
                priority: 5
            },
            {
                name: 'Load Tests',
                file: 'load-api.test.js',
                timeout: 90000,
                priority: 6
            },
            {
                name: 'Mock API Tests',
                file: 'mock-api.test.js',
                timeout: 30000,
                priority: 7
            }
        ];
        
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            suites: []
        };
    }
    
    async runSuite(suite) {
        console.log(`\n🧪 Running ${suite.name}...`);
        console.log('='.repeat(50));
        
        return new Promise((resolve) => {
            const testPath = path.join(__dirname, suite.file);
            const jest = spawn('npx', ['jest', testPath, '--verbose', '--detectOpenHandles'], {
                stdio: 'pipe',
                cwd: path.join(__dirname, '../..')
            });
            
            let output = '';
            let errorOutput = '';
            
            jest.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                process.stdout.write(text);
            });
            
            jest.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                process.stderr.write(text);
            });
            
            const timeout = setTimeout(() => {
                jest.kill('SIGKILL');
                console.log(`\n⏰ Test suite ${suite.name} timed out after ${suite.timeout}ms`);
                resolve({
                    name: suite.name,
                    status: 'timeout',
                    output,
                    errorOutput,
                    duration: suite.timeout
                });
            }, suite.timeout);
            
            const startTime = Date.now();
            
            jest.on('close', (code) => {
                clearTimeout(timeout);
                const duration = Date.now() - startTime;
                
                const result = {
                    name: suite.name,
                    status: code === 0 ? 'passed' : 'failed',
                    code,
                    output,
                    errorOutput,
                    duration
                };
                
                this.parseSuiteResults(result);
                resolve(result);
            });
        });
    }
    
    parseSuiteResults(result) {
        // Parse Jest output for test counts
        const output = result.output;
        
        // Extract test results from Jest output
        const passedMatch = output.match(/(\d+) passed/);
        const failedMatch = output.match(/(\d+) failed/);
        const skippedMatch = output.match(/(\d+) skipped/);
        const totalMatch = output.match(/Tests:\s+(\d+)/);
        
        const suiteResult = {
            name: result.name,
            status: result.status,
            duration: result.duration,
            passed: passedMatch ? parseInt(passedMatch[1]) : 0,
            failed: failedMatch ? parseInt(failedMatch[1]) : 0,
            skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
            total: totalMatch ? parseInt(totalMatch[1]) : 0
        };
        
        this.results.suites.push(suiteResult);
        this.results.passed += suiteResult.passed;
        this.results.failed += suiteResult.failed;
        this.results.skipped += suiteResult.skipped;
        this.results.total += suiteResult.total;
    }
    
    async runAllTests() {
        console.log('🚀 Starting Comprehensive API Test Suite');
        console.log('==========================================');
        
        const startTime = Date.now();
        
        // Sort by priority
        const sortedSuites = this.testSuites.sort((a, b) => a.priority - b.priority);
        
        for (const suite of sortedSuites) {
            try {
                await this.runSuite(suite);
            } catch (error) {
                console.error(`❌ Error running ${suite.name}:`, error.message);
                this.results.suites.push({
                    name: suite.name,
                    status: 'error',
                    error: error.message,
                    passed: 0,
                    failed: 1,
                    skipped: 0,
                    total: 1
                });
                this.results.failed += 1;
                this.results.total += 1;
            }
        }
        
        const totalDuration = Date.now() - startTime;
        this.generateReport(totalDuration);
    }
    
    generateReport(totalDuration) {
        console.log('\n📊 TEST EXECUTION SUMMARY');
        console.log('='.repeat(50));
        
        this.results.suites.forEach(suite => {
            const statusIcon = suite.status === 'passed' ? '✅' : 
                             suite.status === 'failed' ? '❌' : 
                             suite.status === 'timeout' ? '⏰' : '⚠️';
            
            console.log(`${statusIcon} ${suite.name}`);
            console.log(`   Duration: ${suite.duration}ms`);
            console.log(`   Tests: ${suite.total} | Passed: ${suite.passed} | Failed: ${suite.failed} | Skipped: ${suite.skipped}`);
        });
        
        console.log('\n📈 OVERALL RESULTS');
        console.log('='.repeat(30));
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⏭️  Skipped: ${this.results.skipped}`);
        console.log(`⏱️  Total Duration: ${totalDuration}ms`);
        
        const successRate = this.results.total > 0 ? 
            ((this.results.passed / this.results.total) * 100).toFixed(2) : 0;
        console.log(`📊 Success Rate: ${successRate}%`);
        
        // Save results to file
        this.saveResults(totalDuration);
        
        // Exit with appropriate code
        process.exit(this.results.failed > 0 ? 1 : 0);
    }
    
    saveResults(totalDuration) {
        const reportData = {
            timestamp: new Date().toISOString(),
            totalDuration,
            summary: this.results,
            environment: {
                node: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };
        
        const reportPath = path.join(__dirname, '../reports/api-test-results.json');
        
        // Ensure reports directory exists
        const reportsDir = path.dirname(reportPath);
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        console.log(`\n📄 Detailed results saved to: ${reportPath}`);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new APITestRunner();
    runner.runAllTests().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

export default APITestRunner;