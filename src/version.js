// Application version - SINGLE SOURCE OF TRUTH
export const APP_VERSION = '7.0.0.22';

// Helper functions for version formatting
export function getFormattedVersion() {
  return `v7.1.0.22`;
}

export function getVersionInfo() {
  return {
    version: APP_VERSION,
    buildTimestamp: new Date().toISOString()
  };
}
