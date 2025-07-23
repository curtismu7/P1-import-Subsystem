#!/usr/bin/env node

/**
 * Production Bundle Optimizer
 * 
 * This script creates optimized, production-ready bundles with:
 * - Semantic versioning instead of timestamps
 * - Minification and compression
 * - Integrity checks and cache headers
 * - Bundle analysis and optimization reports
 * - Automatic HTML reference updates
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductionBundleOptimizer {
    constructor(options = {}) {
        this.options = {
            outputDir: path.join(process.cwd(), 'public', 'js'),
            analyze: options.analyze || false,
            minify: options.minify !== false,
            sourcemap: options.sourcemap !== false,
            version: options.version || null,
            ...options
        };
        
        this.stats = {
            startTime: Date.now(),
            originalSize: 0,
            optimizedSize: 0,
            compressionRatio: 0,
            bundleHash: null
        };
    }
    
    /**
     * Main optimization process
     */
    async optimize() {
        console.log('🚀 Starting production bundle optimization...');
        
        try {
            // Load package info for version
            const packageInfo = await this.loadPackageInfo();
            if (!this.options.version) {
                this.options.version = packageInfo.version;
            }
            
            console.log(`📦 Version: ${this.options.version}`);
            
            // Clean old bundles
            await this.cleanOldBundles();
            
            // Build optimized bundle
            const bundlePath = await this.buildOptimizedBundle();
            
            // Generate bundle hash
            const bundleHash = await this.generateBundleHash(bundlePath);
            this.stats.bundleHash = bundleHash;
            
            // Update HTML references
            await this.updateHTMLReferences(bundlePath, bundleHash);
            
            // Generate bundle manifest
            await this.generateBundleManifest(bundlePath, bundleHash);
            
            // Analyze bundle if requested
            if (this.options.analyze) {
                await this.analyzeBundleSize(bundlePath);
            }
            
            // Generate optimization report
            const report = await this.generateOptimizationReport(bundlePath);
            
            console.log('✅ Bundle optimization completed successfully!');
            console.log(`📦 Bundle: ${path.basename(bundlePath)}`);
            console.log(`🔍 Hash: ${bundleHash.substring(0, 12)}...`);
            console.log(`📊 Size: ${this.formatBytes(this.stats.optimizedSize)}`);
            console.log(`⚡ Compression: ${this.stats.compressionRatio}%`);
            
            return report;
            
        } catch (error) {
            console.error('❌ Bundle optimization failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Load package.json information
     */
    async loadPackageInfo() {
        const packagePath = path.join(process.cwd(), 'package.json');
        const packageData = await fs.readFile(packagePath, 'utf8');
        return JSON.parse(packageData);
    }
    
    /**
     * Clean old bundle files
     */
    async cleanOldBundles() {
        console.log('🧹 Cleaning old bundle files...');
        
        try {
            const files = await fs.readdir(this.options.outputDir);
            const bundleFiles = files.filter(file => 
                file.startsWith('bundle-') && file.endsWith('.js')
            );
            
            for (const file of bundleFiles) {
                const filePath = path.join(this.options.outputDir, file);
                await fs.unlink(filePath);
                console.log(`   Removed: ${file}`);
            }
            
            console.log(`✅ Cleaned ${bundleFiles.length} old bundle files`);
            
        } catch (error) {
            console.warn('⚠️ Warning: Could not clean old bundles:', error.message);
        }
    }
    
    /**
     * Build optimized bundle
     */
    async buildOptimizedBundle() {
        console.log('🔨 Building optimized bundle...');
        
        const bundleName = `bundle-v${this.options.version}.js`;
        const bundlePath = path.join(this.options.outputDir, bundleName);
        
        // Build command with optimizations
        let buildCommand = [
            'npx browserify src/client/app.js',
            '-t [ babelify --configFile ./config/babel.config.json --presets [ @babel/preset-env ] --plugins [ @babel/plugin-transform-runtime ] ]',
            '-o', bundlePath
        ].join(' ');
        
        // Add source map if enabled
        if (this.options.sourcemap) {
            buildCommand += ' --debug';
        }
        
        try {
            console.log('   Building bundle...');
            execSync(buildCommand, { stdio: 'pipe' });
            
            // Get original size
            const stats = await fs.stat(bundlePath);
            this.stats.originalSize = stats.size;
            
            console.log(`   Original size: ${this.formatBytes(this.stats.originalSize)}`);
            
            // Minify if enabled
            if (this.options.minify) {
                await this.minifyBundle(bundlePath);
            }
            
            // Get final size
            const finalStats = await fs.stat(bundlePath);
            this.stats.optimizedSize = finalStats.size;
            this.stats.compressionRatio = Math.round(
                ((this.stats.originalSize - this.stats.optimizedSize) / this.stats.originalSize) * 100
            );
            
            console.log(`   Optimized size: ${this.formatBytes(this.stats.optimizedSize)}`);
            console.log(`   Compression: ${this.stats.compressionRatio}%`);
            
            return bundlePath;
            
        } catch (error) {
            throw new Error(`Bundle build failed: ${error.message}`);
        }
    }
    
    /**
     * Minify bundle using Terser
     */
    async minifyBundle(bundlePath) {
        console.log('   Minifying bundle...');
        
        try {
            let minifyCommand = [
                'npx terser',
                bundlePath,
                '--compress',
                '--mangle',
                '--output', bundlePath
            ].join(' ');
            
            if (this.options.sourcemap) {
                minifyCommand += ` --source-map "filename='${path.basename(bundlePath)}.map',url='${path.basename(bundlePath)}.map'"`;
            }
            
            execSync(minifyCommand, { stdio: 'pipe' });
            
        } catch (error) {
            console.warn('⚠️ Warning: Minification failed:', error.message);
        }
    }
    
    /**
     * Generate bundle hash for integrity checking
     */
    async generateBundleHash(bundlePath) {
        console.log('🔐 Generating bundle hash...');
        
        const bundleContent = await fs.readFile(bundlePath);
        const hash = crypto.createHash('sha256').update(bundleContent).digest('hex');
        
        return hash;
    }
    
    /**
     * Update HTML references to use new bundle
     */
    async updateHTMLReferences(bundlePath, bundleHash) {
        console.log('📝 Updating HTML references...');
        
        const htmlPath = path.join(process.cwd(), 'public', 'index.html');
        const bundleName = path.basename(bundlePath);
        
        try {
            let htmlContent = await fs.readFile(htmlPath, 'utf8');
            
            // Replace bundle reference with version-based name
            htmlContent = htmlContent.replace(
                /<script[^>]*src=["']js\/bundle-[^"']*\.js["'][^>]*><\/script>/g,
                `<script src="js/${bundleName}" integrity="sha256-${bundleHash}" crossorigin="anonymous"></script>`
            );
            
            // Add cache control meta tag
            if (!htmlContent.includes('cache-control')) {
                const headCloseIndex = htmlContent.indexOf('</head>');
                if (headCloseIndex !== -1) {
                    const cacheControlMeta = '    <meta http-equiv="cache-control" content="public, max-age=31536000, immutable">\n';
                    htmlContent = htmlContent.slice(0, headCloseIndex) + cacheControlMeta + htmlContent.slice(headCloseIndex);
                }
            }
            
            await fs.writeFile(htmlPath, htmlContent, 'utf8');
            console.log(`   Updated: ${path.basename(htmlPath)}`);
            
        } catch (error) {
            throw new Error(`Failed to update HTML references: ${error.message}`);
        }
    }
    
    /**
     * Generate bundle manifest for runtime loading
     */
    async generateBundleManifest(bundlePath, bundleHash) {
        console.log('📋 Generating bundle manifest...');
        
        const manifest = {
            version: this.options.version,
            bundleFile: path.basename(bundlePath),
            hash: bundleHash,
            size: this.stats.optimizedSize,
            timestamp: new Date().toISOString(),
            integrity: `sha256-${bundleHash}`,
            cacheControl: 'public, max-age=31536000, immutable'
        };
        
        const manifestPath = path.join(this.options.outputDir, 'bundle-manifest.json');
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
        
        console.log(`   Generated: ${path.basename(manifestPath)}`);
    }
    
    /**
     * Analyze bundle size and composition
     */
    async analyzeBundleSize(bundlePath) {
        console.log('📊 Analyzing bundle composition...');
        
        try {
            // Use webpack-bundle-analyzer equivalent for browserify
            const analyzeCommand = `npx disc ${bundlePath} --output ${bundlePath.replace('.js', '-analysis.html')}`;
            execSync(analyzeCommand, { stdio: 'pipe' });
            
            console.log(`   Analysis report: ${path.basename(bundlePath).replace('.js', '-analysis.html')}`);
            
        } catch (error) {
            console.warn('⚠️ Warning: Bundle analysis failed:', error.message);
        }
    }
    
    /**
     * Generate optimization report
     */
    async generateOptimizationReport(bundlePath) {
        const duration = Date.now() - this.stats.startTime;
        
        const report = {
            timestamp: new Date().toISOString(),
            version: this.options.version,
            bundle: {
                name: path.basename(bundlePath),
                path: bundlePath,
                hash: this.stats.bundleHash,
                size: {
                    original: this.stats.originalSize,
                    optimized: this.stats.optimizedSize,
                    compression: this.stats.compressionRatio
                }
            },
            optimization: {
                minified: this.options.minify,
                sourcemap: this.options.sourcemap,
                analyzed: this.options.analyze
            },
            performance: {
                buildTime: duration,
                buildTimeFormatted: this.formatDuration(duration)
            },
            recommendations: this.generateRecommendations()
        };
        
        // Ensure docs directory exists
        const docsDir = path.join(process.cwd(), 'docs');
        try {
            await fs.mkdir(docsDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
        
        // Save report
        const reportPath = path.join(docsDir, 'bundle-optimization-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
        
        return report;
    }
    
    /**
     * Generate optimization recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (this.stats.optimizedSize > 1024 * 1024) { // > 1MB
            recommendations.push({
                type: 'size',
                severity: 'medium',
                message: 'Bundle size is large (>1MB). Consider code splitting or lazy loading.'
            });
        }
        
        if (this.stats.compressionRatio < 20) {
            recommendations.push({
                type: 'compression',
                severity: 'low',
                message: 'Low compression ratio. Bundle may already be optimized or contain binary data.'
            });
        }
        
        if (!this.options.minify) {
            recommendations.push({
                type: 'optimization',
                severity: 'high',
                message: 'Enable minification for production builds to reduce bundle size.'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Format duration to human readable format
     */
    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    }
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const options = {
        analyze: args.includes('--analyze'),
        minify: !args.includes('--no-minify'),
        sourcemap: !args.includes('--no-sourcemap'),
        version: args.find(arg => arg.startsWith('--version='))?.split('=')[1]
    };
    
    const optimizer = new ProductionBundleOptimizer(options);
    
    optimizer.optimize()
        .then(report => {
            console.log('\n📋 Optimization Report:');
            console.log(`   Version: ${report.version}`);
            console.log(`   Bundle: ${report.bundle.name}`);
            console.log(`   Size: ${optimizer.formatBytes(report.bundle.size.optimized)}`);
            console.log(`   Build Time: ${report.performance.buildTimeFormatted}`);
            
            if (report.recommendations.length > 0) {
                console.log('\n💡 Recommendations:');
                report.recommendations.forEach(rec => {
                    console.log(`   ${rec.severity.toUpperCase()}: ${rec.message}`);
                });
            }
            
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Optimization failed:', error.message);
            process.exit(1);
        });
}

export default ProductionBundleOptimizer;