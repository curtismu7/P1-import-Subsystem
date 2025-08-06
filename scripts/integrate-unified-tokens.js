#!/usr/bin/env node

/**
 * Unified Token Management Integration Script
 * 
 * This script integrates the unified token management system into the application
 * by systematically replacing direct localStorage access with TokenAccess calls.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    // Files to process for token integration
    targetFiles: [
        'public/js/modules/token-status-indicator.js',
        'public/js/modules/global-token-manager.js',
        'public/js/modules/token-manager.js',
        'public/js/modules/connection-manager-subsystem.js',
        'public/js/modules/auth-management-subsystem.js',
        'public/js/app.js'
    ],
    
    // Backup directory
    backupDir: 'backups/token-integration',
    
    // Token access patterns to replace
    replacements: [
        {
            pattern: /localStorage\.getItem\s*\(\s*['"`]pingone_worker_token['"`]\s*\)/g,
            replacement: 'await TokenAccess.getToken()',
            description: 'Replace direct worker token access'
        },
        {
            pattern: /localStorage\.getItem\s*\(\s*['"`]pingone_token_expiry['"`]\s*\)/g,
            replacement: 'TokenAccess.getTokenInfo().expiresAt',
            description: 'Replace direct token expiry access'
        },
        {
            pattern: /localStorage\.setItem\s*\(\s*['"`]pingone_worker_token['"`]\s*,\s*([^)]+)\)/g,
            replacement: 'await TokenAccess.setToken($1, Date.now() + 3600000)',
            description: 'Replace direct token setting'
        },
        {
            pattern: /localStorage\.removeItem\s*\(\s*['"`]pingone_worker_token['"`]\s*\)/g,
            replacement: 'await TokenAccess.clearToken()',
            description: 'Replace direct token removal'
        },
        {
            pattern: /localStorage\.getItem\s*\(\s*['"`]exportToken['"`]\s*\)/g,
            replacement: 'await TokenAccess.getToken()',
            description: 'Replace export token access'
        }
    ]
};

/**
 * Main integration function
 */
async function main() {
    try {
        console.log('🚀 Starting Unified Token Management Integration...\n');
        
        // Create backup directory
        await createBackupDirectory();
        
        // Process each target file
        let totalReplacements = 0;
        
        for (const filePath of CONFIG.targetFiles) {
            const fullPath = path.resolve(filePath);
            
            if (await fileExists(fullPath)) {
                console.log(`📝 Processing: ${filePath}`);
                const replacements = await processFile(fullPath);
                totalReplacements += replacements;
                
                if (replacements > 0) {
                    console.log(`   ✅ Made ${replacements} replacements`);
                } else {
                    console.log(`   ℹ️  No changes needed`);
                }
            } else {
                console.log(`   ⚠️  File not found: ${filePath}`);
            }
        }
        
        // Add TokenAccess import to files that need it
        await addTokenAccessImports();
        
        console.log(`\n✅ Integration completed successfully!`);
        console.log(`📊 Total replacements made: ${totalReplacements}`);
        console.log(`💾 Backups saved to: ${CONFIG.backupDir}`);
        
        // Display next steps
        displayNextSteps();
        
    } catch (error) {
        console.error('❌ Integration failed:', error);
        process.exit(1);
    }
}

/**
 * Create backup directory
 */
async function createBackupDirectory() {
    try {
        await fs.mkdir(CONFIG.backupDir, { recursive: true });
        console.log(`📁 Created backup directory: ${CONFIG.backupDir}`);
    } catch (error) {
        console.error('Failed to create backup directory:', error);
        throw error;
    }
}

/**
 * Process a single file for token integration
 */
async function processFile(filePath) {
    try {
        // Read original content
        const originalContent = await fs.readFile(filePath, 'utf8');
        let modifiedContent = originalContent;
        let replacementCount = 0;
        
        // Create backup
        const backupPath = path.join(CONFIG.backupDir, path.basename(filePath));
        await fs.writeFile(backupPath, originalContent, 'utf8');
        
        // Apply replacements
        for (const replacement of CONFIG.replacements) {
            const matches = modifiedContent.match(replacement.pattern);
            if (matches) {
                modifiedContent = modifiedContent.replace(replacement.pattern, replacement.replacement);
                replacementCount += matches.length;
                console.log(`     🔄 ${replacement.description}: ${matches.length} replacements`);
            }
        }
        
        // Write modified content if changes were made
        if (replacementCount > 0) {
            await fs.writeFile(filePath, modifiedContent, 'utf8');
        }
        
        return replacementCount;
        
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        return 0;
    }
}

/**
 * Add TokenAccess imports to files that need them
 */
async function addTokenAccessImports() {
    console.log('\n📦 Adding TokenAccess imports...');
    
    const filesToUpdate = [
        {
            path: 'public/js/modules/token-status-indicator.js',
            importLine: "import { TokenAccess } from '../../../src/shared/token-integration-helper.js';"
        },
        {
            path: 'public/js/modules/global-token-manager.js',
            importLine: "import { TokenAccess } from '../../../src/shared/token-integration-helper.js';"
        },
        {
            path: 'public/js/modules/connection-manager-subsystem.js',
            importLine: "import { TokenAccess } from '../../../src/shared/token-integration-helper.js';"
        }
    ];
    
    for (const fileInfo of filesToUpdate) {
        if (await fileExists(fileInfo.path)) {
            await addImportToFile(fileInfo.path, fileInfo.importLine);
            console.log(`   ✅ Added import to: ${fileInfo.path}`);
        }
    }
}

/**
 * Add import statement to a file
 */
async function addImportToFile(filePath, importLine) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        
        // Check if import already exists
        if (content.includes('TokenAccess')) {
            return; // Already has the import
        }
        
        // Find the best place to add the import
        const lines = content.split('\n');
        let insertIndex = 0;
        
        // Look for existing imports
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('import ')) {
                insertIndex = i + 1;
            } else if (lines[i].trim() === '' && insertIndex > 0) {
                // Found empty line after imports
                break;
            } else if (!lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('/*') && lines[i].trim() !== '') {
                // Found first non-comment, non-empty line
                break;
            }
        }
        
        // Insert the import
        lines.splice(insertIndex, 0, importLine);
        
        // Write back to file
        await fs.writeFile(filePath, lines.join('\n'), 'utf8');
        
    } catch (error) {
        console.error(`Error adding import to ${filePath}:`, error);
    }
}

/**
 * Check if file exists
 */
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Display next steps
 */
function displayNextSteps() {
    console.log('\n📋 Next Steps:');
    console.log('');
    console.log('1. 🧪 Run the test suite:');
    console.log('   npm test -- pingone-token-manager.test.js');
    console.log('');
    console.log('2. 🔄 Restart the application:');
    console.log('   npm run restart');
    console.log('');
    console.log('3. 🔍 Monitor the logs for token operations:');
    console.log('   tail -f logs/application.log | grep -i token');
    console.log('');
    console.log('4. 🌐 Test the application in browser:');
    console.log('   - Check token status indicator');
    console.log('   - Verify token refresh functionality');
    console.log('   - Test import/export operations');
    console.log('');
    console.log('5. 📊 Review migration report:');
    console.log('   cat migration-report.md');
    console.log('');
    console.log('🎉 The unified token management system is now integrated!');
}

// Run the integration
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Integration failed:', error);
        process.exit(1);
    });
}

export { main };
