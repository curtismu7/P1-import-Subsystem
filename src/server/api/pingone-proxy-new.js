import { Router } from 'express';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import path from 'path';
import cors from 'cors';
import workerTokenManager from '../auth/workerTokenManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Enable CORS for all routes
router.use(cors({
    origin: 'http://localhost:4000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-PingOne-Environment-Id', 'X-PingOne-Region'],
    credentials: true
}));

// Handle preflight requests
router.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:4000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-PingOne-Environment-Id, X-PingOne-Region');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
});

// PingOne API base URLs by region
const PINGONE_API_BASE_URLS = {
    'NorthAmerica': 'https://api.pingone.com/v1',
    'NA': 'https://api.pingone.com/v1',
    'Europe': 'https://api.eu.pingone.com/v1',
    'EU': 'https://api.eu.pingone.com/v1',
    'Canada': 'https://api.ca.pingone.com/v1',
    'CA': 'https://api.ca.pingone.com/v1',
    'Asia': 'https://api.apsoutheast.pingone.com/v1',
    'AP': 'https://api.apsoutheast.pingone.com/v1',
    'Australia': 'https://api.aus.pingone.com/v1',
    'AUS': 'https://api.aus.pingone.com/v1',
    'US': 'https://api.pingone.com/v1',
    'default': 'https://auth.pingone.com'
};

// Middleware to validate required settings
const validateSettings = (req, res, next) => {
    const { environmentId, region } = req.settings;
    // Debug log incoming region
    console.log('[DEBUG] Incoming region:', region);
    if (!environmentId) {
        return res.status(400).json({ error: 'Environment ID is required' });
    }
    // Accept 'NA' as valid and map to 'NorthAmerica' for backend use
    // Normalize region to PingOne API codes (NA, EU, AP, CA, AUS)
    const regionCodes = {
        'na': 'NA',
        'northamerica': 'NA',
        'us': 'NA',
        'eu': 'EU',
        'europe': 'EU',
        'ap': 'AP',
        'asia': 'AP',
        'ca': 'CA',
        'canada': 'CA',
        'aus': 'AUS',
        'australia': 'AUS'
    };
    let normalizedRegion = region ? regionCodes[region.trim().toLowerCase()] : undefined;
    if (!normalizedRegion && region) {
        // Try direct match
        normalizedRegion = regionCodes[region.trim()] || regionCodes[region.trim().toUpperCase()] || regionCodes[region.trim().toLowerCase()];
    }
    // Fallback to NA if not recognized
    if (!normalizedRegion) {
        normalizedRegion = 'NA';
        console.warn('[BULLETPROOF] Region not recognized, defaulting to NA. Input:', region);
    }
    console.log('[BULLETPROOF] Final normalized region for backend:', normalizedRegion);
    if (!PINGONE_API_BASE_URLS[normalizedRegion]) {
        console.log('[BULLETPROOF] Region not valid:', normalizedRegion, Object.keys(PINGONE_API_BASE_URLS));
        return res.status(400).json({ error: 'Valid region is required' });
    }
    req.settings.region = normalizedRegion;
    next();
};

// Helper to extract environment ID from URL
const extractEnvironmentId = (path) => {
    const match = path.match(/\/environments\/([^\/]+)/);
    return match ? match[1] : null;
};

// Middleware to inject settings
const injectSettings = (req, res, next) => {
    try {
        // Bulletproof region loading
        let region = process.env.PINGONE_REGION || process.env.pingone_region || '';
        let regionSources = [region];
        try {
            const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            if (settings.pingone_region) regionSources.push(settings.pingone_region);
            if (settings.region) regionSources.push(settings.region);
        } catch (e) {}
        // Fallback default
        regionSources.push('NorthAmerica');
        // Use first non-empty value
        region = regionSources.find(r => r && r.length > 0);
        // Normalize region (case-insensitive, trimmed)
        const regionMap = {
            'northamerica': 'NorthAmerica',
            'na': 'NorthAmerica',
            'us': 'NorthAmerica',
            'europe': 'Europe',
            'eu': 'Europe',
            'canada': 'Canada',
            'ca': 'Canada',
            'asia': 'Asia',
            'ap': 'Asia',
            'australia': 'Australia',
            'aus': 'Australia'
        };
        let normalizedRegion = region ? regionMap[region.trim().toLowerCase()] : undefined;
        if (!normalizedRegion) {
            // Try all sources
            for (const r of regionSources) {
                if (r && regionMap[r.trim().toLowerCase()]) {
                    normalizedRegion = regionMap[r.trim().toLowerCase()];
                    break;
                }
            }
        }
        if (!normalizedRegion) {
            normalizedRegion = 'NorthAmerica';
            console.warn('[BULLETPROOF] Region not recognized, falling back to NorthAmerica. Sources:', regionSources);
        }
        console.log('[BULLETPROOF] Region sources:', regionSources);
        console.log('[BULLETPROOF] Selected region:', region);
        console.log('[BULLETPROOF] Normalized region:', normalizedRegion);
        req.settings = {
            environmentId: process.env.PINGONE_ENVIRONMENT_ID || '',
            region: normalizedRegion,
            apiClientId: process.env.PINGONE_CLIENT_ID || '',
            apiSecret: process.env.PINGONE_CLIENT_SECRET || ''
        };
        next();
    } catch (error) {
        console.error('Error in injectSettings middleware:', error);
        next(error);
    }
};

