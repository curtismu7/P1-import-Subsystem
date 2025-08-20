import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import {
    fileURLToPath
} from 'url';
import {
    getRegionConfig,
    normalizeRegion,
    validateRegion,
    DEFAULT_REGION
} from '../../src/utils/region-config.js';
import {
    STANDARD_KEYS,
    standardizeConfigKeys,
    createBackwardCompatibleConfig,
    migrateConfigurationFile
} from '../../src/utils/config-standardization.js';
import {
    asyncHandler
} from '../../server/middleware/error-handler.js';
import {
    validateBody,
    schemas
} from '../../server/middleware/validation.js';
import {
    Console
} from 'console';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Paths to config files
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');
const APP_CONFIG_FILE = path.join(__dirname, '../../data/app-config.json');
console.log('Settings file path:', SETTINGS_FILE);

// Helpers for app-config read/write
async function readJsonSafe(filePath, fallback = {}) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw || '{}');
    } catch (_) {
        return { ...fallback };
    }
}

async function writeJson(filePath, data) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function isMaskedSecret(value) {
    // Treat any all-asterisk string (length >= 3) as a masked secret
    return typeof value === 'string' && /^\*{3,}$/.test(value.trim());
}

function isUuid(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function getWriteMode() {
    const mode = (process.env.SETTINGS_WRITE_MODE || 'safe').toLowerCase();
    return ['locked', 'safe', 'open'].includes(mode) ? mode : 'safe';
}

/**
 * Validate PingOne credentials
 * @param {Object} credentials - Credentials to validate
 * @returns {Object} Validation result
 */
function validateCredentials(credentials) {
    const errors = [];
    const warnings = [];

    // Validate environment ID (UUID format)
    if (!credentials[STANDARD_KEYS.ENVIRONMENT_ID]) {
        errors.push('Environment ID is required');
    } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(credentials[STANDARD_KEYS.ENVIRONMENT_ID])) {
        errors.push('Environment ID must be a valid UUID format');
    }

    // Validate client ID (UUID format)
    if (!credentials[STANDARD_KEYS.CLIENT_ID]) {
        errors.push('Client ID is required');
    } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(credentials[STANDARD_KEYS.CLIENT_ID])) {
        errors.push('Client ID must be a valid UUID format');
    }

    // Validate client secret (non-empty, alphanumeric with special chars)
    if (!credentials[STANDARD_KEYS.CLIENT_SECRET]) {
        errors.push('Client Secret is required');
    } else {
        const secret = credentials[STANDARD_KEYS.CLIENT_SECRET];
        if (secret.length < 10) {
            errors.push('Client Secret must be at least 10 characters long');
        }
        if (!/^[A-Za-z0-9.~_-]+$/.test(secret)) {
            warnings.push('Client Secret contains unusual characters - ensure it\'s valid');
        }
    }

    // Validate region
    if (!credentials[STANDARD_KEYS.REGION]) {
        warnings.push('Region not specified, will use default');
    } else if (!validateRegion(credentials[STANDARD_KEYS.REGION])) {
        errors.push('Invalid region specified');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        hasWarnings: warnings.length > 0
    };
}

/**
 * Clean and de-duplicate settings by removing legacy keys
 * @param {Object} settings - Settings object to clean
 * @returns {Object} Cleaned settings with only standard keys
 */
function cleanAndDeduplicateSettings(settings) {
    const standardized = standardizeConfigKeys(settings, {
        logLegacyUsage: true,
        preserveLegacyKeys: false // Remove legacy keys
    });

    // Keep only standard keys and application preferences
    const cleaned = {
        // PingOne credentials (standard keys only)
        [STANDARD_KEYS.ENVIRONMENT_ID]: standardized[STANDARD_KEYS.ENVIRONMENT_ID] || '',
        [STANDARD_KEYS.CLIENT_ID]: standardized[STANDARD_KEYS.CLIENT_ID] || '',
        [STANDARD_KEYS.CLIENT_SECRET]: standardized[STANDARD_KEYS.CLIENT_SECRET] || '',
        // Always normalize region to standard short code (e.g., 'NA') before saving
        [STANDARD_KEYS.REGION]: normalizeRegion(standardized[STANDARD_KEYS.REGION] || DEFAULT_REGION),
        [STANDARD_KEYS.POPULATION_ID]: standardized[STANDARD_KEYS.POPULATION_ID] || '',

        // Application settings
        rateLimit: standardized.rateLimit || 100,
        showDisclaimerModal: standardized.showDisclaimerModal !== false,
        showCredentialsModal: standardized.showCredentialsModal !== false,
        showSwaggerPage: standardized.showSwaggerPage === true,
        autoRefreshToken: standardized.autoRefreshToken !== false,
        lastUpdated: new Date().toISOString()
    };

    // Remove empty values to keep file clean
    Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === '' && !['rateLimit', 'lastUpdated'].includes(key)) {
            // Keep empty strings for credential fields to maintain structure
            // but remove completely undefined values
        }
    });

    return cleaned;
}

