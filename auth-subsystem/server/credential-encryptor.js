/**
 * Credential Encryptor
 * 
 * Provides secure encryption and decryption of API credentials using AES-256
 * for storing sensitive information in data/settings.json
 * 
 * This utility class handles:
 * - Secure encryption of API secrets using AES-256-CBC
 * - Decryption of stored credentials when needed
 * - Reading and writing encrypted settings to disk
 * - Key management with environment variable support
 * 
 * Security features:
 * - Uses industry-standard AES-256-CBC encryption
 * - Generates unique IVs for each encryption operation
 * - Supports custom encryption keys via environment variables
 * - Prefixes encrypted values for easy identification
 * - Safely handles already-encrypted values
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CredentialEncryptor {
    constructor(logger) {
        this.logger = logger || console;
        this.algorithm = 'aes-256-cbc';
        this.encryptionPrefix = 'enc:';
        this.keyLength = 32; // 256 bits
        this.ivLength = 16; // 128 bits
    }

    /**
     * Get the encryption key from environment variable or generate a default one
     * @returns {Buffer} The encryption key
     */
    async getEncryptionKey() {
        const envKey = process.env.AUTH_SUBSYSTEM_ENCRYPTION_KEY;
        
        if (envKey) {
            // Use the key from environment variable
            return Buffer.from(envKey.padEnd(this.keyLength).slice(0, this.keyLength));
        }
        
        // Use a default key (less secure, but functional)
        this.logger.warn('No AUTH_SUBSYSTEM_ENCRYPTION_KEY found in environment, using default key');
        return Buffer.from('PingOneImportToolDefaultEncryptionKey32'.slice(0, this.keyLength));
    }

    /**
     * Encrypt a value using AES-256-CBC
     * @param {string} value - The value to encrypt
     * @returns {Promise<string>} The encrypted value with 'enc:' prefix
     */
    async encrypt(value) {
        if (!value) {
            return value;
        }
        
        try {
            // If already encrypted, return as is
            if (value.startsWith(this.encryptionPrefix)) {
                return value;
            }
            
            const key = await this.getEncryptionKey();
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            
            let encrypted = cipher.update(value, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            
            // Combine IV and encrypted data
            const result = iv.toString('hex') + ':' + encrypted;
            
            // Return with prefix
            return this.encryptionPrefix + result;
        } catch (error) {
            this.logger.error('Encryption failed:', error.message);
            throw new Error('Failed to encrypt value');
        }
    }

    /**
     * Decrypt a value that was encrypted with AES-256-CBC
     * @param {string} encryptedValue - The encrypted value with 'enc:' prefix
     * @returns {Promise<string>} The decrypted value
     */
    async decrypt(encryptedValue) {
        if (!encryptedValue || !encryptedValue.startsWith(this.encryptionPrefix)) {
            return encryptedValue;
        }
        
        try {
            // Remove prefix
            const data = encryptedValue.substring(this.encryptionPrefix.length);
            
            // Split IV and encrypted data
            const parts = data.split(':');
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted format');
            }
            
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            
            const key = await this.getEncryptionKey();
            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            
            let decrypted = decipher.update(encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            this.logger.error('Decryption failed:', error.message);
            throw new Error('Failed to decrypt value');
        }
    }

    /**
     * Check if a value is encrypted
     * @param {string} value - The value to check
     * @returns {boolean} True if the value is encrypted
     */
    isEncrypted(value) {
        return value && typeof value === 'string' && value.startsWith(this.encryptionPrefix);
    }

    /**
     * Read settings from file and decrypt sensitive values
     * @returns {Promise<Object>} The decrypted settings
     */
    async readAndDecryptSettings() {
        try {
            const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
            const data = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(data);
            
            // Decrypt pingone_client_secret if it's encrypted
            if (settings.pingone_client_secret && this.isEncrypted(settings.pingone_client_secret)) {
                settings.pingone_client_secret = await this.decrypt(settings.pingone_client_secret);
            }
            
            return settings;
        } catch (error) {
            this.logger.error('Failed to read and decrypt settings:', error.message);
            return null;
        }
    }

    /**
     * Encrypt sensitive values in settings and write to file
     * @param {Object} settings - The settings to encrypt and save
     * @returns {Promise<boolean>} True if successful
     */
    async encryptAndSaveSettings(settings) {
        try {
            const settingsToSave = { ...settings };
            
            // Encrypt pingone_client_secret if it's not already encrypted
            if (settingsToSave.pingone_client_secret && !this.isEncrypted(settingsToSave.pingone_client_secret)) {
                settingsToSave.pingone_client_secret = await this.encrypt(settingsToSave.pingone_client_secret);
            }
            
            const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
            await fs.writeFile(settingsPath, JSON.stringify(settingsToSave, null, 2), 'utf8');
            
            return true;
        } catch (error) {
            this.logger.error('Failed to encrypt and save settings:', error.message);
            return false;
        }
    }
}

export default CredentialEncryptor;