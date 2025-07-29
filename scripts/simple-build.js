#!/usr/bin/env node

/**
 * Simplified Build System
 * 
 * Replaces complex timestamp-based naming with semantic versioning
 * and automatic HTML reference updates.
 */

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimpleBuildSystem {
    constructor() {
        this.packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
        this.version = this.packageJson.version;
        this.buildTime = new Date().toISOString();
        this.buildId = Date.now();
        
        console.log(`📦 Simple Build System v${this.version}`);
    }
    
    async build() {
        try {
            console.log(`🚀 Building PingOne Import Tool v${this.version}...`);
            
            // 1. Clean old bundles
            await this.cleanOldBundles();
            
            // 2. Build new bundle
            const bundleName = await this.buildBundle();
            
            // 3. Update HTML references
            await this.updateHTMLReference(bundleName);
            
            // 4. Create manifest
            await this.createManifest(bundleName);
            
            // 5. Update version info
            await this.updateVersionInfo();
            
            console.log(`✅ Build completed successfully!`);
            console.log(`📦 Bundle: ${bundleName}`);
            console.log(`🕒 Build time: ${this.buildTime}`);
            
        } catch (error) {
            console.error(`❌ Build failed:`, error.message);
            process.exit(1);
        }
    }
    
    async cleanOldBundles() {
        console.log(`🧹 Cleaning old bundles...`);
        
        const jsDir = path.join(__dirname, '../public/js');
        
        if (!fs.existsSync(jsDir)) {
            fs.mkdirSync(jsDir, { recursive: true });
            return;
        }
        
        const files = fs.readdirSync(jsDir);
        const bundleFiles = files.filter(file => 
            file.startsWith('bundle-') && file.endsWith('.js')
        );
        
        for (const file of bundleFiles) {
            const filePath = path.join(jsDir, file);
            fs.unlinkSync(filePath);
            console.log(`  🗑️  Removed: ${file}`);
        }
        
        console.log(`✅ Cleaned ${bundleFiles.length} old bundle(s)`);
    }
    
    async buildBundle() {
        console.log(`🔨 Building JavaScript bundle...`);
        
        // Use semantic version for bundle name
        const bundleName = `bundle-v${this.version}-${this.buildId}.js`;
        const bundlePath = path.join(__dirname, '../public/js', bundleName);
        
        // Build command using browserify
        const buildCommand = [
            'npx browserify',
            'src/client/app.js',
            '-t [ babelify --presets [ @babel/preset-env ] ]',
            '-o', `public/js/${bundleName}`,
            '--debug' // Include source maps for development
        ].join(' ');
        
        console.log(`  📋 Command: ${buildCommand}`);
        
        try {
            execSync(buildCommand, { 
                stdio: 'inherit',
                cwd: path.join(__dirname, '..')
            });
            
            // Verify bundle was created
            if (!fs.existsSync(bundlePath)) {
                throw new Error(`Bundle not created at ${bundlePath}`);
            }
            
            const stats = fs.statSync(bundlePath);
            const sizeKB = Math.round(stats.size / 1024);
            
            console.log(`✅ Bundle created: ${bundleName} (${sizeKB} KB)`);
            return bundleName;
            
        } catch (error) {
            throw new Error(`Bundle build failed: ${error.message}`);
        }
    }
    
    async updateHTMLReference(bundleName) {
        console.log(`📝 Updating HTML references...`);
        
        const htmlPath = path.join(__dirname, '../public/index.html');
        
        if (!fs.existsSync(htmlPath)) {
            throw new Error(`HTML file not found: ${htmlPath}`);
        }
        
        let html = fs.readFileSync(htmlPath, 'utf8');
        
        // Replace bundle reference
        const bundleRegex = /bundle-[^"]+\.js/g;
        const matches = html.match(bundleRegex);
        
        if (matches) {
            html = html.replace(bundleRegex, bundleName);
            console.log(`  🔄 Replaced ${matches.length} bundle reference(s)`);
        } else {
            // Look for bundle placeholder and replace it
            const placeholderRegex = /<!-- BUNDLE_PLACEHOLDER -->/;
            if (html.match(placeholderRegex)) {
                const bundleScript = `<script src="/js/${bundleName}"></script>`;
                html = html.replace(placeholderRegex, bundleScript);
                console.log(`  ✅ Added bundle script tag: ${bundleName}`);
            } else {
                console.log(`  ⚠️  No bundle references or placeholder found in HTML`);
            }
        }
        
        // Update version in title and banner
        const versionRegex = /PingOne User Import v[\d.]+/g;
        const newVersionString = `PingOne User Import v${this.version}`;
        html = html.replace(versionRegex, newVersionString);
        
        // Update cache buster
        const cacheBusterRegex = /"cache-buster" content="[^"]+"/;
        html = html.replace(cacheBusterRegex, `"cache-buster" content="${this.buildId}"`);
        
        fs.writeFileSync(htmlPath, html);
        console.log(`✅ HTML updated with new bundle reference`);
    }
    
    async createManifest(bundleName) {
        console.log(`📋 Creating bundle manifest...`);
        
        const manifest = {
            version: this.version,
            buildTime: this.buildTime,
            buildId: this.buildId,
            bundleFile: bundleName,
            build: this.buildId.toString(),
            environment: process.env.NODE_ENV || 'development'
        };
        
        const manifestPath = path.join(__dirname, '../public/js/bundle-manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log(`✅ Manifest created: bundle-manifest.json`);
    }
    
    async updateVersionInfo() {
        console.log(`📊 Updating version information...`);
        
        // Update package.json build info
        this.packageJson.buildInfo = {
            buildTime: this.buildTime,
            buildId: this.buildId,
            lastBuild: new Date().toISOString()
        };
        
        const packagePath = path.join(__dirname, '../package.json');
        fs.writeFileSync(packagePath, JSON.stringify(this.packageJson, null, 2));
        
        console.log(`✅ Version info updated`);
    }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const buildSystem = new SimpleBuildSystem();
    buildSystem.build().catch(error => {
        console.error('Build failed:', error);
        process.exit(1);
    });
}

export default SimpleBuildSystem;