/**
 * Get current settings
 * GET /api/settings
 */
router.get('/', asyncHandler(async (req, res) => {
    try {
        const rawSettings = await readJsonSafe(SETTINGS_FILE, {});
        const appConfig = await readJsonSafe(APP_CONFIG_FILE, {});

        // Compose view: credentials from settings; region/rateLimit from app-config or fallback
        const composed = {
            ...rawSettings,
            pingone_region: appConfig.pingone_region || rawSettings.pingone_region || DEFAULT_REGION,
            rateLimit: typeof appConfig.rateLimit === 'number' ? appConfig.rateLimit : (rawSettings.rateLimit || 100)
        };

        const cleanedSettings = cleanAndDeduplicateSettings(composed);

        // No rewrite to settings.json here to avoid polluting credentials file with non-credentials

        // Validate credentials (for informational purposes)
        const validation = validateCredentials(cleanedSettings);

        // Public response shape preserved
        const publicSettings = {
            [STANDARD_KEYS.ENVIRONMENT_ID]: cleanedSettings[STANDARD_KEYS.ENVIRONMENT_ID] || '',
            [STANDARD_KEYS.REGION]: cleanedSettings[STANDARD_KEYS.REGION] || '',
            [STANDARD_KEYS.CLIENT_ID]: cleanedSettings[STANDARD_KEYS.CLIENT_ID] || '',
            [STANDARD_KEYS.POPULATION_ID]: cleanedSettings[STANDARD_KEYS.POPULATION_ID] || '',
            rateLimit: cleanedSettings.rateLimit || 100,
            showDisclaimerModal: cleanedSettings.showDisclaimerModal !== false,
            showCredentialsModal: cleanedSettings.showCredentialsModal !== false,
            showSwaggerPage: cleanedSettings.showSwaggerPage === true,
            autoRefreshToken: cleanedSettings.autoRefreshToken !== false,
            environmentId: cleanedSettings[STANDARD_KEYS.ENVIRONMENT_ID] || '',
            region: cleanedSettings[STANDARD_KEYS.REGION] || '',
            apiClientId: cleanedSettings[STANDARD_KEYS.CLIENT_ID] || '',
            populationId: cleanedSettings[STANDARD_KEYS.POPULATION_ID] || '',
            lastUpdated: cleanedSettings.lastUpdated || null,
            credentialsValid: validation.isValid,
            credentialsWarnings: validation.warnings
        };

        res.success('Settings retrieved successfully', publicSettings);

    } catch (error) {
        console.error('Error reading settings:', error);
        const defaultSettings = {
            [STANDARD_KEYS.ENVIRONMENT_ID]: '',
            [STANDARD_KEYS.REGION]: DEFAULT_REGION,
            [STANDARD_KEYS.CLIENT_ID]: '',
            [STANDARD_KEYS.POPULATION_ID]: '',
            rateLimit: 100,
            showDisclaimerModal: true,
            showSwaggerPage: false,
            autoRefreshToken: true,
            environmentId: '',
            region: DEFAULT_REGION,
            apiClientId: '',
            populationId: '',
            lastUpdated: null,
            credentialsValid: false,
            credentialsWarnings: ['Settings file not found or invalid']
        };
        res.success('Default settings returned (settings file not found)', defaultSettings);
    }
}));

/**
 * Save settings
 * POST /api/settings
 */
