/**
 * Centralized Application Version Management
 * 
 * This module provides a single source of truth for the application version
 * across all components and displays.
 * 
 * @author PingOne Import Tool
 * @version 1.0.0
 */

// Application version - SINGLE SOURCE OF TRUTH
export const APP_VERSION = '7.4.5.0';

// Helper functions for version formatting
export function getFormattedVersion() {
      return `v7.4.5.0`;
}

export function getVersionInfo() {
  return {
    version: APP_VERSION,
    buildTimestamp: new Date().toISOString(),
    // Backward-compatibility: some routes expect buildDate
    buildDate: new Date().toISOString()
  };
}