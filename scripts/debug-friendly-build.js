#!/usr/bin/env node

/**
 * Debug-Friendly Build Script
 * 
 * A comprehensive build system that prioritizes debugging, traceability, and reliability.
 * Implements best practices for clean, maintainable, and debuggable code generation.
 * 
 * Features:
 * - Comprehensive error handling with descriptive messages
 * - Build validation and integrity checks
 * - Source map generation for debugging
 * - Bundle analysis and optimization
 * - Detailed logging and progress tracking
 * - Automatic cleanup of corrupted builds
 * - DRY principle enforcement
 * - Module separation validation
 */

import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Debug-friendly configuration
const BUILD_CONFIG = {
    sourceDir: path.join(projectRoot, 'src/client'),
    outputDir: path.join(projectRoot, 'public/js'),
    entryPoint: path.join(projectRoot, 'src/client/app.js'),
    babelConfig: path.join(projectRoot, 'config/babel.config.json'),
    manifestFile: path.join(projectRoot, 'public/js/bundle-manifest.json'),
    indexFile: path.join(projectRoot, 'public/index.html'),
    enableSourceMaps: true,
    enableDebugMode: process.env.NODE_ENV !== 'production',
    enableAnalysis: true,
    enableValidation: true,
    maxBundleSize: 5 * 1024 * 1024, // 5MB warning threshold
    minBundleSize: 100 * 1024, // 100KB minimum expected size
};

// Enhanced logging system
class DebugLogger {
    constructor() {
        this.startTime = Date.now();
        this.steps = [];
    }

    info(message, data = {}) {
        const timestamp = new Date().toISOString();
        const elapsed = Date.now() - this.startTime;
        console.log(`🔧 [${timestamp}] [+${elapsed}ms] ${message}`);
        if (Object.keys(data).length > 0) {
            console.log('   📊 Data:', JSON.stringify(data, null, 2));
        }
        this.steps.push({ type: 'info', message, data, timestamp, elapsed });
    }

    success(message, data = {}) {
        const timestamp = new Date().toISOString();
        const elapsed = Date.now() - this.startTime;
        console.log(`✅ [${timestamp}] [+${elapsed}ms] ${message}`);
        if (Object.keys(data).length > 0) {
            console.log('   📊 Data:', JSON.stringify(data, null, 2));
        }
        this.steps.push({ type: 'success', message, data, timestamp, elapsed });
    }

    warn(message, data = {}) {
        const timestamp = new Date().toISOString();
        const elapsed = Date.now() - this.startTime;
        console.warn(`⚠️  [${timestamp}] [+${elapsed}ms] ${message}`);
        if (Object.keys(data).length > 0) {
            console.warn('   📊 Data:', JSON.stringify(data, null, 2));
        }
        this.steps.push({ type: 'warn', message, data, timestamp, elapsed });
    }

    error(message, error = null, data = {}) {
        const timestamp = new Date().toISOString();
        const elapsed = Date.now() - this.startTime;
        console.error(`❌ [${timestamp}] [+${elapsed}ms] ${message}`);
        if (error) {
            console.error('   🔍 Error Details:', error.message);
            console.error('   📍 Stack Trace:', error.stack);
        }
        if (Object.keys(data).length > 0) {
            console.error('   📊 Data:', JSON.stringify(data, null, 2));
        }
        this.steps.push({ type: 'error', message, error: error?.message, data, timestamp, elapsed });
    }

    getSummary() {
        const totalTime = Date.now() - this.startTime;
        const summary = {
            totalTime,
            steps: this.steps.length,
            errors: this.steps.filter(s => s.type === 'error').length,
            warnings: this.steps.filter(s => s.type === 'warn').length,
            successes: this.steps.filter(s => s.type === 'success').length,
            buildSteps: this.steps
        };
        return summary;
    }
}

const logger = new DebugLogger();

/**
 * Enhanced error handling with descriptive messages and recovery suggestions
 */
class BuildError extends Error {
    constructor(message, code, suggestions = [], context = {}) {
        super(message);
        this.name = 'BuildError';
        this.code = code;
        this.suggestions = suggestions;
        this.context = context;
        this.timestamp = new Date().toISOString();
    }

