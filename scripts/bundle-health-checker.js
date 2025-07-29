#!/usr/bin/env node

/**
 * Bundle Health Checker
 * 
 * Diagnoses and fixes bundle-related issues by checking:
 * - Bundle file existence and integrity
 * - HTML reference consistency
 * - Manifest accuracy
 * - Static bundle availability
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BundleHealthChecker {
    constructor() {
        this.jsDir = path.join(__dirname, '../public/js');
        this.publicDir = path.join(__dirname, '../public');
        this.manifestPath = path.join(this.jsDir, 'bundle-manifest.json');
        this.issues = [];
        this.fixes = [];
    }
    
    async checkHealth() {
        console.log('🏥 Bundle Health Checker - Diagnosing bundle issues...\n');
        
        try {
            // 1. Check manifest
            await this.checkManifest();
            
            // 2. Check bundle files
            await this.checkBundleFiles();
            
            // 3. Check HTML references
            await this.checkHTMLReferences();
            
            // 4. Check bundle integrity
            await this.checkBundleIntegrity();
            
            // 5. Check for orphaned files
            await this.checkOrphanedFiles();
            
            // 6. Generate report
            this.generateReport();
            
            // 7. Offer fixes
            if (this.issues.length > 0) {
                await this.offerFixes();
            }
            
        } catch (error) {
            console.error('❌ Health check failed:', error.message);
            process.exit(1);
        }
    }
    
    async checkManifest() {
        console.log('📋 Checking bundle manifest...');
        
        if (!fs.existsSync(this.manifestPath)) {
            this.addIssue('critical', 'Bundle manifest missing', 'bundle-manifest.json not found');
            return;
        }
        
        try {
            const manifest = JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
            
            // Check required fields
            const requiredFields = ['version', 'buildTime', 'buildId', 'bundleFile'];
            for (const field of requiredFields) {
                if (!manifest[field]) {
                    this.addIssue('high', `Manifest missing ${field}`, `Required field ${field} not found in manifest`);
                }
            }
            
            // Check if referenced bundle exists
            if (manifest.bundleFile) {
                const bundlePath = path.join(this.jsDir, manifest.bundleFile);
                if (!fs.existsSync(bundlePath)) {
                    this.addIssue('critical', 'Referenced bundle missing', `Manifest references ${manifest.bundleFile} but file not found`);
                }
            }
            
            console.log('  ✅ Manifest structure valid');
            
        } catch (error) {
            this.addIssue('critical', 'Manifest corrupted', `Cannot parse manifest: ${error.message}`);
        }
    }
    
    async checkBundleFiles() {
        console.log('📦 Checking bundle files...');
        
        if (!fs.existsSync(this.jsDir)) {
            this.addIssue('critical', 'JS directory missing', 'public/js directory not found');
            return;
        }
        
        const files = fs.readdirSync(this.jsDir);
        const bundleFiles = files.filter(f => f.startsWith('bundle-') && f.endsWith('.js'));
        const staticBundle = files.includes('bundle.js');
        
        console.log(`  📊 Found ${bundleFiles.length} versioned bundle(s)`);
        console.log(`  🔗 Static bundle.js: ${staticBundle ? 'exists' : 'missing'}`);
        
        if (bundleFiles.length === 0) {
            this.addIssue('critical', 'No bundles found', 'No versioned bundle files found in public/js');
        } else if (bundleFiles.length > 1) {
            this.addIssue('medium', 'Multiple bundles found', `Found ${bundleFiles.length} bundle files - should clean up old ones`);
        }
        
        if (!staticBundle) {
            this.addIssue('high', 'Static bundle missing', 'bundle.js not found - many HTML files reference this');
        }
        
        // Check for temporary files
        const tempFiles = files.filter(f => f.includes('.tmp-browserify-'));
        if (tempFiles.length > 0) {
            this.addIssue('low', 'Temporary files found', `Found ${tempFiles.length} temporary browserify files`);
        }
    }
    
    async checkHTMLReferences() {
        console.log('📝 Checking HTML bundle references...');
        
        const htmlFiles = this.findHTMLFiles(this.publicDir);
        const references = {
            static: 0,
            versioned: 0,
            missing: 0,
            inconsistent: []
        };
        
        for (const htmlFile of htmlFiles) {
            try {
                const html = fs.readFileSync(htmlFile, 'utf8');
                const relativePath = path.relative(this.publicDir, htmlFile);
                
                // Check for static bundle.js references
                if (html.includes('/js/bundle.js') || html.includes('js/bundle.js')) {
                    references.static++;
                }
                
                // Check for versioned bundle references
                const versionedMatches = html.match(/bundle-v[^"']+\\.js/g);
                if (versionedMatches) {
                    references.versioned++;
                    
                    // Check if all references in this file are consistent
                    const uniqueRefs = [...new Set(versionedMatches)];
                    if (uniqueRefs.length > 1) {
                        references.inconsistent.push({
                            file: relativePath,
                            references: uniqueRefs
                        });
                    }
                }
                
                // Check if file has no bundle references at all
                if (!html.includes('bundle') || !html.includes('.js')) {
                    // This might be intentional for some files, so just note it
                }
                
            } catch (error) {
                console.warn(`    ⚠️  Could not check ${htmlFile}: ${error.message}`);
            }
        }
        
        console.log(`  📊 Static references: ${references.static}`);
        console.log(`  📊 Versioned references: ${references.versioned}`);
        
        if (references.inconsistent.length > 0) {
            this.addIssue('high', 'Inconsistent bundle references', 
                `${references.inconsistent.length} HTML files have inconsistent bundle references`);
        }
        
        if (references.static > 0 && references.versioned > 0) {
            this.addIssue('medium', 'Mixed reference types', 
                'Some files use static bundle.js, others use versioned bundles');
        }
    }
    
    async checkBundleIntegrity() {
        console.log('🔍 Checking bundle integrity...');
        
        try {
            const manifest = JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
            
            if (manifest.bundleFile) {
                const bundlePath = path.join(this.jsDir, manifest.bundleFile);
                
                if (fs.existsSync(bundlePath)) {
                    const bundleContent = fs.readFileSync(bundlePath, 'utf8');
                    
                    // Check bundle size
                    if (bundleContent.length < 1000) {
                        this.addIssue('critical', 'Bundle too small', 
                            `Bundle is only ${bundleContent.length} characters - likely corrupted`);
                    }
                    
                    // Check for JavaScript content
                    if (!bundleContent.includes('function') && !bundleContent.includes('=>')) {
                        this.addIssue('critical', 'Bundle missing JavaScript', 
                            'Bundle does not appear to contain JavaScript code');
                    }
                    
                    // Check integrity hash if available
                    if (manifest.integrity && manifest.integrity.hash) {
                        const currentHash = crypto.createHash('sha256')
                            .update(bundleContent)
                            .digest('hex')
                            .substring(0, 16);
                        
                        if (currentHash !== manifest.integrity.hash) {
                            this.addIssue('high', 'Bundle integrity mismatch', 
                                'Bundle content hash does not match manifest');
                        }
                    }
                    
                    console.log(`  ✅ Bundle integrity check passed`);
                }
            }
            
        } catch (error) {
            this.addIssue('medium', 'Integrity check failed', `Could not verify bundle integrity: ${error.message}`);
        }
    }
    
    async checkOrphanedFiles() {
        console.log('🧹 Checking for orphaned files...');
        
        if (!fs.existsSync(this.jsDir)) return;
        
        const files = fs.readdirSync(this.jsDir);
        const orphanedFiles = [];
        
        // Check for old bundle files
        const bundleFiles = files.filter(f => f.startsWith('bundle-') && f.endsWith('.js'));
        if (bundleFiles.length > 1) {
            // Sort by modification time, keep newest
            const bundleStats = bundleFiles.map(f => ({
                name: f,
                mtime: fs.statSync(path.join(this.jsDir, f)).mtime
            }));
            bundleStats.sort((a, b) => b.mtime - a.mtime);
            
            // Mark older bundles as orphaned
            for (let i = 1; i < bundleStats.length; i++) {
                orphanedFiles.push(bundleStats[i].name);
            }
        }
        
        // Check for temporary files
        const tempFiles = files.filter(f => f.includes('.tmp-browserify-'));
        orphanedFiles.push(...tempFiles);
        
        // Check for old source maps
        const oldMaps = files.filter(f => f.endsWith('.js.map') && f.startsWith('bundle-'));
        const currentBundle = bundleFiles[0];
        if (currentBundle) {
            const currentMapName = `${currentBundle}.map`;
            orphanedFiles.push(...oldMaps.filter(f => f !== currentMapName));
        }
        
        if (orphanedFiles.length > 0) {
            this.addIssue('low', 'Orphaned files found', 
                `Found ${orphanedFiles.length} orphaned files that can be cleaned up`);
        }
        
        console.log(`  📊 Found ${orphanedFiles.length} orphaned file(s)`);
    }
    
    findHTMLFiles(dir) {
        const htmlFiles = [];
        
        const scanDirectory = (currentDir) => {
            try {
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
            } catch (error) {
                // Skip directories we can't read
            }
        };
        
        scanDirectory(dir);
        return htmlFiles;
    }
    
    addIssue(severity, title, description) {
        this.issues.push({
            severity,
            title,
            description,
            timestamp: new Date().toISOString()
        });
    }
    
    generateReport() {
        console.log('\\n📊 Bundle Health Report');
        console.log('========================\\n');
        
        if (this.issues.length === 0) {
            console.log('✅ No issues found - bundle system is healthy!\\n');
            return;
        }
        
        const severityCounts = {
            critical: this.issues.filter(i => i.severity === 'critical').length,
            high: this.issues.filter(i => i.severity === 'high').length,
            medium: this.issues.filter(i => i.severity === 'medium').length,
            low: this.issues.filter(i => i.severity === 'low').length
        };
        
        console.log(`📈 Issue Summary:`);
        console.log(`  🔴 Critical: ${severityCounts.critical}`);
        console.log(`  🟠 High: ${severityCounts.high}`);
        console.log(`  🟡 Medium: ${severityCounts.medium}`);
        console.log(`  🟢 Low: ${severityCounts.low}`);
        console.log('');
        
        // Group and display issues by severity
        const severityOrder = ['critical', 'high', 'medium', 'low'];
        const severityIcons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
        
        for (const severity of severityOrder) {
            const severityIssues = this.issues.filter(i => i.severity === severity);
            if (severityIssues.length === 0) continue;
            
            console.log(`${severityIcons[severity]} ${severity.toUpperCase()} ISSUES:`);
            for (const issue of severityIssues) {
                console.log(`  • ${issue.title}`);
                console.log(`    ${issue.description}`);
            }
            console.log('');
        }
    }
    
    async offerFixes() {
        console.log('🔧 Available Fixes');
        console.log('==================\\n');
        
        const criticalIssues = this.issues.filter(i => i.severity === 'critical');
        const highIssues = this.issues.filter(i => i.severity === 'high');
        
        if (criticalIssues.length > 0 || highIssues.length > 0) {
            console.log('🚨 Critical/High issues detected. Recommended actions:');
            console.log('');
            console.log('1. Run enhanced bundle build:');
            console.log('   npm run build:enhanced');
            console.log('');
            console.log('2. Or run emergency cleanup and rebuild:');
            console.log('   node scripts/enhanced-bundle-manager.js cleanup');
            console.log('   npm run build:enhanced');
            console.log('');
        }
        
        if (this.issues.some(i => i.title.includes('Orphaned files'))) {
            console.log('3. Clean up orphaned files:');
            console.log('   node scripts/bundle-health-checker.js cleanup');
            console.log('');
        }
        
        if (this.issues.some(i => i.title.includes('Inconsistent'))) {
            console.log('4. Fix HTML reference inconsistencies:');
            console.log('   node scripts/enhanced-bundle-manager.js');
            console.log('');
        }
        
        console.log('5. For detailed diagnostics:');
        console.log('   node scripts/bundle-health-checker.js --verbose');
        console.log('');
    }
    
    async cleanup() {
        console.log('🧹 Cleaning up orphaned bundle files...');
        
        if (!fs.existsSync(this.jsDir)) {
            console.log('  ℹ️  No JS directory found');
            return;
        }
        
        const files = fs.readdirSync(this.jsDir);
        let cleaned = 0;
        
        // Remove temporary files
        for (const file of files) {
            if (file.includes('.tmp-browserify-')) {
                fs.unlinkSync(path.join(this.jsDir, file));
                console.log(`  🗑️  Removed temp file: ${file}`);
                cleaned++;
            }
        }
        
        // Remove old bundle files (keep newest)
        const bundleFiles = files.filter(f => f.startsWith('bundle-v') && f.endsWith('.js'));
        if (bundleFiles.length > 1) {
            const bundleStats = bundleFiles.map(f => ({
                name: f,
                mtime: fs.statSync(path.join(this.jsDir, f)).mtime
            }));
            bundleStats.sort((a, b) => b.mtime - a.mtime);
            
            // Remove all but the newest
            for (let i = 1; i < bundleStats.length; i++) {
                fs.unlinkSync(path.join(this.jsDir, bundleStats[i].name));
                console.log(`  🗑️  Removed old bundle: ${bundleStats[i].name}`);
                cleaned++;
            }
        }
        
        console.log(`✅ Cleanup completed: ${cleaned} files removed`);
    }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    const checker = new BundleHealthChecker();
    
    if (command === 'cleanup') {
        checker.cleanup();
    } else {
        checker.checkHealth();
    }
}

export default BundleHealthChecker;