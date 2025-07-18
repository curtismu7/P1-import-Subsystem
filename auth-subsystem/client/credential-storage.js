/**
 * Credential Storage
 * 
 * Provides secure storage and retrieval of API credentials in the browser
 * using localStorage with encryption for sensitive data.
 * 
 * This class handles:
 * - Secure storage of API credentials in localStorage
 * - Encryption of sensitive data using Web Crypto API
 * - Fallback to base64 encoding when Web Crypto is unavailable
 * - Key management with session storage persistence
 * 
 * Security features:
 * - Uses AES-GCM encryption with 256-bit keys when available
 * - Generates unique IVs for each encryption operation
 * - Stores encryption keys in session storage (cleared on browser close)
 * - Prefixes encrypted values for easy identification
 * - Provides fallback mechanisms for older browsers
 */

class CredentialStorage {
    constructor(logger) {
        this.logger = logger || console;
        this.storageKey = 'pingone-credentials';
        this.encryptionPrefix = 'enc:';
    }

    /**
     * Save credentials to localStorage with encryption for sensitive data
     * @param {Object} credentials - The credentials to save
     * @returns {Promise<boolean>} True if successful
     */
    async saveCredentials(credentials) {
        try {
            if (!credentials || !credentials.apiClientId || !credentials.apiSecret || !credentials.environmentId) {
                this.logger.error('Cannot save incomplete credentials');
                return false;
            }

            // Encrypt the API secret
            const encryptedSecret = await this.encryptValue(credentials.apiSecret);
            
            // Store credentials with encrypted secret
            const credentialsToStore = {
                apiClientId: credentials.apiClientId,
                apiSecret: encryptedSecret,
                environmentId: credentials.environmentId,
                region: credentials.region || 'NorthAmerica',
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(credentialsToStore));
            this.logger.info('Credentials saved to localStorage');
            
            return true;
        } catch (error) {
            this.logger.error('Failed to save credentials to localStorage:', error.message);
            return false;
        }
    }

    /**
     * Get credentials from localStorage with decryption for sensitive data
     * @returns {Promise<Object|null>} The credentials or null if not found
     */
    async getCredentials() {
        try {
            const storedData = localStorage.getItem(this.storageKey);
            
            if (!storedData) {
                return null;
            }
            
            const credentials = JSON.parse(storedData);
            
            // Decrypt the API secret if it's encrypted
            if (credentials.apiSecret && this.isEncrypted(credentials.apiSecret)) {
                credentials.apiSecret = await this.decryptValue(credentials.apiSecret);
            }
            
            return credentials;
        } catch (error) {
            this.logger.error('Failed to get credentials from localStorage:', error.message);
            return null;
        }
    }

    /**
     * Clear credentials from localStorage
     * @returns {boolean} True if successful
     */
    clearCredentials() {
        try {
            localStorage.removeItem(this.storageKey);
            this.logger.info('Credentials cleared from localStorage');
            return true;
        } catch (error) {
            this.logger.error('Failed to clear credentials from localStorage:', error.message);
            return false;
        }
    }

    /**
     * Check if credentials exist in localStorage
     * @returns {boolean} True if credentials exist
     */
    hasCredentials() {
        return !!localStorage.getItem(this.storageKey);
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
     * Encrypt a value using Web Crypto API
     * @param {string} value - The value to encrypt
     * @returns {Promise<string>} The encrypted value with 'enc:' prefix
     */
    async encryptValue(value) {
        if (!value) {
            return value;
        }
        
        try {
            // If already encrypted, return as is
            if (this.isEncrypted(value)) {
                return value;
            }
            
            // Check if Web Crypto API is available
            if (!window.crypto || !window.crypto.subtle) {
                this.logger.warn('Web Crypto API not available, using base64 encoding as fallback');
                return this.encryptionPrefix + btoa(value);
            }
            
            // Get or generate encryption key
            const key = await this.getEncryptionKey();
            
            // Generate random IV
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            
            // Encode the value to encrypt
            const encodedValue = new TextEncoder().encode(value);
            
            // Encrypt the value
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encodedValue
            );
            
            // Convert encrypted data to base64
            const encryptedArray = new Uint8Array(encryptedBuffer);
            const encryptedBase64 = btoa(String.fromCharCode.apply(null, encryptedArray));
            
            // Convert IV to base64
            const ivBase64 = btoa(String.fromCharCode.apply(null, iv));
            
            // Combine IV and encrypted data
            return this.encryptionPrefix + ivBase64 + ':' + encryptedBase64;
        } catch (error) {
            this.logger.error('Encryption failed:', error.message);
            
            // Fallback to base64 encoding
            this.logger.warn('Using base64 encoding as fallback');
            return this.encryptionPrefix + btoa(value);
        }
    }