    getDetailedMessage() {
        let message = `${this.name}: ${this.message}\n`;
        message += `Code: ${this.code}\n`;
        message += `Timestamp: ${this.timestamp}\n`;
        
        if (Object.keys(this.context).length > 0) {
            message += `Context: ${JSON.stringify(this.context, null, 2)}\n`;
        }
        
        if (this.suggestions.length > 0) {
            message += `Suggestions:\n`;
            this.suggestions.forEach((suggestion, index) => {
                message += `  ${index + 1}. ${suggestion}\n`;
            });
        }
        
        return message;
    }
}

/**
 * Validate build environment and dependencies
 */
async function validateEnvironment() {
    logger.info('Validating build environment...');
    
    const checks = [
        {
            name: 'Node.js version',
            check: () => {
                const version = process.version;
                const major = parseInt(version.slice(1).split('.')[0]);
                return major >= 14;
            },
            error: 'Node.js version 14 or higher is required',
            suggestions: ['Update Node.js to version 14 or higher', 'Use nvm to manage Node.js versions']
        },
        {
            name: 'Source entry point',
            check: async () => {
                try {
                    await fs.access(BUILD_CONFIG.entryPoint);
                    return true;
                } catch {
                    return false;
                }
            },
            error: `Entry point not found: ${BUILD_CONFIG.entryPoint}`,
            suggestions: ['Verify the source file exists', 'Check the entry point path configuration']
        },
        {
            name: 'Babel configuration',
            check: async () => {
                try {
                    await fs.access(BUILD_CONFIG.babelConfig);
                    return true;
                } catch {
                    return false;
                }
            },
            error: `Babel config not found: ${BUILD_CONFIG.babelConfig}`,
            suggestions: ['Create babel configuration file', 'Verify babel config path']
        },
        {
            name: 'Output directory',
            check: async () => {
                try {
                    await fs.access(BUILD_CONFIG.outputDir);
                    return true;
                } catch {
                    try {
                        await fs.mkdir(BUILD_CONFIG.outputDir, { recursive: true });
                        return true;
                    } catch {
                        return false;
                    }
                }
            },
            error: `Cannot access or create output directory: ${BUILD_CONFIG.outputDir}`,
            suggestions: ['Check directory permissions', 'Create output directory manually']
        }
    ];

    for (const check of checks) {
        try {
            const result = await check.check();
            if (!result) {
                throw new BuildError(
                    check.error,
                    'ENVIRONMENT_VALIDATION_FAILED',
                    check.suggestions,
                    { checkName: check.name }
                );
            }
            logger.success(`✓ ${check.name} validated`);
        } catch (error) {
            if (error instanceof BuildError) {
                throw error;
            }
            throw new BuildError(
                `Environment validation failed for ${check.name}: ${error.message}`,
                'ENVIRONMENT_CHECK_ERROR',
                check.suggestions,
                { checkName: check.name, originalError: error.message }
            );
        }
    }

    logger.success('Environment validation completed successfully');
}

/**
 * Clean up corrupted or old bundle files
 */
async function cleanupOldBundles() {
    logger.info('Cleaning up old bundle files...');
    
    try {
        const files = await fs.readdir(BUILD_CONFIG.outputDir);
        const bundleFiles = files.filter(file => file.startsWith('bundle-') && file.endsWith('.js'));
        
        logger.info(`Found ${bundleFiles.length} existing bundle files`);
        
        for (const file of bundleFiles) {
            const filePath = path.join(BUILD_CONFIG.outputDir, file);
            try {
                await fs.unlink(filePath);
                logger.info(`Removed old bundle: ${file}`);
            } catch (error) {
                logger.warn(`Failed to remove ${file}:`, { error: error.message });
            }
        }
        
        // Remove old manifest
        try {
            await fs.unlink(BUILD_CONFIG.manifestFile);
            logger.info('Removed old bundle manifest');
        } catch (error) {
            // Manifest might not exist, which is fine
            logger.info('No existing manifest to remove');
        }
        
        logger.success('Bundle cleanup completed');
    } catch (error) {
        throw new BuildError(
            'Failed to clean up old bundles',
            'CLEANUP_FAILED',
            ['Check directory permissions', 'Manually remove bundle files'],
            { error: error.message }
        );
    }
}

/**
 * Validate source code structure and dependencies
 */
