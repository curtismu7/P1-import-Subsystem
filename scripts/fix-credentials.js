#!/usr/bin/env node

/**
 * Fix Credentials Script
 * 
 * This script fixes credential encryption mismatches by:
 * 1. Decrypting credentials with the old key (if possible)
 * 2. Re-encrypting them with the current key
 * 3. Or providing a way to manually update them
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing Credential Encryption...');

async function fixCredentials() {
    try {
        const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
        const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
        
        console.log('📋 Current settings found:');
        console.log(`  - Environment ID: ${settings.pingone_environment_id ? 'Set' : 'Not set'}`);
        console.log(`  - Client ID: ${settings.pingone_client_id ? 'Set' : 'Not set'}`);
        console.log(`  - Client Secret: ${settings.pingone_client_secret ? 'Encrypted' : 'Not set'}`);
        console.log(`  - Region: ${settings.pingone_region || 'Not set'}`);
        
        // Check if client secret is encrypted
        if (settings.pingone_client_secret && settings.pingone_client_secret.startsWith('enc:')) {
            console.log('\n🔐 Client secret is encrypted. Attempting to fix...');
            
            // Try to decrypt with current key
            try {
                const decrypted = await decryptWithCurrentKey(settings.pingone_client_secret);
                console.log('✅ Successfully decrypted with current key');
                
                // Re-encrypt with current key
                const reEncrypted = await encryptWithCurrentKey(decrypted);
                console.log('✅ Successfully re-encrypted with current key');
                
                // Update settings
                settings.pingone_client_secret = reEncrypted;
                await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
                
                console.log('✅ Credentials fixed! Updated settings.json');
                console.log('💡 You can now restart the server normally');
                
            } catch (decryptError) {
                console.log('❌ Could not decrypt with current key');
                console.log('💡 This means the credentials were encrypted with a different key');
                
                // Provide manual fix instructions
                await provideManualFixInstructions(settings);
            }
        } else {
            console.log('✅ No encrypted credentials found - nothing to fix');
        }
        
    } catch (error) {
        console.error('❌ Error fixing credentials:', error.message);
        process.exit(1);
    }
}

async function decryptWithCurrentKey(encryptedValue) {
    const crypto = await import('crypto');
    
    // Get current encryption key
    const envKey = process.env.AUTH_SUBSYSTEM_ENCRYPTION_KEY;
    if (!envKey) {
        throw new Error('No encryption key found in environment');
    }
    
    const key = Buffer.from(envKey.padEnd(32).slice(0, 32));
    
    // Remove 'enc:' prefix
    const data = encryptedValue.substring(4);
    
    // Split IV and encrypted data
    const parts = data.split(':');
    if (parts.length !== 2) {
        throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // Decrypt using AES-256-CBC
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

async function encryptWithCurrentKey(value) {
    const crypto = await import('crypto');
    
    // Get current encryption key
    const envKey = process.env.AUTH_SUBSYSTEM_ENCRYPTION_KEY;
    if (!envKey) {
        throw new Error('No encryption key found in environment');
    }
    
    const key = Buffer.from(envKey.padEnd(32).slice(0, 32));
    
    // Generate IV
    const iv = crypto.randomBytes(16);
    
    // Encrypt using AES-256-CBC
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Combine IV and encrypted data
    const result = iv.toString('hex') + ':' + encrypted;
    
    // Return with prefix
    return 'enc:' + result;
}

async function provideManualFixInstructions(settings) {
    console.log('\n🔧 Manual Fix Required');
    console.log('=====================');
    console.log('Your credentials were encrypted with a different key.');
    console.log('You have two options:');
    
    console.log('\n📝 Option 1: Update credentials manually');
    console.log('1. Open data/settings.json');
    console.log('2. Replace the encrypted client_secret with your actual secret');
    console.log('3. Save the file');
    console.log('4. Restart the server');
    
    console.log('\n🔄 Option 2: Reset encryption key');
    console.log('1. Delete the .env file');
    console.log('2. Restart the server (it will generate a new key)');
    console.log('3. Re-enter your credentials in the web interface');
    
    console.log('\n💡 Option 3: Use plain text (less secure)');
    console.log('1. Open data/settings.json');
    console.log('2. Remove the "enc:" prefix from pingone_client_secret');
    console.log('3. Save the file');
    console.log('4. Restart the server');
    
    // Create a backup of current settings
    const backupPath = path.join(process.cwd(), 'data', 'settings.json.backup');
    await fs.writeFile(backupPath, JSON.stringify(settings, null, 2), 'utf8');
    console.log(`\n💾 Backup created: ${backupPath}`);
}

// Run the fix
fixCredentials();