// Proxy middleware
const proxyRequest = async (req, res) => {
    try {
        const { environmentId, region } = req.settings;
        // Bulletproof debug logging for region
        console.log('[BULLETPROOF] proxyRequest: region from req.settings:', region);
        console.log('[BULLETPROOF] proxyRequest: available region keys:', Object.keys(PINGONE_API_BASE_URLS));
        const baseUrl = PINGONE_API_BASE_URLS[region] || PINGONE_API_BASE_URLS['NA'] || PINGONE_API_BASE_URLS['default'];
        console.log('[BULLETPROOF] proxyRequest: baseUrl selected:', baseUrl);
        // Construct the target URL - remove the /api/proxy prefix and ensure we don't duplicate /v1
        let targetPath = req.path.replace(/^\/api\/proxy/, '');
        
        // If the path already starts with /v1, don't add it again
        const basePath = targetPath.startsWith('/v1/') ? '' : '/v1';
        const targetUrl = new URL(`${baseUrl}${basePath}${targetPath}`);
        
        // Forward query parameters
        if (req.query) {
            Object.entries(req.query).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    targetUrl.searchParams.append(key, value);
                }
            });
        }
        
        // Prepare headers
        const headers = {
            'Content-Type': req.get('Content-Type') || 'application/json',
            'Accept': 'application/json',
            'X-Correlation-ID': uuidv4(),
            'X-Forwarded-For': req.ip || req.connection.remoteAddress
        };
        
        // Preserve original headers that start with X-PingOne-
        Object.entries(req.headers)
            .filter(([key]) => key.toLowerCase().startsWith('x-pingone-'))
            .forEach(([key, value]) => {
                headers[key] = value;
            });
        
        // Use the shared workerTokenManager for Authorization
        try {
            const token = await workerTokenManager.getAccessToken({
                apiClientId: req.settings.apiClientId,
                apiSecret: req.settings.apiSecret,
                environmentId: req.settings.environmentId,
                region: req.settings.region
            });
            headers['Authorization'] = `Bearer ${token}`;
        } catch (error) {
            console.error('Error obtaining access token from workerTokenManager:', error);
            return res.status(401).json({ error: 'Failed to authenticate with PingOne API', details: error.message });
        }
        
        // Log the outgoing request for debugging
        console.log('Proxying request:', {
            method: req.method,
            url: targetUrl.toString(),
            headers: {
                ...headers,
                'Authorization': headers['Authorization'] ? '***REDACTED***' : 'Not set'
            },
            body: req.body ? '***BODY***' : 'No body'
        });

        // Forward the request
        const fetchOptions = {
            method: req.method,
            headers: headers,
            timeout: 30000 // 30 second timeout
        };
        
        // Only add body for non-GET/HEAD requests
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            if (req.body) {
                fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            }
        }
        
        const response = await fetch(targetUrl.toString(), fetchOptions);
        
        // Forward the response
        const contentType = response.headers.get('content-type') || '';
        const responseData = contentType.includes('application/json') 
            ? await response.json() 
            : await response.text();
        
        // Set CORS headers
        res.header('Access-Control-Allow-Origin', 'http://localhost:4000');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-PingOne-Environment-Id, X-PingOne-Region');
        res.header('Access-Control-Allow-Credentials', 'true');
        
        res.status(response.status).json(responseData);
        
    } catch (error) {
        console.error('Error in proxyRequest:', error);
        res.status(500).json({
            error: 'Proxy Error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Apply middleware
router.use(express.json());
router.use(express.text({ type: ['application/json', 'application/vnd.pingidentity.*+json'] }));
router.use(injectSettings);
router.use(validateSettings);

// Proxy all requests to PingOne API
router.all('*', proxyRequest);

export default router;
