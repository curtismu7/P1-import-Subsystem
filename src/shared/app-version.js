/**
 * Centralized Application Version Management
 * 
 * This module provides a single source of truth for the application version
 * across all components and displays.
 * 
 * @author PingOne Import Tool
 * @version 1.0.0
 */

// Application version - update this single location for all version references
export const APP_VERSION = '6.5.2.3';

// Build information (can be populated by build process)
export const BUILD_INFO = {
  version: APP_VERSION,
  buildDate: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
  commit: process.env.GIT_COMMIT || 'unknown'
};

// Version display utilities
export const getVersionDisplay = () => `v${APP_VERSION}`;
export const getFullVersionInfo = () => `${APP_VERSION} (${BUILD_INFO.environment})`;
export const getBuildTimestamp = () => BUILD_INFO.buildDate;

// Export default for easy importing
export default {
  version: APP_VERSION,
  display: getVersionDisplay(),
  full: getFullVersionInfo(),
  buildInfo: BUILD_INFO
};