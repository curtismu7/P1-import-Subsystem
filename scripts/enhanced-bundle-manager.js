#!/usr/bin/env node

/**
 * Enhanced Bundle Manager
 * 
 * Robust bundle handling system that resolves issues with wrong bundles
 * by implementing proper versioning, cleanup, and reference management.
 */

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedBundleManager {
    constructor() {
        this.packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
        this.version = this.packageJson.version;
        this.buildTime = new Date().toISOString();
        this.buildId = Date.now();
        
        // Paths
        this.jsDir = path.join(__dirname, '../public/js');
        this.publicDir = path.join(__dirname, '../public');
        this.manifestPath = path.join(this.jsDir, 'bundle-manifest.json');
        
        console.log(`🚀 Enhanced Bundle Manager v${this.version}`);
        console.log(`📅 Build Time: ${this.buildTime}`);
        console.log(`🆔 Build ID: ${this.buildId}`);
    }
    
    async build() {
        try {
            console.log(`\n🔨 Starting enhanced bundle build process...`);
            
            // 1. Ensure directories exist
            await this.ensureDirectories();
            
            // 2. Clean old bundles and temporary files
            await this.cleanOldBundles();
            
            // 3. Build new bundle with integrity checking
            const bundleInfo = await this.buildBundle();
            
            // 4. Create static bundle.js symlink/copy
            await this.createStaticBundle(bundleInfo.name);
            
            // 5. Update all HTML references
            await this.updateAllHTMLReferences(bundleInfo.name);
            
            // 6. Create comprehensive manifest
            await this.createManifest(bundleInfo);
            
            // 7. Verify bundle integrity
            await this.verifyBundleIntegrity(bundleInfo);
            
            // 8. Update version info
            await this.updateVersionInfo(bundleInfo);
            
            console.log(`\n✅ Enhanced bundle build completed successfully!`);
            console.log(`📦 Bundle: ${bundleInfo.name}`);
            console.log(`🔒 Hash: ${bundleInfo.hash}`);
            console.log(`📏 Size: ${bundleInfo.sizeKB} KB`);
            console.log(`🕒 Build time: ${this.buildTime}`);
            
            return bundleInfo;
            
        } catch (error) {
            console.error(`\n❌ Enhanced bundle build failed:`, error.message);
            console.error(`📍 Stack trace:`, error.stack);
            process.exit(1);
        }
    }
    
    async ensureDirectories() {
        console.log(`📁 Ensuring directories exist...`);
        
        const dirs = [this.jsDir, path.join(this.jsDir, 'modules'), path.join(this.jsDir, 'utils')];
        
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`  ✅ Created directory: ${path.relative(process.cwd(), dir)}`);
            }
        }
    }
    
    async cleanOldBundles() {
        console.log(`🧹 Cleaning old bundles and temporary files...`);
        
        if (!fs.existsSync(this.jsDir)) {
            return;
        }
        
        const files = fs.readdirSync(this.jsDir);
        let cleanedCount = 0;
        
        for (const file of files) {
            const filePath = path.join(this.jsDir, file);
            
            // Remove old versioned bundles
            if (file.startsWith('bundle-v') && file.endsWith('.js')) {
                fs.unlinkSync(filePath);
                console.log(`  🗑️  Removed old bundle: ${file}`);
                cleanedCount++;
            }
            
            // Remove temporary browserify files
            if (file.includes('.tmp-browserify-')) {
                fs.unlinkSync(filePath);
                console.log(`  🗑️  Removed temp file: ${file}`);
                cleanedCount++;
            }
            
            // Remove old source maps
            if (file.endsWith('.js.map') && file.startsWith('bundle-')) {
                fs.unlinkSync(filePath);
                console.log(`  🗑️  Removed old source map: ${file}`);
                cleanedCount++;
            }
        }
        
        console.log(`✅ Cleaned ${cleanedCount} old file(s)`);
    }
    
    async buildBundle() {
        console.log(`🔨 Building JavaScript bundle with enhanced features...`);
        
        // Generate bundle name with version and build ID
        const bundleName = `bundle-v${this.version}-${this.buildId}.js`;
        const bundlePath = path.join(this.jsDir, bundleName);
        const sourceMapPath = `${bundlePath}.map`;
        
        // Enhanced build command with optimizations
        const buildCommand = [
            'npx browserify',
            'src/client/app.js',
            '-t [ babelify --presets [ @babel/preset-env ] ]',
            '--debug', // Include source maps
            '-o', `public/js/${bundleName}`,
            '--verbose' // Verbose output for debugging
        ].join(' ');
        
        console.log(`  📋 Command: ${buildCommand}`);
        
        try {
            // Execute build with proper error handling
            const output = execSync(buildCommand, { 
                stdio: 'pipe',
                cwd: path.join(__dirname, '..'),
                encoding: 'utf8'
            });
            
            console.log(`  📝 Build output: ${output.substring(0, 200)}...`);
            
            // Verify bundle was created
            if (!fs.existsSync(bundlePath)) {
                throw new Error(`Bundle not created at ${bundlePath}`);
            }
            
            // Get bundle statistics
            const stats = fs.statSync(bundlePath);
            const sizeKB = Math.round(stats.size / 1024);
            
            // Generate content hash for integrity checking
            const bundleContent = fs.readFileSync(bundlePath);
            const hash = crypto.createHash('sha256').update(bundleContent).digest('hex').substring(0, 16);
            
            // Verify bundle content
            const bundleText = bundleContent.toString();
            if (bundleText.length < 1000) {
                throw new Error(`Bundle appears to be too small (${bundleText.length} chars) - build may have failed`);
            }
            
            if (!bundleText.includes('function') && !bundleText.includes('=>')) {
                throw new Error('Bundle does not appear to contain JavaScript code');
            }
            
            console.log(`✅ Bundle created successfully: ${bundleName}`);
            console.log(`  📏 Size: ${sizeKB} KB`);
            console.log(`  🔒 Hash: ${hash}`);
            console.log(`  📝 Content length: ${bundleText.length} characters`);
            
            return {
                name: bundleName,
                path: bundlePath,
                size: stats.size,
                sizeKB,
                hash,
                created: new Date().toISOString()
            };
            
        } catch (error) {
            throw new Error(`Bundle build failed: ${error.message}`);
        }
    }
    
    async createStaticBundle(bundleName) {
        console.log(`🔗 Creating static bundle.js reference...`);
        
        const staticBundlePath = path.join(this.jsDir, 'bundle.js');
        const versionedBundlePath = path.join(this.jsDir, bundleName);
        
        // Remove existing static bundle
        if (fs.existsSync(staticBundlePath)) {
            fs.unlinkSync(staticBundlePath);
        }
        
        // Create a copy (not symlink for better compatibility)
        fs.copyFileSync(versionedBundlePath, staticBundlePath);
        
        console.log(`✅ Static bundle.js created (copy of ${bundleName})`);
    }
    
    async updateAllHTMLReferences(bundleName) {
        console.log(`📝 Updating HTML references across all files...`);
        
        const htmlFiles = this.findHTMLFiles(this.publicDir);
        let updatedFiles = 0;
        
        for (const htmlFile of htmlFiles) {
            try {
                let html = fs.readFileSync(htmlFile, 'utf8');
                let modified = false;
                
                // Update versioned bundle references
                const versionedBundleRegex = /bundle-v[^"']+\.js/g;
                if (html.match(versionedBundleRegex)) {
                    html = html.replace(versionedBundleRegex, bundleName);
                    modified = true;
                    console.log(`  🔄 Updated versioned bundle in: ${path.relative(this.publicDir, htmlFile)}`);
                }
                
                // Update cache buster meta tags
                const cacheBusterRegex = /"cache-buster" content="[^"]+"/;
                if (html.match(cacheBusterRegex)) {
                    html = html.replace(cacheBusterRegex, `"cache-buster" content="${this.buildId}"`);
                    modified = true;
                }
                
                // Update version strings in titles
                const versionRegex = /PingOne User Import v[\\d.]+/g;
                const newVersionString = `PingOne User Import v${this.version}`;
                if (html.match(versionRegex)) {
                    html = html.replace(versionRegex, newVersionString);
                    modified = true;
                }
                
                if (modified) {
                    fs.writeFileSync(htmlFile, html);
                    updatedFiles++;
                }
                
            } catch (error) {
                console.warn(`  ⚠️  Failed to update ${htmlFile}: ${error.message}`);
            }
        }
        
        console.log(`✅ Updated ${updatedFiles} HTML file(s)`);
    }
    
    findHTMLFiles(dir) {
        const htmlFiles = [];
        
        const scanDirectory = (currentDir) => {
            const files = fs.readdirSync(currentDir);
            
            for (const file of files) {
                const filePath = path.join(currentDir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                    scanDirectory(filePath);
                } else if (file.endsWith('.html')) {
                    htmlFiles.push(filePath);
                }
            }
        };
        
        scanDirectory(dir);
        return htmlFiles;
    }
    
    async createManifest(bundleInfo) {
        console.log(`📋 Creating comprehensive bundle manifest...`);
        
        const manifest = {
            version: this.version,
            buildTime: this.buildTime,
            buildId: this.buildId,
            bundleFile: bundleInfo.name,
            staticBundle: 'bundle.js',
            build: this.buildId.toString(),
            environment: process.env.NODE_ENV || 'development',
            integrity: {
                hash: bundleInfo.hash,
                size: bundleInfo.size,
                sizeKB: bundleInfo.sizeKB,
                created: bundleInfo.created
            },
            paths: {
                versioned: `/js/${bundleInfo.name}`,
                static: '/js/bundle.js',
                manifest: '/js/bundle-manifest.json'
            },
            compatibility: {
                browserify: true,
                babel: true,
                sourceMap: true
            }
        };
        
        fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log(`✅ Comprehensive manifest created: bundle-manifest.json`);
        console.log(`  📦 Versioned bundle: ${manifest.paths.versioned}`);
        console.log(`  🔗 Static bundle: ${manifest.paths.static}`);
        console.log(`  🔒 Integrity hash: ${manifest.integrity.hash}`);
    }
    
    async verifyBundleIntegrity(bundleInfo) {
        console.log(`🔍 Verifying bundle integrity...`);
        
        const checks = [];
        
        // Check versioned bundle exists and is readable
        try {
            const versionedBundle = fs.readFileSync(bundleInfo.path, 'utf8');
            checks.push({ name: 'Versioned bundle readable', status: 'pass' });
            
            // Check for common JavaScript patterns
            if (versionedBundle.includes('function') || versionedBundle.includes('=>')) {
                checks.push({ name: 'Contains JavaScript code', status: 'pass' });
            } else {
                checks.push({ name: 'Contains JavaScript code', status: 'fail' });
            }
            
            // Check bundle size is reasonable
            if (versionedBundle.length > 10000) {
                checks.push({ name: 'Bundle size reasonable', status: 'pass' });
            } else {
                checks.push({ name: 'Bundle size reasonable', status: 'fail' });
            }
            
        } catch (error) {
            checks.push({ name: 'Versioned bundle readable', status: 'fail', error: error.message });
        }
        
        // Check static bundle exists
        const staticBundlePath = path.join(this.jsDir, 'bundle.js');
        try {
            fs.accessSync(staticBundlePath, fs.constants.R_OK);
            checks.push({ name: 'Static bundle exists', status: 'pass' });
        } catch (error) {
            checks.push({ name: 'Static bundle exists', status: 'fail', error: error.message });
        }
        
        // Check manifest exists and is valid JSON
        try {
            const manifest = JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
            checks.push({ name: 'Manifest valid JSON', status: 'pass' });
            
            if (manifest.bundleFile === bundleInfo.name) {
                checks.push({ name: 'Manifest bundle reference correct', status: 'pass' });
            } else {
                checks.push({ name: 'Manifest bundle reference correct', status: 'fail' });
            }
            
        } catch (error) {
            checks.push({ name: 'Manifest valid JSON', status: 'fail', error: error.message });
        }
        
        // Report results
        const passed = checks.filter(c => c.status === 'pass').length;
        const failed = checks.filter(c => c.status === 'fail').length;
        
        console.log(`  ✅ Passed: ${passed} checks`);
        if (failed > 0) {
            console.log(`  ❌ Failed: ${failed} checks`);
            checks.filter(c => c.status === 'fail').forEach(check => {
                console.log(`    - ${check.name}: ${check.error || 'Failed'}`);
            });
        }
        
        if (failed > 0) {
            throw new Error(`Bundle integrity verification failed: ${failed} checks failed`);
        }
        
        console.log(`✅ Bundle integrity verification passed`);
    }
    
    async updateVersionInfo(bundleInfo) {
        console.log(`📊 Updating version information...`);
        
        // Update package.json build info
        this.packageJson.buildInfo = {
            buildTime: this.buildTime,
            buildId: this.buildId,
            lastBuild: new Date().toISOString(),
            bundleInfo: {
                name: bundleInfo.name,
                hash: bundleInfo.hash,
                size: bundleInfo.sizeKB
            }
        };
        
        const packagePath = path.join(__dirname, '../package.json');
        fs.writeFileSync(packagePath, JSON.stringify(this.packageJson, null, 2));
        
        console.log(`✅ Version info updated in package.json`);
    }
    
    // Utility method to get current bundle info
    static getCurrentBundle() {
        try {
            const manifestPath = path.join(process.cwd(), 'public/js/bundle-manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            return manifest;
        } catch (error) {
            console.warn('Could not read bundle manifest:', error.message);
            return null;
        }
    }
    
    // Utility method to clean up all bundles (for emergency cleanup)
    static async emergencyCleanup() {
        console.log('🚨 Emergency bundle cleanup...');
        
        const jsDir = path.join(process.cwd(), 'public/js');
        if (!fs.existsSync(jsDir)) return;
        
        const files = fs.readdirSync(jsDir);
        let cleaned = 0;
        
        for (const file of files) {
            if (file.startsWith('bundle-') || file.includes('.tmp-browserify-')) {
                fs.unlinkSync(path.join(jsDir, file));
                console.log(`  🗑️  Removed: ${file}`);
                cleaned++;
            }
        }
        
        console.log(`✅ Emergency cleanup completed: ${cleaned} files removed`);
    }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    
    if (command === 'cleanup') {
        EnhancedBundleManager.emergencyCleanup();
    } else if (command === 'info') {
        const info = EnhancedBundleManager.getCurrentBundle();
        console.log('Current bundle info:', JSON.stringify(info, null, 2));
    } else {
        const bundleManager = new EnhancedBundleManager();
        bundleManager.build().catch(error => {
            console.error('Enhanced bundle build failed:', error);
            process.exit(1);
        });
    }
}

export default EnhancedBundleManager;