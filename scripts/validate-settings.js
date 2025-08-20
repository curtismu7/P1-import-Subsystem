#!/usr/bin/env node

/**
 * Settings Configuration Validator
 * 
 * This script validates the settings.json file to prevent configuration conflicts
 * and ensure only the correct PingOne configuration fields are present.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration field definitions
const VALID_CONFIG = {
  // ✅ Correct PingOne fields (keep these)
  pingone: [
    'pingone_environment_id',
    'pingone_client_id', 
    'pingone_client_secret',
    'pingone_population_id',
    'pingone_region'
  ],
  
  // ❌ Legacy/conflicting fields (remove these)
  legacy: [
    'environmentId',
    'clientId',
    'clientSecret', 
    'apiClientId',
    'apiSecret',
    'region'
  ],
  
  // 🔧 Other valid fields (keep these)
  other: [
    'lastUpdated',
    'populationCache',
    'populations',
    'rateLimit',
    'showDisclaimerModal',
    'showCredentialsModal',
    'showSwaggerPage',
    'autoRefreshToken'
  ]
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Validate settings configuration
 */
async function validateSettings() {
  console.log(`${colors.blue}🔍 Validating Settings Configuration...${colors.reset}`);
  console.log('==================================================');
  
  try {
    const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
    
    // Check if settings file exists
    if (!await fs.access(settingsPath).then(() => true).catch(() => false)) {
      console.log(`${colors.yellow}⚠️  No settings.json file found${colors.reset}`);
      return { isValid: false, issues: ['No settings file found'] };
    }
    
    // Read and parse settings
    const settingsContent = await fs.readFile(settingsPath, 'utf8');
    const settings = JSON.parse(settingsContent);
    
    const issues = [];
    const warnings = [];
    const recommendations = [];
    
    // Check for legacy/conflicting fields
    const foundLegacyFields = [];
    for (const field of VALID_CONFIG.legacy) {
      if (settings.hasOwnProperty(field)) {
        foundLegacyFields.push(field);
        issues.push(`Legacy field found: "${field}" - This conflicts with PingOne configuration`);
      }
    }
    
    // Check for correct PingOne fields
    const foundPingOneFields = [];
    for (const field of VALID_CONFIG.pingone) {
      if (settings.hasOwnProperty(field)) {
        foundPingOneFields.push(field);
      }
    }
    
    // Validate PingOne configuration
    if (!settings.pingone_environment_id || settings.pingone_environment_id === 'test-environment-id') {
      issues.push('Invalid environment ID: Must be a valid PingOne environment ID, not "test-environment-id"');
    }
    
    if (!settings.pingone_client_id || settings.pingone_client_id === 'test-client-id') {
      issues.push('Invalid client ID: Must be a valid PingOne client ID, not "test-client-id"');
    }
    
    if (!settings.pingone_client_secret) {
      issues.push('Missing client secret: PingOne client secret is required');
    }
    
    // Check for mixed configuration patterns
    if (foundLegacyFields.length > 0 && foundPingOneFields.length > 0) {
      warnings.push('Mixed configuration detected: Both legacy and PingOne fields present');
      recommendations.push('Remove legacy fields to prevent conflicts');
    }
    
    // Check for duplicate/conflicting region settings
    if (settings.hasOwnProperty('region') && settings.hasOwnProperty('pingone_region')) {
      issues.push('Conflicting region fields: Both "region" and "pingone_region" present');
      recommendations.push('Remove legacy "region" field, keep only "pingone_region"');
    }
    
    // Display results
    console.log(`\n${colors.blue}📋 Configuration Analysis:${colors.reset}`);
    console.log(`   ✅ PingOne fields found: ${foundPingOneFields.length}/${VALID_CONFIG.pingone.length}`);
    console.log(`   ❌ Legacy fields found: ${foundLegacyFields.length}`);
    console.log(`   🔧 Other fields: ${Object.keys(settings).length - foundPingOneFields.length - foundLegacyFields.length}`);
    
    if (foundLegacyFields.length > 0) {
      console.log(`\n${colors.red}❌ Legacy/Conflicting Fields Found:${colors.reset}`);
      foundLegacyFields.forEach(field => {
        console.log(`   • ${field}: "${settings[field]}"`);
      });
    }
    
    if (issues.length > 0) {
      console.log(`\n${colors.red}🚨 Critical Issues:${colors.reset}`);
      issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log(`\n${colors.yellow}⚠️  Warnings:${colors.reset}`);
      warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }
    
    if (recommendations.length > 0) {
      console.log(`\n${colors.cyan}💡 Recommendations:${colors.reset}`);
      recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    // Summary
    const isValid = issues.length === 0;
    console.log(`\n${colors.blue}📊 Summary:${colors.reset}`);
    console.log(`   Configuration is ${isValid ? colors.green + 'VALID' + colors.reset : colors.red + 'INVALID' + colors.reset}`);
    
    if (isValid) {
      console.log(`\n${colors.green}✅ All checks passed! Configuration is clean and conflict-free.${colors.reset}`);
    } else {
      console.log(`\n${colors.red}❌ ${issues.length} critical issue(s) found. Please fix before starting the server.${colors.reset}`);
      console.log(`\n${colors.cyan}💡 Run this script after making changes to validate your configuration.${colors.reset}`);
    }
    
    return { isValid, issues, warnings, recommendations };
    
  } catch (error) {
    console.error(`${colors.red}❌ Error validating settings:${colors.reset}`, error.message);
    return { isValid: false, issues: [error.message] };
  }
}

/**
 * Auto-fix common configuration issues
 */
async function autoFixSettings() {
  console.log(`\n${colors.cyan}🔧 Attempting Auto-Fix...${colors.reset}`);
  
  try {
    const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
    
    // Create backup
    const backupPath = `${settingsPath}.backup.${Date.now()}`;
    await fs.copyFile(settingsPath, backupPath);
    console.log(`${colors.green}✅ Backup created: ${backupPath}${colors.reset}`);
    
    // Read current settings
    const settingsContent = await fs.readFile(settingsPath, 'utf8');
    const settings = JSON.parse(settingsContent);
    
    let fixed = false;
    
    // Remove legacy fields
    for (const field of VALID_CONFIG.legacy) {
      if (settings.hasOwnProperty(field)) {
        delete settings[field];
        console.log(`${colors.yellow}🗑️  Removed legacy field: ${field}${colors.reset}`);
        fixed = true;
      }
    }
    
    // Fix common value issues
    if (settings.pingone_environment_id === 'test-environment-id') {
      settings.pingone_environment_id = '';
      console.log(`${colors.yellow}🔧 Reset invalid environment ID${colors.reset}`);
      fixed = true;
    }
    
    if (settings.pingone_client_id === 'test-client-id') {
      settings.pingone_client_id = '';
      console.log(`${colors.yellow}🔧 Reset invalid client ID${colors.reset}`);
      fixed = true;
    }
    
    if (fixed) {
      // Write fixed settings
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      console.log(`${colors.green}✅ Settings file updated${colors.reset}`);
      
      // Re-validate
      console.log(`\n${colors.blue}🔍 Re-validating after fixes...${colors.reset}`);
      await validateSettings();
    } else {
      console.log(`${colors.blue}ℹ️  No auto-fixes needed${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Auto-fix failed:${colors.reset}`, error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const shouldAutoFix = args.includes('--fix');
  
  const result = await validateSettings();
  
  if (!result.isValid && shouldAutoFix) {
    await autoFixSettings();
  }
  
  // Exit with appropriate code
  process.exit(result.isValid ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error.message);
    process.exit(1);
  });
}

export { validateSettings, autoFixSettings };
