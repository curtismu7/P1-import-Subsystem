/**
 * @fileoverview Environment loader for tests
 * 
 * Loads environment variables from .env file for testing
 * 
 * @author PingOne Import Tool
 * @version 4.9
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load environment variables from .env file
 */
export function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf8');
    
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=');
        }
      }
    });
    
    // Set environment variables
    Object.entries(envVars).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    console.warn('No .env file found, using existing environment variables');
    return {};
  }
}
