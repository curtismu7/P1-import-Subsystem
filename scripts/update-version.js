#!/usr/bin/env node

/**
 * Version Update Script
 * 
 * This script automatically updates all version references across the codebase
 * when the version is changed in package.json.
 * 
 * Usage: node scripts/update-version.js
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the current version from package.json
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const currentVersion = packageJson.version;

console.log(`🔄 Updating version references to ${currentVersion}...`);

// Files that need version updates
const filesToUpdate = [
    'public/index.html',
    'src/server/services/winston-config.js',
    'server/winston-config.js',
    'public/js/modules/version-manager.js',
    'public/js/modules/version-display.js'
];

// Patterns to search and replace
const patterns = [
    // HTML version display
    { pattern: /v\d+\.\d+\.\d+\.\d+/, replacement: `v${currentVersion}` },
    // Winston config version fallback
    { pattern: /version: process\.env\.APP_VERSION \|\| '[\d\.]+'/, replacement: `version: process.env.APP_VERSION || '${currentVersion}'` },
    // Version manager
    { pattern: /this\.version = '[\d\.]+'/, replacement: `this.version = '${currentVersion}'` },
    // Version display fallback
    { pattern: /this\.version = '[\d\.]+'/, replacement: `this.version = '${currentVersion}'` },
    // JSDoc version comments
    { pattern: /\* @version [\d\.]+/, replacement: `* @version ${currentVersion}` },
    // Since version comments
    { pattern: /\* @since [\d\.]+/, replacement: `* @since ${currentVersion}` }
];

let updatedFiles = 0;

for (const file of filesToUpdate) {
    try {
        const filePath = join(__dirname, '..', file);
        if (!statSync(filePath).isFile()) {
            console.log(`⚠️  File not found: ${file}`);
            continue;
        }

        let content = readFileSync(filePath, 'utf8');
        let fileUpdated = false;

        for (const { pattern, replacement } of patterns) {
            if (pattern.test(content)) {
                content = content.replace(pattern, replacement);
                fileUpdated = true;
            }
        }

        if (fileUpdated) {
            writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Updated: ${file}`);
            updatedFiles++;
        } else {
            console.log(`ℹ️  No changes needed: ${file}`);
        }
    } catch (error) {
        console.error(`❌ Error updating ${file}:`, error.message);
    }
}

console.log(`\n🎉 Version update complete!`);
console.log(`📊 Updated ${updatedFiles} files to version ${currentVersion}`);
console.log(`\n💡 Remember to:`);
console.log(`   1. Commit the changes`);
console.log(`   2. Rebuild the frontend: npm run build`);
console.log(`   3. Restart the server: npm run dev`);