/**
 * Version Loader
 * 
 * This module loads the version information for server-side use.
 * It provides the same version information as src/version.js but in a format
 * that can be used by CommonJS modules.
 */

import { APP_VERSION, getFormattedVersion, getVersionInfo } from './version.js';

// Export for CommonJS compatibility
export { APP_VERSION, getFormattedVersion, getVersionInfo };

// Also export as default for simpler imports
export default {
  APP_VERSION,
  getFormattedVersion,
  getVersionInfo
};
