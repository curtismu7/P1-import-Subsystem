#!/usr/bin/env node

/**
 * Migration Script: Unified Token Management System
 * 
 * This script helps migrate existing code to use the unified token management system.
 * It analyzes the codebase, identifies token-related code, and provides migration guidance.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    // Directories to scan
    scanDirectories: [
        'public/js',
        'routes',
        'server',
        'auth-subsystem',
        'src'
    ],
    
    // File extensions to process
    fileExtensions: ['.js', '.mjs'],
    
    // Patterns to find
    patterns: {
        // Direct localStorage access
        directLocalStorage: [
            /localStorage\.getItem\s*\(\s*['"`].*token.*['"`]\s*\)/gi,
            /localStorage\.setItem\s*\(\s*['"`].*token.*['"`]\s*,/gi,
            /localStorage\.removeItem\s*\(\s*['"`].*token.*['"`]\s*\)/gi
        ],
        
        // Token manager instances
        tokenManagers: [
            /new\s+TokenManager\s*\(/gi,
            /new\s+GlobalTokenManager\s*\(/gi,
            /\.tokenManager\./gi,
            /\.getAccessToken\s*\(/gi
        ],
        
        // Token validation patterns
        tokenValidation: [
            /Date\.now\(\)\s*[<>]=?\s*.*expir/gi,
            /expir.*[<>]=?\s*Date\.now\(\)/gi,
            /parseInt\s*\(\s*.*expir.*\)/gi
        ],
        
        // Legacy token keys
        legacyTokenKeys: [
            /'pingone_worker_token'/gi,
            /'pingone_token_expiry'/gi,
            /'exportToken'/gi,
            /'exportTokenExpires'/gi,
            /"pingone_worker_token"/gi,
            /"pingone_token_expiry"/gi,
            /"exportToken"/gi,
            /"exportTokenExpires"/gi
        ]
    },
    
    // Output file for migration report
    reportFile: 'migration-report.md'
};

/**
 * Main migration function
 */
async function main() {
    console.log('🚀 Starting Unified Token Management Migration Analysis...\n');
    
    try {
        // Scan codebase
        const scanResults = await scanCodebase();
        
        // Generate migration report
        const report = generateMigrationReport(scanResults);
        
        // Write report to file
        await fs.writeFile(CONFIG.reportFile, report, 'utf8');
        
        // Display summary
        displaySummary(scanResults);
        
        console.log(`\n📄 Detailed migration report written to: ${CONFIG.reportFile}`);
        console.log('\n✅ Migration analysis completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration analysis failed:', error);
        process.exit(1);
    }
}

/**
 * Scan the codebase for token-related patterns
 */
async function scanCodebase() {
    const results = {
        files: [],
        totalFiles: 0,
        totalMatches: 0,
        patternCounts: {}
    };
    
    // Initialize pattern counts
    Object.keys(CONFIG.patterns).forEach(pattern => {
        results.patternCounts[pattern] = 0;
    });
    
    console.log('🔍 Scanning directories:', CONFIG.scanDirectories.join(', '));
    
    for (const directory of CONFIG.scanDirectories) {
        if (await directoryExists(directory)) {
            await scanDirectory(directory, results);
        } else {
            console.log(`⚠️  Directory not found: ${directory}`);
        }
    }
    
    return results;
}

/**
 * Scan a directory recursively
 */
