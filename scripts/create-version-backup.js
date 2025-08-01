#!/usr/bin/env node

/**
 * Version Backup Script
 * 
 * Creates a comprehensive backup of the current version's critical files.
 * This script can be run manually or as part of the deployment process.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Get version from package.json
async function getCurrentVersion() {
  try {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8')
    );
    return packageJson.version;
  } catch (error) {
    console.error('Error reading package.json:', error.message);
    process.exit(1);
  }
}

// Create backup directory
async function createBackupDirectory(version) {
  const backupDir = path.join(projectRoot, 'backups', `v${version}`);
  
  try {
    await fs.mkdir(backupDir, { recursive: true });
    console.log(`Created backup directory: ${backupDir}`);
    return backupDir;
  } catch (error) {
    console.error('Error creating backup directory:', error.message);
    process.exit(1);
  }
}

// Copy files to backup directory
async function backupFiles(backupDir, version) {
  try {
    // Files to backup
    const filesToBackup = [
      'package.json',
      'server.js',
      '.env.example'
    ];
    
    // Directories to backup
    const dirsToBackup = [
      'public/js/modules',
      'src/client',
      'routes/api'
    ];
    
    // Copy individual files
    for (const file of filesToBackup) {
      const sourcePath = path.join(projectRoot, file);
      const destPath = path.join(backupDir, path.basename(file));
      
      try {
        await fs.copyFile(sourcePath, destPath);
        console.log(`✅ Backed up: ${file}`);
      } catch (error) {
        console.warn(`⚠️ Could not backup ${file}: ${error.message}`);
      }
    }
    
    // Copy directories
    for (const dir of dirsToBackup) {
      const sourcePath = path.join(projectRoot, dir);
      const destPath = path.join(backupDir, path.basename(dir));
      
      try {
        // Create the directory first
        await fs.mkdir(destPath, { recursive: true });
        
        // Use cp -r for directory copying (more reliable than recursive JS implementation)
        execSync(`cp -r "${sourcePath}"/* "${destPath}"/`);
        console.log(`✅ Backed up directory: ${dir}`);
      } catch (error) {
        console.warn(`⚠️ Could not backup directory ${dir}: ${error.message}`);
      }
    }
    
    // Create a version info file
    const versionInfo = {
      version,
      timestamp: new Date().toISOString(),
      backupDate: new Date().toLocaleDateString(),
      backupTime: new Date().toLocaleTimeString()
    };
    
    await fs.writeFile(
      path.join(backupDir, 'version-info.json'),
      JSON.stringify(versionInfo, null, 2)
    );
    
    console.log('✅ Created version info file');
    console.log(`\n🎉 Backup completed for version ${version}`);
  } catch (error) {
    console.error('Error during backup process:', error.message);
    process.exit(1);
  }
}

// Main function
async function main() {
  try {
    console.log('🔄 Starting version backup process...');
    
    // Get current version
    const version = await getCurrentVersion();
    console.log(`📦 Current version: ${version}`);
    
    // Create backup directory
    const backupDir = await createBackupDirectory(version);
    
    // Backup files
    await backupFiles(backupDir, version);
    
  } catch (error) {
    console.error('Backup process failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
