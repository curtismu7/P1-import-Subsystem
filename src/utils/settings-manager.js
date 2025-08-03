import { readFile, writeFile, mkdir, access, constants } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import CredentialValidator from './credential-validator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SETTINGS_PATH = join(__dirname, '../../data/settings.json');
const BACKUP_SETTINGS_PATH = join(__dirname, '../../data/settings.backup.json');

/**
 * Manages application settings with validation and backup
 */
class SettingsManager {
  constructor(settingsPath = DEFAULT_SETTINGS_PATH) {
    this.settingsPath = settingsPath;
    this.backupPath = BACKUP_SETTINGS_PATH;
    this.settings = null;
  }

  /**
   * Initialize settings manager
   */
  async init() {
    try {
      // Try to load settings
      this.settings = await this.loadSettings();
      
      // If loading failed, try to restore from backup
      if (!this.settings) {
        console.warn('⚠️  Could not load settings, attempting to restore from backup...');
        this.settings = await this.restoreFromBackup();
      }
      
      // If still no settings, create default
      if (!this.settings) {
        console.warn('⚠️  No valid settings found, creating default settings...');
        this.settings = this.getDefaultSettings();
        await this.saveSettings(this.settings);
      }
      
      return this.settings;
    } catch (error) {
      console.error('❌ Failed to initialize settings manager:', error);
      throw error;
    }
  }

  /**
   * Load settings from file with validation
   */
  async loadSettings() {
    try {
      const settings = JSON.parse(await readFile(this.settingsPath, 'utf8'));
      const validation = CredentialValidator.validate(settings);
      
      if (!validation.isValid) {
        console.warn('⚠️  Invalid settings format:', validation.errors.join(', '));
        return null;
      }
      
      return settings;
    } catch (error) {
      console.warn('⚠️  Could not load settings:', error.message);
      return null;
    }
  }

  /**
   * Save settings with backup
   */
  async saveSettings(newSettings) {
    try {
      // Validate before saving
      const validation = CredentialValidator.validate(newSettings);
      if (!validation.isValid) {
        throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
      }
      
      // Create backup of current settings
      if (this.settings) {
        await this.createBackup();
      }
      
      // Save new settings
      const settingsWithTimestamp = {
        ...newSettings,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };
      
      await writeFile(
        this.settingsPath, 
        JSON.stringify(settingsWithTimestamp, null, 2),
        'utf8'
      );
      
      this.settings = settingsWithTimestamp;
      return true;
    } catch (error) {
      console.error('❌ Failed to save settings:', error.message);
      
      // Attempt to restore from backup if save failed
      try {
        console.warn('⚠️  Attempting to restore from backup...');
        await this.restoreFromBackup();
      } catch (restoreError) {
        console.error('❌ Failed to restore from backup:', restoreError.message);
      }
      
      throw error;
    }
  }

  /**
   * Create backup of current settings
   */
  async createBackup() {
    try {
      if (!this.settings) return;
      
      await writeFile(
        this.backupPath,
        JSON.stringify({
          ...this.settings,
          backupCreatedAt: new Date().toISOString(),
          isBackup: true
        }, null, 2),
        'utf8'
      );
      
      console.log('✅ Settings backup created');
    } catch (error) {
      console.error('⚠️  Failed to create settings backup:', error.message);
    }
  }

  /**
   * Restore settings from backup
   */
  async restoreFromBackup() {
    try {
      const backup = JSON.parse(await readFile(this.backupPath, 'utf8'));
      const validation = CredentialValidator.validate(backup);
      
      if (!validation.isValid) {
        throw new Error('Invalid backup file');
      }
      
      await writeFile(this.settingsPath, JSON.stringify(backup, null, 2), 'utf8');
      this.settings = backup;
      
      console.log('✅ Settings restored from backup');
      return backup;
    } catch (error) {
      console.error('❌ Failed to restore from backup:', error.message);
      return null;
    }
  }

  /**
   * Get default settings
   */
  getDefaultSettings() {
    return {
      environmentId: '',
      apiClientId: '',
      apiSecret: '',
      region: 'NA',
      rateLimit: 90,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };
  }
  
  /**
   * Get current settings
   */
  getSettings() {
    return this.settings || this.getDefaultSettings();
  }
}

export default SettingsManager;