async function scanDirectory(dirPath, results) {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                // Skip node_modules and other irrelevant directories
                if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
                    await scanDirectory(fullPath, results);
                }
            } else if (entry.isFile() && CONFIG.fileExtensions.includes(path.extname(entry.name))) {
                await scanFile(fullPath, results);
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${dirPath}:`, error.message);
    }
}

/**
 * Scan a single file for patterns
 */
async function scanFile(filePath, results) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const fileResult = {
            path: filePath,
            matches: [],
            totalMatches: 0
        };
        
        results.totalFiles++;
        
        // Check each pattern category
        Object.entries(CONFIG.patterns).forEach(([category, patterns]) => {
            patterns.forEach((pattern, index) => {
                const matches = [...content.matchAll(pattern)];
                
                matches.forEach(match => {
                    const lineNumber = getLineNumber(content, match.index);
                    const lineContent = getLineContent(content, match.index);
                    
                    fileResult.matches.push({
                        category,
                        pattern: pattern.source,
                        match: match[0],
                        line: lineNumber,
                        lineContent: lineContent.trim(),
                        severity: getSeverity(category),
                        suggestion: getSuggestion(category, match[0])
                    });
                    
                    fileResult.totalMatches++;
                    results.totalMatches++;
                    results.patternCounts[category]++;
                });
            });
        });
        
        // Only add files with matches
        if (fileResult.totalMatches > 0) {
            results.files.push(fileResult);
        }
        
    } catch (error) {
        console.error(`Error scanning file ${filePath}:`, error.message);
    }
}

/**
 * Get line number for a match
 */
function getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
}

/**
 * Get line content for a match
 */
function getLineContent(content, index) {
    const lines = content.split('\n');
    const lineNumber = getLineNumber(content, index);
    return lines[lineNumber - 1] || '';
}

/**
 * Get severity level for a pattern category
 */
function getSeverity(category) {
    const severityMap = {
        directLocalStorage: 'HIGH',
        tokenManagers: 'MEDIUM',
        tokenValidation: 'MEDIUM',
        legacyTokenKeys: 'LOW'
    };
    
    return severityMap[category] || 'LOW';
}

/**
 * Get migration suggestion for a pattern
 */
function getSuggestion(category, match) {
    const suggestions = {
        directLocalStorage: {
            'localStorage.getItem': 'Replace with: await TokenAccess.getToken()',
            'localStorage.setItem': 'Replace with: await TokenAccess.setToken(token, expiresAt)',
            'localStorage.removeItem': 'Replace with: await TokenAccess.clearToken()'
        },
        tokenManagers: {
            'new TokenManager': 'Use unified TokenAccess instead of creating new instances',
            '.getAccessToken': 'Replace with: await TokenAccess.getToken()',
            '.tokenManager.': 'Replace with TokenAccess methods'
        },
        tokenValidation: {
            'Date.now()': 'Replace with: TokenAccess.validateTokenExpiry(component)',
            'parseInt': 'Use unified validation instead of manual parsing'
        },
        legacyTokenKeys: {
            'pingone_worker_token': 'Migrated automatically to pingone_token_cache',
            'pingone_token_expiry': 'Migrated automatically to pingone_token_cache',
            'exportToken': 'Replace with unified token access',
            'exportTokenExpires': 'Replace with unified token access'
        }
    };
    
    // Find the most specific suggestion
    const categoryMap = suggestions[category] || {};
    
    for (const [key, suggestion] of Object.entries(categoryMap)) {
        if (match.includes(key)) {
            return suggestion;
        }
    }
    
    return 'Review and migrate to unified token management system';
}

/**
 * Generate migration report
 */
function generateMigrationReport(results) {
    const report = [];
    
    // Header
    report.push('# Unified Token Management Migration Report');
    report.push('');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');
    
    // Summary
    report.push('## 📊 Summary');
    report.push('');
    report.push(`- **Files scanned**: ${results.totalFiles}`);
    report.push(`- **Files with matches**: ${results.files.length}`);
    report.push(`- **Total matches**: ${results.totalMatches}`);
    report.push('');
    
    // Pattern breakdown
    report.push('### Pattern Breakdown');
    report.push('');
    Object.entries(results.patternCounts).forEach(([pattern, count]) => {
        const severity = getSeverity(pattern);
        const emoji = severity === 'HIGH' ? '🔴' : severity === 'MEDIUM' ? '🟡' : '🟢';
        report.push(`- ${emoji} **${pattern}**: ${count} matches (${severity} priority)`);
    });
    report.push('');
    
    // Migration priorities
    report.push('## 🎯 Migration Priorities');
    report.push('');
    report.push('### 🔴 High Priority (Must Fix)');
    report.push('Direct localStorage access that bypasses the unified token manager.');
    report.push('');
    report.push('### 🟡 Medium Priority (Should Fix)');
    report.push('Token manager instances and validation logic that should use unified methods.');
    report.push('');
    report.push('### 🟢 Low Priority (Will Migrate Automatically)');
    report.push('Legacy token keys that are automatically migrated by the unified system.');
    report.push('');
    
    // Detailed findings
    report.push('## 🔍 Detailed Findings');
    report.push('');
    
    // Group by severity
    const filesBySeverity = {
        HIGH: [],
        MEDIUM: [],
        LOW: []
    };
    
    results.files.forEach(file => {
        const highestSeverity = file.matches.reduce((max, match) => {
            const severity = getSeverity(match.category);
            if (severity === 'HIGH') return 'HIGH';
            if (severity === 'MEDIUM' && max !== 'HIGH') return 'MEDIUM';
            return max;
        }, 'LOW');
        
        filesBySeverity[highestSeverity].push(file);
    });
    
    // Report by severity
    ['HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
        const emoji = severity === 'HIGH' ? '🔴' : severity === 'MEDIUM' ? '🟡' : '🟢';
        const files = filesBySeverity[severity];
        
        if (files.length > 0) {
            report.push(`### ${emoji} ${severity} Priority Files (${files.length})`);
            report.push('');
            
            files.forEach(file => {
                report.push(`#### \`${file.path}\``);
                report.push('');
                
                file.matches.forEach(match => {
                    report.push(`**Line ${match.line}**: \`${match.category}\``);
                    report.push('```javascript');
                    report.push(match.lineContent);
                    report.push('```');
                    report.push(`💡 **Suggestion**: ${match.suggestion}`);
                    report.push('');
                });
            });
        }
    });
    
    // Migration steps
    report.push('## 🛠️ Migration Steps');
    report.push('');
    report.push('### Step 1: Initialize Unified Token Manager');
    report.push('```javascript');
    report.push("import { initializePingOneTokenManager } from './src/client/token-manager-init.js';");
    report.push('');
    report.push('// In your main application initialization');
    report.push('await initializePingOneTokenManager(app);');
    report.push('```');
    report.push('');
    
    report.push('### Step 2: Replace Direct localStorage Access');
    report.push('```javascript');
    report.push('// Before (❌)');
    report.push("const token = localStorage.getItem('pingone_worker_token');");
    report.push('');
    report.push('// After (✅)');
    report.push('const token = await TokenAccess.getToken();');
    report.push('```');
    report.push('');
    
    report.push('### Step 3: Replace Token Manager Instances');
    report.push('```javascript');
    report.push('// Before (❌)');
    report.push('const token = await this.tokenManager.getAccessToken();');
    report.push('');
    report.push('// After (✅)');
    report.push('const token = await TokenAccess.getToken();');
    report.push('```');
    report.push('');
    
    report.push('### Step 4: Replace Token Validation');
    report.push('```javascript');
    report.push('// Before (❌)');
    report.push('const isExpired = Date.now() > parseInt(localStorage.getItem("pingone_token_expiry"));');
    report.push('');
    report.push('// After (✅)');
    report.push('const validation = TokenAccess.validateTokenExpiry("my-component");');
    report.push('const isExpired = validation.status === "expired";');
    report.push('```');
    report.push('');
    
    // Testing
    report.push('## 🧪 Testing');
    report.push('');
    report.push('Run the comprehensive test suite after migration:');
    report.push('```bash');
    report.push('npm test -- pingone-token-manager.test.js');
    report.push('```');
    report.push('');
    
    return report.join('\n');
}

/**
 * Display summary to console
 */
function displaySummary(results) {
    console.log('\n📊 Migration Analysis Summary:');
    console.log('─'.repeat(50));
    console.log(`Files scanned: ${results.totalFiles}`);
    console.log(`Files needing migration: ${results.files.length}`);
    console.log(`Total issues found: ${results.totalMatches}`);
    console.log('');
    
    console.log('Issue breakdown:');
    Object.entries(results.patternCounts).forEach(([pattern, count]) => {
        if (count > 0) {
            const severity = getSeverity(pattern);
            const emoji = severity === 'HIGH' ? '🔴' : severity === 'MEDIUM' ? '🟡' : '🟢';
            console.log(`  ${emoji} ${pattern}: ${count} (${severity})`);
        }
    });
}

/**
 * Check if directory exists
 */
async function directoryExists(dirPath) {
    try {
        const stats = await fs.stat(dirPath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

// Run the migration analysis
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}

export {
    main,
    scanCodebase,
    generateMigrationReport
};