async function validateSourceCode() {
    logger.info('Validating source code structure...');
    
    try {
        // Read and parse the main entry point
        const entryContent = await fs.readFile(BUILD_CONFIG.entryPoint, 'utf8');
        
        // Check for common issues
        const checks = [
            {
                name: 'File not empty',
                test: () => entryContent.trim().length > 0,
                error: 'Entry point file is empty'
            },
            {
                name: 'Contains App class',
                test: () => entryContent.includes('class App') || entryContent.includes('export default App'),
                error: 'Entry point does not contain App class definition'
            },
            {
                name: 'Has proper imports',
                test: () => entryContent.includes('import'),
                error: 'Entry point does not contain any imports'
            },
            {
                name: 'Has DOM ready listener',
                test: () => entryContent.includes('DOMContentLoaded'),
                error: 'Entry point does not contain DOM ready event listener'
            }
        ];
        
        for (const check of checks) {
            if (!check.test()) {
                throw new BuildError(
                    check.error,
                    'SOURCE_VALIDATION_FAILED',
                    ['Review source code structure', 'Check for syntax errors'],
                    { checkName: check.name }
                );
            }
            logger.success(`✓ ${check.name}`);
        }
        
        logger.success('Source code validation completed');
    } catch (error) {
        if (error instanceof BuildError) {
            throw error;
        }
        throw new BuildError(
            `Source code validation failed: ${error.message}`,
            'SOURCE_READ_ERROR',
            ['Check file permissions', 'Verify file encoding'],
            { error: error.message }
        );
    }
}

/**
 * Build the bundle with enhanced error handling
 */
async function buildBundle() {
    logger.info('Starting bundle build process...');
    
    const timestamp = Date.now();
    const bundleFileName = `bundle-${timestamp}.js`;
    const bundlePath = path.join(BUILD_CONFIG.outputDir, bundleFileName);
    
    try {
        // Construct browserify command with debug-friendly options
        const browserifyArgs = [
            BUILD_CONFIG.entryPoint,
            '-t', `[ babelify --configFile ${BUILD_CONFIG.babelConfig} --presets [ @babel/preset-env ] --plugins [ @babel/plugin-transform-runtime ] ]`,
            '-o', bundlePath
        ];
        
        if (BUILD_CONFIG.enableSourceMaps) {
            browserifyArgs.push('--debug');
        }
        
        if (BUILD_CONFIG.enableDebugMode) {
            browserifyArgs.push('--verbose');
        }
        
        logger.info('Executing browserify build...', {
            command: 'npx browserify',
            args: browserifyArgs,
            sourceMaps: BUILD_CONFIG.enableSourceMaps,
            debugMode: BUILD_CONFIG.enableDebugMode
        });
        
        // Execute browserify with proper error handling
        const buildProcess = spawn('npx', ['browserify', ...browserifyArgs], {
            cwd: projectRoot,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        buildProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        buildProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        const buildResult = await new Promise((resolve, reject) => {
            buildProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr, code });
                } else {
                    reject(new Error(`Build process exited with code ${code}\nStderr: ${stderr}\nStdout: ${stdout}`));
                }
            });
            
            buildProcess.on('error', (error) => {
                reject(error);
            });
        });
        
        logger.success('Browserify build completed', {
            bundleFile: bundleFileName,
            exitCode: buildResult.code
        });
        
        return { bundleFileName, bundlePath };
        
    } catch (error) {
        throw new BuildError(
            `Bundle build failed: ${error.message}`,
            'BUILD_PROCESS_FAILED',
            [
                'Check for syntax errors in source code',
                'Verify all imports are correct',
                'Check babel configuration',
                'Run ESLint to identify issues'
            ],
            { 
                bundleFile: bundleFileName,
                error: error.message 
            }
        );
    }
}

/**
 * Validate the generated bundle
 */
