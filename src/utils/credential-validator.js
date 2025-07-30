import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Validates PingOne credentials
 */
class CredentialValidator {
  /**
   * Validate credentials format
   * @param {Object} credentials - Credentials to validate
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  static validate(credentials) {
    const errors = [];
    
    if (!credentials.environmentId || !this.isValidUuid(credentials.environmentId)) {
      errors.push('Invalid or missing environmentId');
    }
    
    if (!credentials.apiClientId || !this.isValidUuid(credentials.apiClientId)) {
      errors.push('Invalid or missing apiClientId');
    }
    
    if (!credentials.apiSecret || credentials.apiSecret.length < 20) {
      errors.push('Invalid or missing apiSecret');
    }
    
    const validRegions = ['NorthAmerica', 'Europe', 'Canada', 'Asia', 'Australia', 'US', 'EU', 'AP'];
    if (!credentials.region || !validRegions.includes(credentials.region)) {
      errors.push(`Invalid region. Must be one of: ${validRegions.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate UUID format
   */
  static isValidUuid(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
  
  /**
   * Load and validate settings from file
   */
  static async loadAndValidate(settingsPath = './data/settings.json') {
    try {
      const settings = JSON.parse(await readFile(settingsPath, 'utf8'));
      const validation = this.validate(settings);
      
      if (!validation.isValid) {
        console.error('❌ Invalid settings:', validation.errors.join(', '));
        return null;
      }
      
      return settings;
    } catch (error) {
      console.error('❌ Error loading settings:', error.message);
      return null;
    }
  }
}

export default CredentialValidator;
