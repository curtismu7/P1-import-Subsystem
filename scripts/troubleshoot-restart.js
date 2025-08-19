#!/usr/bin/env node

/**
 * Restart Troubleshooting Script
 * 
 * Diagnoses common issues that prevent server restarts and provides solutions.
 * 
 * Usage: node scripts/troubleshoot-restart.js
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Restart Troubleshooting Script');
console.log('================================');

async function troubleshoot() {
    const issues = [];
    const solutions = [];
    
    try {
        // Check 1: Current directory
        console.log('\n📁 Checking current directory...');
        const currentDir = process.cwd();
        const projectRoot = path.resolve(__dirname, '..');
        
        if (currentDir !== projectRoot) {
            issues.push('❌ Not running from project root directory');
            solutions.push(`💡 Change to project root: cd ${projectRoot}`);
        } else {
            console.log('✅ Running from project root directory');
        }
        
        // Check 2: Server file exists
        console.log('\n🔍 Checking server file...');
        const serverFile = path.join(projectRoot, 'server', 'server-fixed.js');
        try {
            await fs.access(serverFile);
            console.log('✅ Server file exists: server/server-fixed.js');
        } catch (e) {
            issues.push('❌ Server file not found: server/server-fixed.js');
            solutions.push('💡 Check if server/server-fixed.js exists');
        }
        
        // Check 3: Port 4000 status
        console.log('\n🔌 Checking port 4000...');
        try {
            const portCheck = execSync('lsof -ti:4000', { stdio: 'pipe' }).toString().trim();
            if (portCheck) {
                console.log(`🔴 Port 4000 is in use by PID: ${portCheck}`);
                issues.push(`❌ Port 4000 is occupied by PID: ${portCheck}`);
                solutions.push('💡 Kill the process: kill -9 ' + portCheck);
                solutions.push('💡 Or use: lsof -ti:4000 | xargs kill -9');
            } else {
                console.log('✅ Port 4000 is free');
            }
        } catch (e) {
            console.log('✅ Port 4000 is free');
        }
        
        // Check 4: Node.js processes
        console.log('\n🔄 Checking Node.js processes...');
        try {
            const nodeProcesses = execSync("ps aux | grep 'node.*server' | grep -v grep", { stdio: 'pipe' }).toString().trim();
            if (nodeProcesses) {
                console.log('🔴 Found Node.js server processes:');
                console.log(nodeProcesses);
                issues.push('❌ Node.js server processes are running');
                solutions.push('💡 Kill processes: pkill -f "node.*server"');
                solutions.push('💡 Or kill specific PIDs shown above');
            } else {
                console.log('✅ No Node.js server processes found');
            }
        } catch (e) {
            console.log('✅ No Node.js server processes found');
        }
        
        // Check 5: File permissions
        console.log('\n🔐 Checking file permissions...');
        try {
            const serverFile = path.join(projectRoot, 'server', 'server-fixed.js');
            const stats = await fs.stat(serverFile);
            const isExecutable = (stats.mode & 0o111) !== 0;
            
            if (isExecutable) {
                console.log('✅ Server file is executable');
            } else {
                console.log('⚠️  Server file is not executable');
            }
        } catch (e) {
            console.log('⚠️  Could not check file permissions');
        }
        
        // Check 6: Dependencies
        console.log('\n📦 Checking dependencies...');
        const packageJsonPath = path.join(projectRoot, 'package.json');
        try {
            const packageJson = await fs.readFile(packageJsonPath, 'utf8');
            const packageData = JSON.parse(packageJson);
            
            if (packageData.dependencies) {
                console.log('✅ package.json dependencies found');
            } else {
                issues.push('❌ No dependencies in package.json');
                solutions.push('💡 Run: npm install');
            }
        } catch (e) {
            issues.push('❌ Could not read package.json');
            solutions.push('💡 Check if package.json exists and is valid JSON');
        }
        
        // Check 7: Node.js version
        console.log('\n🟢 Checking Node.js version...');
        try {
            const nodeVersion = execSync('node --version', { stdio: 'pipe' }).toString().trim();
            console.log(`✅ Node.js version: ${nodeVersion}`);
            
            const version = nodeVersion.replace('v', '');
            const majorVersion = parseInt(version.split('.')[0]);
            
            if (majorVersion < 14) {
                issues.push('❌ Node.js version too old (need 14+)');
                solutions.push('💡 Update Node.js to version 14 or higher');
            }
        } catch (e) {
            issues.push('❌ Could not determine Node.js version');
            solutions.push('💡 Make sure Node.js is installed and in PATH');
        }
        
        // Summary
        console.log('\n📋 Summary');
        console.log('==========');
        
        if (issues.length === 0) {
            console.log('✅ No issues found! Your environment looks good for restarting.');
            console.log('💡 Try running: npm run restart:simple');
        } else {
            console.log(`❌ Found ${issues.length} issue(s):`);
            issues.forEach(issue => console.log(`  ${issue}`));
            
            console.log('\n🔧 Solutions:');
            solutions.forEach(solution => console.log(`  ${solution}`));
            
            console.log('\n💡 Recommended next steps:');
            console.log('1. Fix the issues above');
            console.log('2. Try: npm run restart:simple');
            console.log('3. If still having issues, try: npm run restart:bust');
        }
        
    } catch (error) {
        console.error('❌ Error during troubleshooting:', error.message);
        console.log('\n💡 Try running the troubleshooting script again');
    }
}

// Run troubleshooting
troubleshoot();