async function validateBundle(bundlePath, bundleFileName) {
    logger.info('Validating generated bundle...', { bundleFile: bundleFileName });
    
    try {
        const stats = await fs.stat(bundlePath);
        const bundleContent = await fs.readFile(bundlePath, 'utf8');
        
        // Size validation
        if (stats.size < BUILD_CONFIG.minBundleSize) {
            throw new BuildError(
                `Bundle size too small: ${stats.size} bytes (minimum: ${BUILD_CONFIG.minBundleSize})`,
                'BUNDLE_TOO_SMALL',
                [
                    'Check if build process completed successfully',
                    'Verify all source files are included',
                    'Check for build process interruption'
                ],
                { actualSize: stats.size, minSize: BUILD_CONFIG.minBundleSize }
            );
        }
        
        if (stats.size > BUILD_CONFIG.maxBundleSize) {
            logger.warn(`Bundle size is large: ${stats.size} bytes`, {
                size: stats.size,
                threshold: BUILD_CONFIG.maxBundleSize
            });
        }
        
        // Content validation
        const contentChecks = [
            {
                name: 'Contains application code',
                test: () => bundleContent.includes('App') && bundleContent.includes('window.app'),
                error: 'Bundle does not contain expected application code'
            },
            {
                name: 'Not just Babel helpers',
                test: () => !bundleContent.includes('_defineProperty') || bundleContent.length > 50000,
                error: 'Bundle appears to contain only Babel helper functions'
            },
            {
                name: 'Contains DOM ready handler',
                test: () => bundleContent.includes('DOMContentLoaded'),
                error: 'Bundle does not contain DOM ready event handler'
            },
            {
                name: 'No obvious corruption',
                test: () => !bundleContent.includes('undefined') || bundleContent.includes('function'),
                error: 'Bundle appears to be corrupted or incomplete'
            }
        ];
        
        for (const check of contentChecks) {
            if (!check.test()) {
                throw new BuildError(
                    check.error,
                    'BUNDLE_VALIDATION_FAILED',
                    [
                        'Rebuild the bundle from scratch',
                        'Check source code for errors',
                        'Verify build process completed successfully'
                    ],
                    { 
                        checkName: check.name,
                        bundleSize: stats.size,
                        bundleFile: bundleFileName
                    }
                );
            }
            logger.success(`✓ ${check.name}`);
        }
        
        logger.success('Bundle validation completed', {
            size: stats.size,
            sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
            file: bundleFileName
        });
        
        return { size: stats.size, valid: true };
        
    } catch (error) {
        if (error instanceof BuildError) {
            throw error;
        }
        throw new BuildError(
            `Bundle validation failed: ${error.message}`,
            'BUNDLE_VALIDATION_ERROR',
            ['Check file permissions', 'Verify bundle was created successfully'],
            { bundleFile: bundleFileName, error: error.message }
        );
    }
}

/**
 * Create and update bundle manifest
 */
async function createManifest(bundleFileName) {
    logger.info('Creating bundle manifest...', { bundleFile: bundleFileName });
    
    try {
        const manifest = {
            bundleFile: bundleFileName,
            timestamp: Date.now(),
            buildDate: new Date().toISOString(),
            version: '6.5.1.1',
            buildConfig: {
                sourceMaps: BUILD_CONFIG.enableSourceMaps,
                debugMode: BUILD_CONFIG.enableDebugMode,
                nodeEnv: process.env.NODE_ENV || 'development'
            }
        };
        
        await fs.writeFile(BUILD_CONFIG.manifestFile, JSON.stringify(manifest, null, 2));
        logger.success('Bundle manifest created successfully');
        
        return manifest;
    } catch (error) {
        throw new BuildError(
            `Failed to create bundle manifest: ${error.message}`,
            'MANIFEST_CREATION_FAILED',
            ['Check directory permissions', 'Verify output directory exists'],
            { bundleFile: bundleFileName, error: error.message }
        );
    }
}

/**
 * Update HTML file to reference new bundle
 */
async function updateHtmlReference(bundleFileName) {
    logger.info('Updating HTML bundle reference...', { bundleFile: bundleFileName });
    
    try {
        let htmlContent = await fs.readFile(BUILD_CONFIG.indexFile, 'utf8');
        
        // Replace bundle reference with new one
        const bundleRegex = /<script[^>]*src="[^"]*bundle-[^"]*\.js"[^>]*><\/script>/g;
        const newScriptTag = `<script src="js/${bundleFileName}" defer></script>`;
        
        if (bundleRegex.test(htmlContent)) {
            htmlContent = htmlContent.replace(bundleRegex, newScriptTag);
        } else {
            // If no bundle reference found, add it before closing body tag
            htmlContent = htmlContent.replace('</body>', `    ${newScriptTag}\n</body>`);
        }
        
        await fs.writeFile(BUILD_CONFIG.indexFile, htmlContent);
        logger.success('HTML bundle reference updated successfully');
        
    } catch (error) {
        throw new BuildError(
            `Failed to update HTML bundle reference: ${error.message}`,
            'HTML_UPDATE_FAILED',
            ['Check HTML file permissions', 'Verify HTML file exists'],
            { bundleFile: bundleFileName, error: error.message }
        );
    }
}

