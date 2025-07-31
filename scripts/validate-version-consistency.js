#!/usr/bin/env node

/**
 * Version Consistency Validator
 * 
 * This script validates that all version references across the project are consistent.
 * It helps prevent version mismatches and ensures bulletproof version management.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function extractVersionFromFile(filePath, patterns) {
    if (!fs.existsSync(filePath)) {
        return { versions: [], error: 'File not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const versions = [];
    
    for (const pattern of patterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
            matches.forEach(match => {
                const versionMatch = match.match(/(\d+\.\d+\.\d+(?:\.\d+)?)/);
                if (versionMatch) {
                    versions.push({
                        version: versionMatch[1],
                        context: pattern.name,
                        match: match.trim()
                    });
                }
            });
        }
    }
    
    return { versions, error: null };
}

function validateVersionConsistency() {
    log('🔍 Validating Version Consistency...', 'bright');
    log('', 'reset');
    
    const expectedVersion = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
    ).version;
    
    log(`📋 Expected Version: ${expectedVersion}`, 'magenta');
    log('', 'reset');
    
    const files = [
        {
            path: 'package.json',
            patterns: [
                { name: 'Main Version', regex: /"version":\s*"[\d.]+"/g }
            ]
        },
        {
            path: 'public/index.html',
            patterns: [
                { name: 'Page Title', regex: /<title>PingOne (?:User )?Import Tool v[\d.]+<\/title>/g },
                { name: 'Footer Copyright', regex: /&copy; \d{4} PingOne Import Tool v[\d.]+/g },
                { name: 'Version Widget', regex: /<div id="version-display" class="version-widget">v[\d.]+<\/div>/g }
            ]
        },
        {
            path: 'src/client/app.js',
            patterns: [
                { name: 'Logger Version', regex: /version: '[\d.]+'/g },
                { name: 'App Version Property', regex: /this\.version = '[\d.]+'/g }
            ]
        },
        {
            path: 'src/client/subsystems/navigation-subsystem.js',
            patterns: [
                { name: 'Base Title', regex: /const baseTitle = 'PingOne (?:User )?Import(?: Tool)? v[\d.]+'/g }
            ]
        }
    ];
    
    let allConsistent = true;
    const inconsistencies = [];
    
    for (const file of files) {
        const filePath = path.join(projectRoot, file.path);
        log(`📄 Checking ${file.path}...`, 'blue');
        
        const result = extractVersionFromFile(filePath, file.patterns);
        
        if (result.error) {
            log(`   ❌ ${result.error}`, 'red');
            allConsistent = false;
            continue;
        }
        
        if (result.versions.length === 0) {
            log(`   ⚠️  No version references found`, 'yellow');
            continue;
        }
        
        for (const versionInfo of result.versions) {
            if (versionInfo.version === expectedVersion) {
                log(`   ✅ ${versionInfo.context}: ${versionInfo.version}`, 'green');
            } else {
                log(`   ❌ ${versionInfo.context}: ${versionInfo.version} (expected: ${expectedVersion})`, 'red');
                allConsistent = false;
                inconsistencies.push({
                    file: file.path,
                    context: versionInfo.context,
                    found: versionInfo.version,
                    expected: expectedVersion,
                    match: versionInfo.match
                });
            }
        }
    }
    
    log('', 'reset');
    
    if (allConsistent) {
        log('🎉 All version references are consistent!', 'bright');
        log(`✅ Version ${expectedVersion} is correctly applied across all files`, 'green');
        return true;
    } else {
        log('❌ Version inconsistencies found!', 'red');
        log('', 'reset');
        log('📋 Inconsistencies:', 'yellow');
        
        for (const inconsistency of inconsistencies) {
            log(`   File: ${inconsistency.file}`, 'cyan');
            log(`   Context: ${inconsistency.context}`, 'cyan');
            log(`   Found: ${inconsistency.found}`, 'red');
            log(`   Expected: ${inconsistency.expected}`, 'green');
            log(`   Match: ${inconsistency.match}`, 'yellow');
            log('', 'reset');
        }
        
        log('🔧 To fix inconsistencies, run:', 'cyan');
        log(`   npm run version:update ${expectedVersion}`, 'yellow');
        
        return false;
    }
}

function main() {
    try {
        const isConsistent = validateVersionConsistency();
        process.exit(isConsistent ? 0 : 1);
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        process.exit(1);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}

export { validateVersionConsistency };