router.post('/',
    validateBody(schemas.settingsUpdate),
    asyncHandler(async (req, res) => {
        const incoming = req.validatedBody;

        // Read existing state
        const existingSettings = await readJsonSafe(SETTINGS_FILE, {});
        const existingAppConfig = await readJsonSafe(APP_CONFIG_FILE, {});

        // Standardize incoming
        const standardizedNew = standardizeConfigKeys(incoming);

        // Preserve secret if masked/empty
        const incomingSecret = standardizedNew[STANDARD_KEYS.CLIENT_SECRET];
        const preservedSecret = (isMaskedSecret(incomingSecret) || !incomingSecret)
            ? existingSettings[STANDARD_KEYS.CLIENT_SECRET]
            : incomingSecret;

        // Determine write mode constraints
        const mode = getWriteMode();
        const incomingEnv = standardizedNew[STANDARD_KEYS.ENVIRONMENT_ID];
        const incomingClientId = standardizedNew[STANDARD_KEYS.CLIENT_ID];
        const existingEnv = existingSettings[STANDARD_KEYS.ENVIRONMENT_ID];
        const existingClientId = existingSettings[STANDARD_KEYS.CLIENT_ID];

        const isCredentialChange = (
            (incomingEnv && incomingEnv !== existingEnv) ||
            (incomingClientId && incomingClientId !== existingClientId) ||
            (incomingSecret && !isMaskedSecret(incomingSecret) && incomingSecret !== existingSettings[STANDARD_KEYS.CLIENT_SECRET])
        );

        // Basic placeholder protection: require UUIDs for env/client IDs when changing in safe/locked
        if ((mode === 'safe' || mode === 'locked') && isCredentialChange) {
            const envOk = incomingEnv ? isUuid(incomingEnv) : true;
            const idOk = incomingClientId ? isUuid(incomingClientId) : true;
            if (!envOk || !idOk) {
                return res.status(423).json({
                    success: false,
                    error: 'Blocked by SETTINGS_WRITE_MODE policy',
                    details: ['Credential change requires valid UUIDs in safe/locked modes']
                });
            }
            if (mode === 'locked') {
                return res.status(423).json({
                    success: false,
                    error: 'Blocked: settings are locked',
                    details: ['Credential updates are disabled in locked mode']
                });
            }
        }

        // Compose cleaned view for validation
        const composedForValidation = cleanAndDeduplicateSettings({
            ...existingSettings,
            [STANDARD_KEYS.ENVIRONMENT_ID]: standardizedNew[STANDARD_KEYS.ENVIRONMENT_ID] || existingSettings[STANDARD_KEYS.ENVIRONMENT_ID] || '',
            [STANDARD_KEYS.CLIENT_ID]: standardizedNew[STANDARD_KEYS.CLIENT_ID] || existingSettings[STANDARD_KEYS.CLIENT_ID] || '',
            [STANDARD_KEYS.CLIENT_SECRET]: preservedSecret || existingSettings[STANDARD_KEYS.CLIENT_SECRET] || '',
            [STANDARD_KEYS.REGION]: standardizedNew[STANDARD_KEYS.REGION] || existingAppConfig.pingone_region || existingSettings[STANDARD_KEYS.REGION] || DEFAULT_REGION,
            [STANDARD_KEYS.POPULATION_ID]: standardizedNew[STANDARD_KEYS.POPULATION_ID] || existingSettings[STANDARD_KEYS.POPULATION_ID] || '',
            rateLimit: typeof standardizedNew.rateLimit === 'number' ? standardizedNew.rateLimit : (existingAppConfig.rateLimit ?? existingSettings.rateLimit ?? 100),
            showDisclaimerModal: standardizedNew.showDisclaimerModal ?? (existingSettings.showDisclaimerModal !== false),
            showCredentialsModal: standardizedNew.showCredentialsModal ?? (existingSettings.showCredentialsModal !== false),
            showSwaggerPage: standardizedNew.showSwaggerPage ?? (existingSettings.showSwaggerPage === true),
            autoRefreshToken: standardizedNew.autoRefreshToken ?? (existingSettings.autoRefreshToken !== false)
        });

        const validation = validateCredentials(composedForValidation);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid credentials provided',
                details: validation.errors,
                warnings: validation.warnings
            });
        }

        // Persist split: credentials -> settings.json; non-credentials -> app-config.json
        const credentialsToSave = {
            [STANDARD_KEYS.ENVIRONMENT_ID]: composedForValidation[STANDARD_KEYS.ENVIRONMENT_ID],
            [STANDARD_KEYS.CLIENT_ID]: composedForValidation[STANDARD_KEYS.CLIENT_ID],
            [STANDARD_KEYS.CLIENT_SECRET]: composedForValidation[STANDARD_KEYS.CLIENT_SECRET],
            [STANDARD_KEYS.POPULATION_ID]: composedForValidation[STANDARD_KEYS.POPULATION_ID],
            lastUpdated: new Date().toISOString()
        };
        await writeJson(SETTINGS_FILE, credentialsToSave);

        const appConfigToSave = {
            pingone_region: composedForValidation[STANDARD_KEYS.REGION] || DEFAULT_REGION,
            rateLimit: composedForValidation.rateLimit ?? 100
        };
        await writeJson(APP_CONFIG_FILE, appConfigToSave);

        // Response mirrors previous shape
        const responseData = {
            [STANDARD_KEYS.ENVIRONMENT_ID]: credentialsToSave[STANDARD_KEYS.ENVIRONMENT_ID],
            [STANDARD_KEYS.REGION]: appConfigToSave.pingone_region,
            [STANDARD_KEYS.CLIENT_ID]: credentialsToSave[STANDARD_KEYS.CLIENT_ID],
            [STANDARD_KEYS.POPULATION_ID]: credentialsToSave[STANDARD_KEYS.POPULATION_ID],
            rateLimit: appConfigToSave.rateLimit,
            showDisclaimerModal: composedForValidation.showDisclaimerModal,
            showCredentialsModal: composedForValidation.showCredentialsModal,
            showSwaggerPage: composedForValidation.showSwaggerPage,
            autoRefreshToken: composedForValidation.autoRefreshToken,
            environmentId: credentialsToSave[STANDARD_KEYS.ENVIRONMENT_ID],
            region: appConfigToSave.pingone_region,
            apiClientId: credentialsToSave[STANDARD_KEYS.CLIENT_ID],
            populationId: credentialsToSave[STANDARD_KEYS.POPULATION_ID],
            lastUpdated: credentialsToSave.lastUpdated,
            credentialsValid: validation.isValid,
            credentialsWarnings: validation.warnings
        };

        res.success('Settings saved and validated successfully', responseData);
    }));