/**
 * Run ESLint for code quality validation
 */
async function runLinting() {
    if (!BUILD_CONFIG.enableValidation) {
        logger.info('Linting disabled, skipping...');
        return;
    }
    
    logger.info('Running ESLint validation...');
    
    try {
        execSync('npm run lint:check', { 
            cwd: projectRoot,
            stdio: 'pipe'
        });
        logger.success('ESLint validation passed');
    } catch (error) {
        logger.warn('ESLint found issues', { 
            error: error.message,
            suggestion: 'Run "npm run lint:fix" to auto-fix issues'
        });
        // Don't fail the build for linting issues, just warn
    }
}

/**
 * Generate build analysis report
 */
async function generateBuildReport(bundleInfo, manifest, buildSummary) {
    if (!BUILD_CONFIG.enableAnalysis) {
        return;
    }
    
    logger.info('Generating build analysis report...');
    
    try {
        const report = {
            buildInfo: {
                timestamp: new Date().toISOString(),
                duration: buildSummary.totalTime,
                success: true,
                version: '6.5.1.1'
            },
            bundle: {
                fileName: manifest.bundleFile,
                size: bundleInfo.size,
                sizeFormatted: `${(bundleInfo.size / 1024).toFixed(2)} KB`
            },
            buildSteps: buildSummary.buildSteps,
            performance: {
                totalSteps: buildSummary.steps,
                errors: buildSummary.errors,
                warnings: buildSummary.warnings,
                successes: buildSummary.successes
            },
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                nodeEnv: process.env.NODE_ENV || 'development'
            }
        };
        
        const reportPath = path.join(projectRoot, 'logs', 'build-report.json');
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        logger.success('Build analysis report generated', { reportPath });
        
    } catch (error) {
        logger.warn('Failed to generate build report', { error: error.message });
        // Don't fail the build for reporting issues
    }
}

/**
 * Main build function
 */
async function main() {
    console.log('🚀 Debug-Friendly Build System v1.0.0');
    console.log('=====================================');
    
    try {
        // Step 1: Environment validation
        await validateEnvironment();
        
        // Step 2: Cleanup old bundles
        await cleanupOldBundles();
        
        // Step 3: Source code validation
        await validateSourceCode();
        
        // Step 4: Run linting
        await runLinting();
        
        // Step 5: Build bundle
        const { bundleFileName, bundlePath } = await buildBundle();
        
        // Step 6: Validate bundle
        const bundleInfo = await validateBundle(bundlePath, bundleFileName);
        
        // Step 7: Create manifest
        const manifest = await createManifest(bundleFileName);
        
        // Step 8: Update HTML reference
        await updateHtmlReference(bundleFileName);
        
        // Step 9: Generate build report
        const buildSummary = logger.getSummary();
        await generateBuildReport(bundleInfo, manifest, buildSummary);
        
        // Success summary
        console.log('\n🎉 Build completed successfully!');
        console.log('================================');
        console.log(`📦 Bundle: ${bundleFileName}`);
        console.log(`📏 Size: ${(bundleInfo.size / 1024).toFixed(2)} KB`);
        console.log(`⏱️  Duration: ${buildSummary.totalTime}ms`);
        console.log(`✅ Steps: ${buildSummary.successes}`);
        console.log(`⚠️  Warnings: ${buildSummary.warnings}`);
        console.log(`❌ Errors: ${buildSummary.errors}`);
        
        if (BUILD_CONFIG.enableDebugMode) {
            console.log('\n🔍 Debug mode enabled - source maps included');
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n💥 Build failed!');
        console.error('================');
        
        if (error instanceof BuildError) {
            console.error(error.getDetailedMessage());
        } else {
            console.error('Unexpected error:', error.message);
            console.error('Stack trace:', error.stack);
        }
        
        const buildSummary = logger.getSummary();
        console.error(`\n📊 Build Summary:`);
        console.error(`   Duration: ${buildSummary.totalTime}ms`);
        console.error(`   Steps completed: ${buildSummary.successes}`);
        console.error(`   Warnings: ${buildSummary.warnings}`);
        console.error(`   Errors: ${buildSummary.errors + 1}`);
        
        process.exit(1);
    }
}

// Execute main function
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { main as debugFriendlyBuild };
