/**
 * Cleanup Script for Backup Files
 * 
 * This script safely removes unnecessary backup files from the source directories
 * while preserving all test scripts and backup files in the backups directory.
 * 
 * @version 6.5.2.4
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// Directories to clean
const directoriesToClean = [
    path.join(path.dirname(__dirname), 'src/client/subsystems'),
    path.join(path.dirname(__dirname), 'src/client/components')
];

// File patterns to match for removal
const backupPattern = /\.backup-\d+$/;

// Files to preserve (never delete these)
const preservePatterns = [
    /test/i,
    /spec/i,
    /jest/i
];

async function isDirectory(filePath) {
    try {
        const stats = await stat(filePath);
        return stats.isDirectory();
    } catch (error) {
        console.error(`Error checking if path is directory: ${filePath}`, error);
        return false;
    }
}

function shouldPreserve(filePath) {
    const fileName = path.basename(filePath);
    return preservePatterns.some(pattern => pattern.test(fileName));
}

function isBackupFile(filePath) {
    const fileName = path.basename(filePath);
    return backupPattern.test(fileName);
}

async function cleanDirectory(dirPath) {
    try {
        console.log(`Cleaning directory: ${dirPath}`);
        const files = await readdir(dirPath);
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            
            if (await isDirectory(filePath)) {
                // Skip directories
                continue;
            }
            
            if (shouldPreserve(filePath)) {
                console.log(`Preserving: ${filePath}`);
                continue;
            }
            
            if (isBackupFile(filePath)) {
                console.log(`Removing backup file: ${filePath}`);
                try {
                    await unlink(filePath);
                    console.log(`Successfully removed: ${filePath}`);
                } catch (error) {
                    console.error(`Error removing file: ${filePath}`, error);
                }
            }
        }
    } catch (error) {
        console.error(`Error cleaning directory: ${dirPath}`, error);
    }
}

async function main() {
    console.log('Starting cleanup of unnecessary backup files...');
    
    for (const dir of directoriesToClean) {
        await cleanDirectory(dir);
    }
    
    console.log('Cleanup completed successfully!');
}

main().catch(error => {
    console.error('Error during cleanup:', error);
    process.exit(1);
});