/**
 * Validate credentials without saving
 * POST /api/settings/validate
 */
router.post('/validate',
    validateBody(schemas.settingsUpdate),
    asyncHandler(async (req, res) => {
        const credentials = req.validatedBody;

        // Standardize incoming credentials
        const standardizedCredentials = standardizeConfigKeys(credentials);

        // If secret is masked or omitted, preserve existing secret from settings for validation
        try {
            const existingSettings = await readJsonSafe(SETTINGS_FILE, {});
            const existingStd = standardizeConfigKeys(existingSettings);
            const incomingSecret = standardizedCredentials[STANDARD_KEYS.CLIENT_SECRET];
            if (!incomingSecret || isMaskedSecret(incomingSecret)) {
                if (existingStd[STANDARD_KEYS.CLIENT_SECRET]) {
                    standardizedCredentials[STANDARD_KEYS.CLIENT_SECRET] = existingStd[STANDARD_KEYS.CLIENT_SECRET];
                }
            }
        } catch (_) { /* ignore */ }

        // Validate credentials
        const validation = validateCredentials(standardizedCredentials);

        // Test connection if credentials are valid
        let connectionTest = null;
        if (validation.isValid) {
            try {
                // Import token service for testing
                const {
                    tokenService
                } = await import('../../server/services/token-service.js');

                const testCredentials = {
                    environmentId: standardizedCredentials[STANDARD_KEYS.ENVIRONMENT_ID],
                    clientId: standardizedCredentials[STANDARD_KEYS.CLIENT_ID],
                    clientSecret: standardizedCredentials[STANDARD_KEYS.CLIENT_SECRET],
                    region: standardizedCredentials[STANDARD_KEYS.REGION] || DEFAULT_REGION
                };

                const accessToken = await tokenService.getToken(testCredentials);
                const tokenStatus = tokenService.getTokenStatus();

                connectionTest = {
                    success: !!(accessToken && tokenStatus.isValid),
                    message: accessToken ? 'Connection successful - token acquired' : 'Connection failed - no token received',
                    tokenValid: !!(accessToken && tokenStatus.isValid),
                    tokenStatus: {
                        hasToken: tokenStatus.hasToken,
                        isValid: tokenStatus.isValid,
                        expiresIn: tokenStatus.expiresIn
                    }
                };

            } catch (error) {
                connectionTest = {
                    success: false,
                    message: `Connection test failed: ${error.message}`,
                    tokenValid: false
                };
            }
        }

        const response = {
            credentialsValid: validation.isValid,
            errors: validation.errors,
            warnings: validation.warnings,
            connectionTest,
            credentials: {
                [STANDARD_KEYS.ENVIRONMENT_ID]: standardizedCredentials[STANDARD_KEYS.ENVIRONMENT_ID] || '',
                [STANDARD_KEYS.CLIENT_ID]: standardizedCredentials[STANDARD_KEYS.CLIENT_ID] || '',
                [STANDARD_KEYS.REGION]: standardizedCredentials[STANDARD_KEYS.REGION] || DEFAULT_REGION,
                // Don't return the secret for security
                hasSecret: !!(standardizedCredentials[STANDARD_KEYS.CLIENT_SECRET])
            }
        };

        if (validation.isValid && (connectionTest?.success)) {
            res.success('Credentials validated and connection test successful', response);
        } else if (validation.isValid) {
            res.success('Credentials format valid but connection test failed', response);
        } else {
            res.status(400).json({
                success: false,
                error: 'Credential validation failed',
                ...response
            });
        }
    }));

