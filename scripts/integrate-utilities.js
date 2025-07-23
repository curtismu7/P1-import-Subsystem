#!/usr/bin/env node

/**
 * Utility Integration Script for PingOne Import Tool
 * 
 * This script systematically integrates the new refactoring utilities:
 * 1. Replace console.* calls with centralized logger
 * 2. Update DOM access to use safe DOM utility
 * 3. Implement standardized error handling
 * 4. Replace hardcoded values with configuration constants
 * 5. Update event listeners to use event manager
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class UtilityIntegrator {
    constructor() {
        this.integrations = [];
        this.backups = new Map();
        this.logger = console;
    }

    async integrateAllUtilities() {
        console.log('🔧 Starting Utility Integration...\n');

        // Phase 1: Update utility loader to include new utilities
        await this.updateUtilityLoader();

        // Phase 2: Integrate utilities in priority order
        await this.integrateInMainApp();
        await this.integrateInSubsystems();
        await this.integrateInComponents();

        console.log(`\n✅ Completed ${this.integrations.length} utility integrations`);
        return this.integrations;
    }

    /**
     * Update the utility loader to include all new utilities
     */
    async updateUtilityLoader() {
        console.log('📦 Updating Utility Loader...');

        const loaderPath = path.join(projectRoot, 'public/js/bug-fix-loader.js');
        let loaderContent = await fs.readFile(loaderPath, 'utf8');

        // Update the modules list to include new utilities
        const newModules = [
            'security-utils.js',
            'global-error-handler.js', 
            'resource-manager.js',
            'safe-api.js',
            'utils/centralized-logger.js',
            'utils/safe-dom.js',
            'utils/error-handler.js',
            'utils/config-constants.js',
            'utils/event-manager.js'
        ];

        // Replace the modules array in the loader
        const moduleArrayRegex = /const modules = \[([\s\S]*?)\];/;
        const newModuleArray = `const modules = [
        ${newModules.map(m => `'${m}'`).join(',\n        ')}
    ];`;

        loaderContent = loaderContent.replace(moduleArrayRegex, newModuleArray);

        await fs.writeFile(loaderPath, loaderContent);
        console.log('  ✅ Updated utility loader with new modules');

        this.integrations.push({
            type: 'Loader Update',
            file: 'public/js/bug-fix-loader.js',
            description: 'Added new utilities to loader'
        });
    }

    /**
     * Integrate utilities in the main application file
     */
    async integrateInMainApp() {
        console.log('🏗️ Integrating Utilities in Main App...');

        const appPath = path.join(projectRoot, 'src/client/app.js');
        let appContent = await fs.readFile(appPath, 'utf8');

        // Create backup
        await this.createBackup(appPath, appContent);

        // 1. Replace console.* calls with centralized logger
        appContent = this.replaceConsoleLogging(appContent, 'App');

        // 2. Replace DOM selections with safe DOM utility
        appContent = this.replaceDOMSelections(appContent);

        // 3. Wrap error-prone operations with error handler
        appContent = this.addErrorHandling(appContent);

        // 4. Replace hardcoded values with constants
        appContent = this.replaceHardcodedValues(appContent);

        // 5. Add utility imports at the top
        appContent = this.addUtilityImports(appContent);

        await fs.writeFile(appPath, appContent);
        console.log('  ✅ Integrated utilities in main app.js');

        this.integrations.push({
            type: 'Main App Integration',
            file: 'src/client/app.js',
            changes: ['Centralized logging', 'Safe DOM', 'Error handling', 'Config constants']
        });
    }

    /**
     * Replace console.* calls with centralized logger
     */
    replaceConsoleLogging(content, context) {
        // Add logger initialization at the beginning of the class
        const loggerInit = `
        // Initialize centralized logger for this component
        this.logger = window.logger ? window.logger.child('${context}') : console;
        `;

        // Insert logger initialization after constructor
        content = content.replace(
            /(constructor\([^)]*\)\s*{)/,
            `$1${loggerInit}`
        );

        // Replace console.log calls
        content = content.replace(
            /console\.log\s*\(/g,
            'this.logger.info('
        );

        // Replace console.error calls
        content = content.replace(
            /console\.error\s*\(/g,
            'this.logger.error('
        );

        // Replace console.warn calls
        content = content.replace(
            /console\.warn\s*\(/g,
            'this.logger.warn('
        );

        // Replace console.debug calls
        content = content.replace(
            /console\.debug\s*\(/g,
            'this.logger.debug('
        );

        return content;
    }

    /**
     * Replace DOM selections with safe DOM utility
     */
    replaceDOMSelections(content) {
        // Replace document.querySelector with safeDOM.get
        content = content.replace(
            /document\.querySelector\s*\(\s*(['"`][^'"`]*['"`])\s*\)/g,
            'window.safeDOM.get($1)'
        );

        // Replace document.querySelectorAll with safeDOM.getAll
        content = content.replace(
            /document\.querySelectorAll\s*\(\s*(['"`][^'"`]*['"`])\s*\)/g,
            'window.safeDOM.getAll($1)'
        );

        // Replace document.getElementById with safeDOM.get
        content = content.replace(
            /document\.getElementById\s*\(\s*(['"`][^'"`]*['"`])\s*\)/g,
            'window.safeDOM.get("#" + $1.replace(/[\'"`]/g, ""))'
        );

        // Replace element.textContent assignments with safeDOM.setText
        content = content.replace(
            /(\w+)\.textContent\s*=\s*([^;]+);/g,
            'window.safeDOM.setText($1, $2);'
        );

        return content;
    }

    /**
     * Add error handling to critical operations
     */
    addErrorHandling(content) {
        // Wrap fetch calls with error handler
        content = content.replace(
            /(await\s+)?fetch\s*\(/g,
            'await window.errorHandler.withErrorHandling(async () => fetch('
        );

        // Add closing parenthesis and context for fetch calls
        content = content.replace(
            /(await window\.errorHandler\.withErrorHandling\(async \(\) => fetch\([^)]+\))/g,
            '$1), { context: "API Request" })'
        );

        // Wrap JSON.parse calls with safe parsing
        content = content.replace(
            /JSON\.parse\s*\(\s*([^)]+)\s*\)/g,
            'window.SafeAPI.parseJSON($1)'
        );

        return content;
    }

    /**
     * Replace hardcoded values with configuration constants
     */
    replaceHardcodedValues(content) {
        // Replace common timeout values
        content = content.replace(/\b5000\b/g, 'window.API_CONFIG.TIMEOUTS.CONNECTION_TEST');
        content = content.replace(/\b10000\b/g, 'window.API_CONFIG.TIMEOUTS.DEFAULT');
        content = content.replace(/\b30000\b/g, 'window.API_CONFIG.TIMEOUTS.LONG_OPERATION');

        // Replace API endpoints
        content = content.replace(/['"`]\/api\/settings['"`]/g, 'window.API_CONFIG.ENDPOINTS.SETTINGS');
        content = content.replace(/['"`]\/api\/import['"`]/g, 'window.API_CONFIG.ENDPOINTS.IMPORT');
        content = content.replace(/['"`]\/api\/export['"`]/g, 'window.API_CONFIG.ENDPOINTS.EXPORT');
        content = content.replace(/['"`]\/api\/populations['"`]/g, 'window.API_CONFIG.ENDPOINTS.POPULATIONS');

        // Replace common CSS classes
        content = content.replace(/['"`]hidden['"`]/g, 'window.UI_CONFIG.CLASSES.HIDDEN');
        content = content.replace(/['"`]active['"`]/g, 'window.UI_CONFIG.CLASSES.ACTIVE');
        content = content.replace(/['"`]loading['"`]/g, 'window.UI_CONFIG.CLASSES.LOADING');

        return content;
    }

    /**
     * Add utility imports at the top of the file
     */
    addUtilityImports(content) {
        const imports = `
// Utility imports for refactored code
// Note: These utilities are loaded globally via bug-fix-loader.js
// Available as: window.logger, window.safeDOM, window.errorHandler, etc.

`;

        // Add imports after existing imports or at the beginning
        if (content.includes('import ') || content.includes('require(')) {
            // Find the last import/require statement
            const lastImportMatch = content.match(/(import[^;]+;|require\([^)]+\);)\s*\n/g);
            if (lastImportMatch) {
                const lastImport = lastImportMatch[lastImportMatch.length - 1];
                content = content.replace(lastImport, lastImport + imports);
            }
        } else {
            // Add at the beginning
            content = imports + content;
        }

        return content;
    }

    /**
     * Integrate utilities in subsystem files
     */
    async integrateInSubsystems() {
        console.log('🔧 Integrating Utilities in Subsystems...');

        const subsystemDir = path.join(projectRoot, 'src/client/subsystems');
        const files = await fs.readdir(subsystemDir);

        let integratedCount = 0;
        for (const file of files) {
            if (file.endsWith('.js')) {
                const filePath = path.join(subsystemDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                
                // Skip very small files
                if (content.split('\n').length < 50) continue;

                await this.createBackup(filePath, content);
                
                const componentName = file.replace('.js', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                let updatedContent = this.replaceConsoleLogging(content, componentName);
                updatedContent = this.replaceDOMSelections(updatedContent);
                updatedContent = this.addErrorHandling(updatedContent);
                updatedContent = this.replaceHardcodedValues(updatedContent);

                await fs.writeFile(filePath, updatedContent);
                integratedCount++;
            }
        }

        console.log(`  ✅ Integrated utilities in ${integratedCount} subsystem files`);

        this.integrations.push({
            type: 'Subsystem Integration',
            count: integratedCount,
            description: 'Updated subsystem files with new utilities'
        });
    }

    /**
     * Integrate utilities in component files
     */
    async integrateInComponents() {
        console.log('🎨 Integrating Utilities in Components...');

        const componentDir = path.join(projectRoot, 'src/client/components');
        const files = await fs.readdir(componentDir);

        let integratedCount = 0;
        for (const file of files) {
            if (file.endsWith('.js')) {
                const filePath = path.join(componentDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                
                // Skip very small files
                if (content.split('\n').length < 50) continue;

                await this.createBackup(filePath, content);
                
                const componentName = file.replace('.js', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                let updatedContent = this.replaceConsoleLogging(content, componentName);
                updatedContent = this.replaceDOMSelections(updatedContent);
                updatedContent = this.addErrorHandling(updatedContent);
                updatedContent = this.replaceHardcodedValues(updatedContent);

                await fs.writeFile(filePath, updatedContent);
                integratedCount++;
            }
        }

        console.log(`  ✅ Integrated utilities in ${integratedCount} component files`);

        this.integrations.push({
            type: 'Component Integration',
            count: integratedCount,
            description: 'Updated component files with new utilities'
        });
    }

    /**
     * Create backup of original file
     */
    async createBackup(filePath, content) {
        const backupPath = filePath + '.backup-' + Date.now();
        await fs.writeFile(backupPath, content);
        this.backups.set(filePath, backupPath);
        console.log(`  📋 Created backup: ${path.basename(backupPath)}`);
    }

    /**
     * Generate integration report
     */
    async generateIntegrationReport() {
        const report = {
            summary: {
                totalIntegrations: this.integrations.length,
                timestamp: new Date().toISOString(),
                backupsCreated: this.backups.size
            },
            integrations: this.integrations,
            backups: Array.from(this.backups.entries()).map(([original, backup]) => ({
                original: path.relative(projectRoot, original),
                backup: path.relative(projectRoot, backup)
            })),
            nextSteps: [
                'Test application functionality after integration',
                'Run ESLint to check for any syntax issues',
                'Verify console output uses new logging format',
                'Check that DOM operations use safe utilities',
                'Test error handling improvements'
            ]
        };

        const reportPath = path.join(projectRoot, 'logs/utility-integration-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        console.log('\n📊 Integration Report:');
        console.log(`📄 Report saved: ${reportPath}`);
        console.log(`🔄 Integrations: ${report.summary.totalIntegrations}`);
        console.log(`📋 Backups created: ${report.summary.backupsCreated}`);

        return report;
    }
}

// Execute integration
async function main() {
    console.log('🔧 PingOne Import Tool - Utility Integration');
    console.log('==========================================\n');
    
    const integrator = new UtilityIntegrator();
    
    try {
        await integrator.integrateAllUtilities();
        const report = await integrator.generateIntegrationReport();
        
        console.log('\n🎉 Utility integration completed successfully!');
        console.log('\n🔍 Next Steps:');
        console.log('1. Test the application to ensure functionality');
        console.log('2. Check browser console for new logging format');
        console.log('3. Verify error handling improvements');
        console.log('4. Run npm run build:bundle to rebuild with changes');
        
    } catch (error) {
        console.error('❌ Utility integration failed:', error.message);
        console.log('\n🔄 Backups available for rollback if needed');
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { UtilityIntegrator };
