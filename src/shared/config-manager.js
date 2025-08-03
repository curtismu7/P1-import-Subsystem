/**
 * Centralized Configuration Manager
 * 
 * Manages all application configuration with environment-specific overrides,
 * validation, and runtime configuration updates.
 * 
 * Features:
 * - Environment-specific configurations
 * - Configuration validation
 * - Runtime configuration updates
 * - Secure handling of sensitive data
 * - Configuration change notifications
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { debugLog, DEBUG_CATEGORIES } from './debug-utils.js';

// Configuration schema for validation
const CONFIG_SCHEMA = {
  server: {
    port: { type: 'number', default: 4000, min: 1000, max: 65535 },
    host: { type: 'string', default: 'localhost' },
    environment: { type: 'string', default: 'development', enum: ['development', 'test', 'production'] }
  },
  pingone: {
    environmentId: { type: 'string', required: true },
    clientId: { type: 'string', required: true },
    clientSecret: { type: 'string', required: true, sensitive: true },
    region: { type: 'string', default: 'NorthAmerica', enum: ['NorthAmerica', 'Europe', 'Asia'] }
  },
  logging: {
    level: { type: 'string', default: 'info', enum: ['error', 'warn', 'info', 'debug', 'trace'] },
    enableFileLogging: { type: 'boolean', default: true },
    maxFileSize: { type: 'number', default: 10485760 }, // 10MB
    maxFiles: { type: 'number', default: 5 }
  },
  security: {
    enableRateLimit: { type: 'boolean', default: true },
    rateLimitWindow: { type: 'number', default: 900000 }, // 15 minutes
    rateLimitMax: { type: 'number', default: 100 },
    enableCors: { type: 'boolean', default: true },
    corsOrigins: { type: 'array', default: ['http://localhost:3000', 'http://localhost:4000'] }
  },
  features: {
    enableWebSocket: { type: 'boolean', default: true },
    enableSwagger: { type: 'boolean', default: true },
    enableMetrics: { type: 'boolean', default: true },
    maxFileUploadSize: { type: 'number', default: 10485760 }, // 10MB
    importBatchSize: { type: 'number', default: 5, min: 1, max: 50 }
  },
  debug: {
    enableDebugMode: { type: 'boolean', default: false },
    debugLevel: { type: 'string', default: 'info', enum: ['error', 'warn', 'info', 'debug', 'trace'] },
    debugCategories: { type: 'array', default: ['all'] },
    enablePerformanceMonitoring: { type: 'boolean', default: true }
  }
};

class ConfigManager extends EventEmitter {
  constructor() {
    super();
    this.config = {};
    this.configPath = path.join(process.cwd(), 'data', 'settings.json');
    this.envConfigPath = path.join(process.cwd(), 'config', 'environment.json');
    this.isInitialized = false;
    this.watchers = new Map();
    
    debugLog.info('ConfigManager initialized', {}, DEBUG_CATEGORIES.API);
  }
  
  /**
   * Initialize configuration manager
   */
  async init() {
    try {
      debugLog.info('Loading application configuration...', {}, DEBUG_CATEGORIES.API);
      
      // Load base configuration
      await this.loadBaseConfig();
      
      // Load environment-specific overrides
      await this.loadEnvironmentConfig();
      
      // Apply environment variable overrides
      this.applyEnvironmentVariables();
      
      // Validate configuration
      this.validateConfig();
      
      // Set up file watchers for hot reloading
      await this.setupConfigWatchers();
      
      this.isInitialized = true;
      this.emit('initialized', this.config);
      
      debugLog.info('Configuration loaded successfully', {
        environment: this.config.server.environment,
        features: Object.keys(this.config.features || {}),
        hasSecrets: !!(this.config.pingone?.clientSecret)
      }, DEBUG_CATEGORIES.API);
      
    } catch (error) {
      debugLog.error('Failed to initialize configuration', {
        error: error.message,
        stack: error.stack
      }, DEBUG_CATEGORIES.API);
      throw error;
    }
  }
  
  /**
   * Load base configuration from settings.json
   */
  async loadBaseConfig() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      const settings = JSON.parse(data);
      
      // Transform legacy settings format to new structure
      this.config = this.transformLegacyConfig(settings);
      
      debugLog.debug('Base configuration loaded', {
        configKeys: Object.keys(this.config)
      }, DEBUG_CATEGORIES.API);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        debugLog.warn('Settings file not found, using defaults', {
          path: this.configPath
        }, DEBUG_CATEGORIES.API);
        this.config = this.getDefaultConfig();
      } else {
        throw new Error(`Failed to load base configuration: ${error.message}`);
      }
    }
  }
  
  /**
   * Load environment-specific configuration
   */
  async loadEnvironmentConfig() {
    try {
      const envConfigPath = this.envConfigPath.replace('.json', `.${this.getEnvironment()}.json`);
      const data = await fs.readFile(envConfigPath, 'utf8');
      const envConfig = JSON.parse(data);
      
      // Deep merge environment config
      this.config = this.deepMerge(this.config, envConfig);
      
      debugLog.debug('Environment configuration loaded', {
        environment: this.getEnvironment(),
        path: envConfigPath
      }, DEBUG_CATEGORIES.API);
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        debugLog.warn('Failed to load environment config', {
          error: error.message,
          environment: this.getEnvironment()
        }, DEBUG_CATEGORIES.API);
      }
    }
  }
  
  /**
   * Apply environment variable overrides
   */
  applyEnvironmentVariables() {
    const envMappings = {
      'PORT': 'server.port',
      'NODE_ENV': 'server.environment',
      'PINGONE_ENVIRONMENT_ID': 'pingone.environmentId',
      'PINGONE_CLIENT_ID': 'pingone.clientId',
      'PINGONE_CLIENT_SECRET': 'pingone.clientSecret',
      'PINGONE_REGION': 'pingone.region',
      'LOG_LEVEL': 'logging.level',
      'DEBUG': 'debug.enableDebugMode',
      'DEBUG_LEVEL': 'debug.debugLevel'
    };
    
    Object.entries(envMappings).forEach(([envVar, configPath]) => {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setNestedValue(this.config, configPath, this.parseEnvValue(value));
        debugLog.debug(`Applied environment variable: ${envVar}`, {
          configPath,
          value: configPath.includes('secret') ? '[REDACTED]' : value
        }, DEBUG_CATEGORIES.API);
      }
    });
  }
  
  /**
   * Validate configuration against schema
   */
  validateConfig() {
    const errors = [];
    
    this.validateSection(this.config, CONFIG_SCHEMA, '', errors);
    
    if (errors.length > 0) {
      const errorMessage = `Configuration validation failed:\n${errors.join('\n')}`;
      debugLog.error('Configuration validation failed', { errors }, DEBUG_CATEGORIES.API);
      throw new Error(errorMessage);
    }
    
    debugLog.info('Configuration validation passed', {}, DEBUG_CATEGORIES.API);
  }
  
  /**
   * Validate a configuration section
   */
  validateSection(config, schema, path, errors) {
    Object.entries(schema).forEach(([key, rules]) => {
      const fullPath = path ? `${path}.${key}` : key;
      const value = this.getNestedValue(config, fullPath);
      
      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required field missing: ${fullPath}`);
        return;
      }
      
      // Skip validation if value is undefined and not required
      if (value === undefined) {
        // Set default value if provided
        if (rules.default !== undefined) {
          this.setNestedValue(config, fullPath, rules.default);
        }
        return;
      }
      
      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push(`Invalid type for ${fullPath}: expected ${rules.type}, got ${typeof value}`);
        return;
      }
      
      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`Invalid value for ${fullPath}: must be one of ${rules.enum.join(', ')}`);
        return;
      }
      
      // Range validation for numbers
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Value too small for ${fullPath}: minimum is ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Value too large for ${fullPath}: maximum is ${rules.max}`);
        }
      }
    });
  }
  
  /**
   * Set up configuration file watchers
   */
  async setupConfigWatchers() {
    if (process.env.NODE_ENV === 'production') {
      debugLog.info('Skipping config watchers in production', {}, DEBUG_CATEGORIES.API);
      return;
    }
    
    try {
      const { watch } = await import('fs');
      
      // Watch main config file
      const configWatcher = watch(this.configPath, (eventType) => {
        if (eventType === 'change') {
          debugLog.info('Configuration file changed, reloading...', {}, DEBUG_CATEGORIES.API);
          this.reloadConfig();
        }
      });
      
      this.watchers.set('config', configWatcher);
      
      debugLog.debug('Configuration file watchers set up', {}, DEBUG_CATEGORIES.API);
      
    } catch (error) {
      debugLog.warn('Failed to set up config watchers', {
        error: error.message
      }, DEBUG_CATEGORIES.API);
    }
  }
  
  /**
   * Reload configuration
   */
  async reloadConfig() {
    try {
      const oldConfig = { ...this.config };
      await this.init();
      
      this.emit('configChanged', {
        oldConfig,
        newConfig: this.config,
        timestamp: new Date().toISOString()
      });
      
      debugLog.info('Configuration reloaded successfully', {}, DEBUG_CATEGORIES.API);
      
    } catch (error) {
      debugLog.error('Failed to reload configuration', {
        error: error.message
      }, DEBUG_CATEGORIES.API);
    }
  }
  
  /**
   * Get configuration value
   */
  get(path, defaultValue = undefined) {
    if (!this.isInitialized) {
      throw new Error('ConfigManager not initialized. Call init() first.');
    }
    
    const value = this.getNestedValue(this.config, path);
    return value !== undefined ? value : defaultValue;
  }
  
  /**
   * Set configuration value
   */
  set(path, value) {
    if (!this.isInitialized) {
      throw new Error('ConfigManager not initialized. Call init() first.');
    }
    
    const oldValue = this.getNestedValue(this.config, path);
    this.setNestedValue(this.config, path, value);
    
    this.emit('configValueChanged', {
      path,
      oldValue,
      newValue: value,
      timestamp: new Date().toISOString()
    });
    
    debugLog.debug('Configuration value updated', {
      path,
      oldValue: this.isSensitivePath(path) ? '[REDACTED]' : oldValue,
      newValue: this.isSensitivePath(path) ? '[REDACTED]' : value
    }, DEBUG_CATEGORIES.API);
  }
  
  /**
   * Get all configuration
   */
  getAll() {
    if (!this.isInitialized) {
      throw new Error('ConfigManager not initialized. Call init() first.');
    }
    
    return { ...this.config };
  }
  
  /**
   * Get sanitized configuration (without sensitive data)
   */
  getSanitized() {
    const sanitized = JSON.parse(JSON.stringify(this.config));
    
    // Remove sensitive fields
    if (sanitized.pingone?.clientSecret) {
      sanitized.pingone.clientSecret = '[REDACTED]';
    }
    
    return sanitized;
  }
  
  /**
   * Utility methods
   */
  getEnvironment() {
    return process.env.NODE_ENV || 'development';
  }
  
  transformLegacyConfig(settings) {
    // Handle both kebab-case (from settings.json) and camelCase field names
    const environmentId = settings.environmentId || settings['environment-id'] || '';
    const clientId = settings.apiClientId || settings['api-client-id'] || '';
    const clientSecret = settings.apiSecret || settings['api-secret'] || '';
    const region = settings.region || 'NorthAmerica';
    const rateLimit = settings.rateLimit || settings['rate-limit'] || 50;
    const populationId = settings.populationId || settings['population-id'] || '';
    
    return {
      server: {
        port: settings.port || 4000,
        environment: this.getEnvironment()
      },
      pingone: {
        environmentId,
        clientId,
        clientSecret,
        region,
        populationId
      },
      features: {
        maxFileUploadSize: settings.maxFileSize || 10485760,
        importBatchSize: parseInt(rateLimit) || 5
      },
      ...this.getDefaultConfig()
    };
  }
  
  getDefaultConfig() {
    const defaults = {};
    
    Object.entries(CONFIG_SCHEMA).forEach(([section, fields]) => {
      defaults[section] = {};
      Object.entries(fields).forEach(([field, rules]) => {
        if (rules.default !== undefined) {
          defaults[section][field] = rules.default;
        }
      });
    });
    
    return defaults;
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }
  
  deepMerge(target, source) {
    const result = { ...target };
    
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });
    
    return result;
  }
  
  parseEnvValue(value) {
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // Return as string if not valid JSON
      return value;
    }
  }
  
  isSensitivePath(path) {
    const sensitivePaths = ['pingone.clientSecret', 'auth.secret', 'database.password'];
    return sensitivePaths.some(sensitivePath => path.includes(sensitivePath));
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    this.watchers.forEach(watcher => {
      try {
        watcher.close();
      } catch (error) {
        debugLog.warn('Failed to close config watcher', { error: error.message }, DEBUG_CATEGORIES.API);
      }
    });
    
    this.watchers.clear();
    this.removeAllListeners();
    
    debugLog.info('ConfigManager destroyed', {}, DEBUG_CATEGORIES.API);
  }
}

// Create singleton instance
const configManager = new ConfigManager();

export default configManager;
export { CONFIG_SCHEMA, ConfigManager };