/**
 * Get complete credentials for internal token acquisition
 * GET /api/settings/credentials
 * This endpoint includes the API secret and should only be used internally
 */
router.get('/credentials', asyncHandler(async (req, res) => {
    try {
        const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf8');
        const rawSettings = JSON.parse(settingsContent);

        // Standardize configuration keys
        const standardizedSettings = standardizeConfigKeys(rawSettings);

        // Return complete credentials including secret for internal use
        let rawCredentials = {
            environmentId: standardizedSettings[STANDARD_KEYS.ENVIRONMENT_ID] || '',
            clientId: standardizedSettings[STANDARD_KEYS.CLIENT_ID] || '',
            clientSecret: standardizedSettings[STANDARD_KEYS.CLIENT_SECRET] || '',
            region: standardizedSettings[STANDARD_KEYS.REGION] || DEFAULT_REGION
        };

        // Fallback: if any credential is missing, try data/settings-real.json (developer-local overrides)
        if (!rawCredentials.environmentId || !rawCredentials.clientId || !rawCredentials.clientSecret) {
            try {
                const realPath = path.join(__dirname, '../../data/settings-real.json');
                const realContent = await fs.readFile(realPath, 'utf8');
                const realJson = standardizeConfigKeys(JSON.parse(realContent));
                rawCredentials = {
                    environmentId: rawCredentials.environmentId || realJson[STANDARD_KEYS.ENVIRONMENT_ID] || '',
                    clientId: rawCredentials.clientId || realJson[STANDARD_KEYS.CLIENT_ID] || '',
                    clientSecret: rawCredentials.clientSecret || realJson[STANDARD_KEYS.CLIENT_SECRET] || '',
                    region: rawCredentials.region || realJson[STANDARD_KEYS.REGION] || DEFAULT_REGION
                };
            } catch (_) {
                // optional fallback file not present; ignore
            }
        }

        // Apply region configuration with precedence hierarchy
        const regionConfig = getRegionConfig({
            settings: rawCredentials,
            envRegion: process.env.PINGONE_REGION,
            storageRegion: null // localStorage not available server-side
        });

        // Use validated and normalized region
        const credentials = {
            ...rawCredentials,
            region: regionConfig.region
        };

        console.log('🌍 Region configuration applied:', {
            originalRegion: rawCredentials.region,
            finalRegion: credentials.region,
            source: regionConfig.source,
            precedence: regionConfig.precedence
        });

        // Always return what we have; client decides how to display/invalidate
        res.success('Credentials retrieved successfully', credentials);

    } catch (error) {
        console.error('Error reading credentials:', error);
        res.error('Failed to read credentials', {
            code: 'SETTINGS_READ_ERROR',
            message: error.message
        }, 500);
    }
}));

export default router;