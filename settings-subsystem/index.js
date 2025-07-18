/**
 * Settings Subsystem
 * 
 * Provides a unified API for managing application settings across both client and server.
 * This module serves as the main entry point for the settings subsystem, exporting
 * both client and server components.
 * 
 * Usage:
 * ```javascript
 * // Server-side
 * import { server as settingsServer } from 'settings-subsystem';
 * 
 * const settingsService = settingsServer.createSettingsService({
 *   logger,
 *   defaultSettings: {
 *     customSetting: 'value'
 *   }
 * });
 * 
 * // Client-side
 * import { client as settingsClient } from 'settings-subsystem';
 * 
 * const theme = settingsClient.getSetting('theme', 'light');
 * ```
 */

import * as server from './server/index.js';
import * as client from './client/index.js';

// Export server and client modules
export { server, client };

// Export default object with both modules
export default { server, client };