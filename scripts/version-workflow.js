#!/usr/bin/env node

/**
 * Version Update Workflow
 * 
 * This script handles the complete version update process:
 * 1. Updates all version references
 * 2. Rebuilds the frontend
 * 3. Restarts the server
 * 
 * Usage: node scripts/version-workflow.js [new-version]
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const newVersion = process.argv[2];

if (!newVersion) {
    console.error('❌ Please provide a new version number');
    console.error('Usage: node scripts/version-workflow.js 6.5.1.5');
    process.exit(1);
}

console.log(`🚀 Starting version update workflow to ${newVersion}...`);

try {
    // 1. Update package.json version
    console.log('📦 Updating package.json version...');
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    packageJson.version = newVersion;
    writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
    console.log('✅ package.json updated');

    // 2. Update all version references
    console.log('🔄 Updating version references...');
    execSync('node scripts/update-version.js', { stdio: 'inherit' });

    // 3. Rebuild frontend
    console.log('🔨 Rebuilding frontend...');
    execSync('npm run build', { stdio: 'inherit' });

    // 4. Restart server
    console.log('🔄 Restarting server...');
    execSync('pkill -f "node.*server.js"', { stdio: 'ignore' });
    execSync('sleep 2', { stdio: 'ignore' });
    execSync('npm run dev', { stdio: 'inherit', detached: true });

    console.log('\n🎉 Version update workflow completed successfully!');
    console.log(`📊 New version: ${newVersion}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Test the application in your browser');
    console.log('   2. Commit the changes: git add . && git commit -m "Update version to ' + newVersion + '"');
    console.log('   3. Push to repository: git push');

} catch (error) {
    console.error('❌ Version update workflow failed:', error.message);
    process.exit(1);
}