    /**
     * Decrypt a value using Web Crypto API
     * @param {string} encryptedValue - The encrypted value with 'enc:' prefix
     * @returns {Promise<string>} The decrypted value
     */
    async decryptValue(encryptedValue) {
        if (!encryptedValue || !this.isEncrypted(encryptedValue)) {
            return encryptedValue;
        }
        
        try {
            // Remove prefix
            const data = encryptedValue.substring(this.encryptionPrefix.length);
            
            // Check if it's a simple base64 encoding (fallback)
            if (!data.includes(':')) {
                return atob(data);
            }
            
            // Check if Web Crypto API is available
            if (!window.crypto || !window.crypto.subtle) {
                this.logger.warn('Web Crypto API not available, assuming base64 encoding');
                return atob(data);
            }
            
            // Split IV and encrypted data
            const parts = data.split(':');
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted format');
            }
            
            const ivBase64 = parts[0];
            const encryptedBase64 = parts[1];
            
            // Convert base64 to array buffers
            const iv = new Uint8Array([...atob(ivBase64)].map(c => c.charCodeAt(0)));
            const encryptedData = new Uint8Array([...atob(encryptedBase64)].map(c => c.charCodeAt(0)));
            
            // Get encryption key
            const key = await this.getEncryptionKey();
            
            // Decrypt the value
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encryptedData
            );
            
            // Decode the decrypted value
            return new TextDecoder().decode(decryptedBuffer);
        } catch (error) {
            this.logger.error('Decryption failed:', error.message);
            
            // Try simple base64 decoding as fallback
            try {
                const data = encryptedValue.substring(this.encryptionPrefix.length);
                return atob(data);
            } catch (e) {
                this.logger.error('Fallback decryption failed:', e.message);
                throw new Error('Failed to decrypt value');
            }
        }
    }

    /**
     * Get or generate encryption key
     * @returns {Promise<CryptoKey>} The encryption key
     */
    async getEncryptionKey() {
        try {
            // Try to get key from session storage
            const storedKey = sessionStorage.getItem('pingone-crypto-key');
            
            if (storedKey) {
                // Convert stored key back to CryptoKey
                const keyData = new Uint8Array([...atob(storedKey)].map(c => c.charCodeAt(0)));
                
                return await window.crypto.subtle.importKey(
                    'raw',
                    keyData,
                    { name: 'AES-GCM', length: 256 },
                    false,
                    ['encrypt', 'decrypt']
                );
            }
            
            // Generate a new key
            const key = await window.crypto.subtle.generateKey(
                {
                    name: 'AES-GCM',
                    length: 256
                },
                true,
                ['encrypt', 'decrypt']
            );
            
            // Export key to store in session storage
            const exportedKey = await window.crypto.subtle.exportKey('raw', key);
            const keyArray = new Uint8Array(exportedKey);
            const keyBase64 = btoa(String.fromCharCode.apply(null, keyArray));
            
            // Store key in session storage
            sessionStorage.setItem('pingone-crypto-key', keyBase64);
            
            return key;
        } catch (error) {
            this.logger.error('Failed to get encryption key:', error.message);
            throw error;
        }
    }
}

export default CredentialStorage;