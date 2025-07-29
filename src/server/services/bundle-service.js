/**
 * Bundle Service
 * 
 * Server-side service for managing bundle information and handling
 * bundle-related requests with automatic fallback and error recovery.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BundleService {
    constructor() {
        this.jsDir = path.join(process.cwd(), 'public/js');
        this.manifestPath = path.join(this.jsDir, 'bundle-manifest.json');
        this.staticBundlePath = path.join(this.jsDir, 'bundle.js');
        
        // Cache for bundle info
        this.bundleCache = null;
        this.cacheExpiry = null;
        this.cacheTimeout = 30000; // 30 seconds
        
        this.logger = console; // Can be replaced with app logger
    }
    
    /**
     * Get current bundle information with caching and fallback
     */
    async getBundleInfo() {
        try {
            // Check cache first
            if (this.bundleCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
                return this.bundleCache;
            }
            
            // Try to read manifest
            let manifest = null;
            if (fs.existsSync(this.manifestPath)) {
                try {
                    const manifestContent = fs.readFileSync(this.manifestPath, 'utf8');
                    manifest = JSON.parse(manifestContent);
                } catch (error) {
                    this.logger.warn('Bundle manifest corrupted, using fallback:', error.message);
                }
            }
            
            // If no manifest or corrupted, create fallback info
            if (!manifest) {
                manifest = await this.createFallbackManifest();
            }
            
            // Verify bundle files exist
            const bundleInfo = await this.verifyAndFixBundleFiles(manifest);
            
            // Cache the result
            this.bundleCache = bundleInfo;
            this.cacheExpiry = Date.now() + this.cacheTimeout;
            
            return bundleInfo;
            
        } catch (error) {
            this.logger.error('Failed to get bundle info:', error.message);
            return this.getEmergencyFallback();
        }
    }
    
    /**
     * Create fallback manifest when original is missing or corrupted
     */
    async createFallbackManifest() {
        this.logger.info('Creating fallback bundle manifest...');
        
        // Look for any existing bundle files
        const bundleFiles = this.findBundleFiles();
        
        let bundleFile = 'bundle.js'; // Default fallback
        let version = '6.5.1.4'; // Default version
        let buildId = Date.now();
        
        if (bundleFiles.length > 0) {
            // Use the newest bundle file
            const newest = bundleFiles.sort((a, b) => b.mtime - a.mtime)[0];
            bundleFile = newest.name;
            
            // Try to extract version from filename
            const versionMatch = bundleFile.match(/v([\\d.]+)/);
            if (versionMatch) {
                version = versionMatch[1];
            }
            
            // Try to extract build ID from filename
            const buildMatch = bundleFile.match(/(\\d{13})/);
            if (buildMatch) {
                buildId = parseInt(buildMatch[1]);
            }
        }
        
        const fallbackManifest = {
            version,
            buildTime: new Date().toISOString(),
            buildId,
            bundleFile,
            staticBundle: 'bundle.js',
            build: buildId.toString(),
            environment: process.env.NODE_ENV || 'development',
            integrity: {
                hash: 'fallback',
                size: 0,
                sizeKB: 0,
                created: new Date().toISOString()
            },
            paths: {
                versioned: `/js/${bundleFile}`,
                static: '/js/bundle.js',
                manifest: '/js/bundle-manifest.json'
            },
            fallback: true
        };
        
        // Save fallback manifest
        try {
            fs.writeFileSync(this.manifestPath, JSON.stringify(fallbackManifest, null, 2));
            this.logger.info('Fallback manifest created successfully');
        } catch (error) {
            this.logger.warn('Could not save fallback manifest:', error.message);
        }
        
        return fallbackManifest;
    }
    
    /**
     * Verify bundle files exist and fix if necessary
     */
    async verifyAndFixBundleFiles(manifest) {
        const bundleInfo = { ...manifest };
        
        // Check if versioned bundle exists
        if (manifest.bundleFile) {
            const versionedBundlePath = path.join(this.jsDir, manifest.bundleFile);
            if (!fs.existsSync(versionedBundlePath)) {
                this.logger.warn(`Versioned bundle missing: ${manifest.bundleFile}`);
                
                // Try to find alternative bundle
                const alternatives = this.findBundleFiles();
                if (alternatives.length > 0) {
                    const newest = alternatives.sort((a, b) => b.mtime - a.mtime)[0];
                    bundleInfo.bundleFile = newest.name;
                    bundleInfo.paths.versioned = `/js/${newest.name}`;
                    this.logger.info(`Using alternative bundle: ${newest.name}`);
                }
            }
        }
        
        // Check if static bundle exists
        if (!fs.existsSync(this.staticBundlePath)) {
            this.logger.warn('Static bundle.js missing, attempting to create...');
            
            // Try to create static bundle from versioned bundle
            if (bundleInfo.bundleFile) {
                const versionedPath = path.join(this.jsDir, bundleInfo.bundleFile);
                if (fs.existsSync(versionedPath)) {
                    try {
                        fs.copyFileSync(versionedPath, this.staticBundlePath);
                        this.logger.info('Static bundle.js created from versioned bundle');
                    } catch (error) {
                        this.logger.error('Failed to create static bundle:', error.message);
                    }
                }
            }
        }
        
        // Update file sizes if available
        try {
            const bundlePath = path.join(this.jsDir, bundleInfo.bundleFile);
            if (fs.existsSync(bundlePath)) {
                const stats = fs.statSync(bundlePath);
                bundleInfo.integrity.size = stats.size;
                bundleInfo.integrity.sizeKB = Math.round(stats.size / 1024);
            }
        } catch (error) {
            this.logger.warn('Could not get bundle file stats:', error.message);
        }
        
        return bundleInfo;
    }
    
    /**
     * Find all bundle files in the js directory
     */
    findBundleFiles() {
        if (!fs.existsSync(this.jsDir)) {
            return [];
        }
        
        try {
            const files = fs.readdirSync(this.jsDir);
            return files
                .filter(f => (f.startsWith('bundle-') || f === 'bundle.js') && f.endsWith('.js'))
                .map(f => {
                    const filePath = path.join(this.jsDir, f);
                    const stats = fs.statSync(filePath);
                    return {
                        name: f,
                        path: filePath,
                        size: stats.size,
                        mtime: stats.mtime
                    };
                });
        } catch (error) {
            this.logger.error('Error scanning bundle files:', error.message);
            return [];
        }
    }
    
    /**
     * Emergency fallback when everything else fails
     */
    getEmergencyFallback() {
        this.logger.warn('Using emergency fallback bundle info');
        
        return {
            version: '6.5.1.4',
            buildTime: new Date().toISOString(),
            buildId: Date.now(),
            bundleFile: 'bundle.js',
            staticBundle: 'bundle.js',
            build: Date.now().toString(),
            environment: process.env.NODE_ENV || 'development',
            integrity: {
                hash: 'emergency',
                size: 0,
                sizeKB: 0,
                created: new Date().toISOString()
            },
            paths: {
                versioned: '/js/bundle.js',
                static: '/js/bundle.js',
                manifest: '/js/bundle-manifest.json'
            },
            emergency: true
        };
    }
    
    /**
     * Clear bundle cache (useful after bundle rebuild)
     */
    clearCache() {
        this.bundleCache = null;
        this.cacheExpiry = null;
        this.logger.debug('Bundle cache cleared');
    }
    
    /**
     * Get bundle health status
     */
    async getHealthStatus() {
        try {
            const bundleInfo = await this.getBundleInfo();
            const health = {
                status: 'healthy',
                issues: [],
                bundleInfo
            };
            
            // Check for fallback or emergency mode
            if (bundleInfo.fallback) {
                health.status = 'degraded';
                health.issues.push('Using fallback manifest');
            }
            
            if (bundleInfo.emergency) {
                health.status = 'critical';
                health.issues.push('Using emergency fallback');
            }
            
            // Check file existence
            const staticExists = fs.existsSync(this.staticBundlePath);
            const versionedExists = bundleInfo.bundleFile ? 
                fs.existsSync(path.join(this.jsDir, bundleInfo.bundleFile)) : false;
            
            if (!staticExists) {
                health.status = 'degraded';
                health.issues.push('Static bundle.js missing');
            }
            
            if (!versionedExists) {
                health.status = 'degraded';
                health.issues.push('Versioned bundle missing');
            }
            
            return health;
            
        } catch (error) {
            return {
                status: 'critical',
                issues: [`Health check failed: ${error.message}`],
                bundleInfo: this.getEmergencyFallback()
            };
        }
    }
    
    /**
     * Auto-repair bundle issues
     */
    async autoRepair() {
        this.logger.info('Starting bundle auto-repair...');
        
        try {
            // Clear cache to force fresh check
            this.clearCache();
            
            // Get current status
            const health = await this.getHealthStatus();
            
            if (health.status === 'healthy') {
                this.logger.info('Bundle system is healthy, no repair needed');
                return { success: true, message: 'No repair needed' };
            }
            
            let repaired = 0;
            const repairs = [];
            
            // Repair missing static bundle
            if (health.issues.includes('Static bundle.js missing')) {
                const bundleFiles = this.findBundleFiles().filter(f => f.name !== 'bundle.js');
                if (bundleFiles.length > 0) {
                    const newest = bundleFiles.sort((a, b) => b.mtime - a.mtime)[0];
                    fs.copyFileSync(newest.path, this.staticBundlePath);
                    repairs.push(`Created static bundle from ${newest.name}`);
                    repaired++;
                }
            }
            
            // Repair missing manifest
            if (!fs.existsSync(this.manifestPath)) {
                await this.createFallbackManifest();
                repairs.push('Created fallback manifest');
                repaired++;
            }
            
            // Clear cache after repairs
            this.clearCache();
            
            this.logger.info(`Auto-repair completed: ${repaired} issues fixed`);
            
            return {
                success: true,
                repaired,
                repairs,
                message: `Fixed ${repaired} issue(s)`
            };
            
        } catch (error) {
            this.logger.error('Auto-repair failed:', error.message);
            return {
                success: false,
                error: error.message,
                message: 'Auto-repair failed'
            };
        }
    }
}

export default BundleService;