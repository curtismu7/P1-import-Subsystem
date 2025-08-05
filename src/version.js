/**
 * PingOne Import Tool - Centralized Version Configuration
 * 
 * This file serves as the single source of truth for the application version.
 * All version references throughout the application should import from this file.
 * 
 * Usage:
 * import { APP_VERSION, getFormattedVersion } from '../path/to/version.js';
 */

// Application version - SINGLE SOURCE OF TRUTH
export const APP_VERSION = '7.0.0.21';

// Helper functions for version formatting
export function getFormattedVersion() {
  return `v${APP_VERSION}`;
}

// For use in HTML title, footer, etc.
export function getVersionedAppName(prefix = 'PingOne Import Tool') {
  return `${prefix} ${getFormattedVersion()}`;
}

// For logging and debugging
export function getVersionInfo() {
  return {
    version: APP_VERSION,
    formattedVersion: getFormattedVersion(),
    timestamp: new Date().toISOString(),
    buildDate: '2025-08-04' // Update this on each release
  };
}

// For backward compatibility with code that expects window.APP_VERSION
if (typeof window !== 'undefined') {
  window.APP_VERSION = APP_VERSION;
}

// Log version on module load (helps with debugging)
console.log(`Version module loaded: ${getFormattedVersion()}`);
