#!/usr/bin/env node

/**
 * PingOne Import Tool - Module Converter
 * Version: 7.0.0.10
 * 
 * Utility to convert CommonJS modules to ES modules for the Import Maps migration.
 * This script analyzes CommonJS modules and converts them to ES modules with
 * proper import/export syntax.
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module equivalents for __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configuration
const config = {
    // Source directories to scan for CommonJS modules
    sourceDirs: [
        './public/js/modules',
        './src/client/components',
        './src/client/subsystems',
        './src/client/utils'
    ],
    
    // Output directory for ES modules (if null, will overwrite original files)
    outputDir: null,
    
    // File extensions to process
    extensions: ['.js'],
    
    // Whether to create backup files
    createBackups: true,
    
    // Whether to recursively process directories
    recursive: true,
    
    // Whether to overwrite existing ES modules
    overwrite: false,
    
    // Verbose logging
    verbose: true,
    
    // Dry run (don't actually write files)
    dryRun: false
};

// Regular expressions for detecting CommonJS patterns
const patterns = {
    // require statements
    require: /(?:const|let|var)\s+(\w+|\{\s*[^}]+\s*\})\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    
    // module.exports assignments
    moduleExports: /module\.exports\s*=\s*([^;]+)/g,
    
    // exports.something assignments
    namedExports: /exports\.(\w+)\s*=\s*([^;]+)/g,
    
    // Object.assign(exports, {...})
    objectAssignExports: /Object\.assign\s*\(\s*exports\s*,\s*(\{[^}]+\})\s*\)/g,
    
    // module.exports = { ... }
    moduleExportsObject: /module\.exports\s*=\s*\{([^}]+)\}/g
};

/**
 * Logs a message to the console
 * @param {string} message - Message to log
 * @param {string} type - Log type (log, warn, error, info)
 */
function log(message, type = 'log') {
    if (!config.verbose && type === 'log') return;
    
    const timestamp = new Date().toISOString();
    const emoji = type === 'log' ? '📝' : 
                 type === 'warn' ? '⚠️' : 
                 type === 'error' ? '❌' : '🔍';
                 
    console[type](`${emoji} [${timestamp}] ${message}`);
}

/**
 * Converts a CommonJS require statement to an ES import statement
 * @param {string} match - The matched require statement
 * @param {string} importName - The variable name or destructured object
 * @param {string} modulePath - The module path
 * @returns {string} The ES import statement
 */
function convertRequireToImport(match, importName, modulePath) {
    // Check if it's a destructured import
    if (importName.startsWith('{')) {
        return `import ${importName} from '${modulePath}';`;
    }
    
    return `import ${importName} from '${modulePath}';`;
}

/**
 * Converts a CommonJS module.exports to an ES export
 * @param {string} match - The matched module.exports statement
 * @param {string} exportValue - The value being exported
 * @returns {string} The ES export statement
 */
function convertModuleExportsToExport(match, exportValue) {
    // If exporting a class or function declaration, use export default
    if (exportValue.trim().startsWith('class') || exportValue.trim().startsWith('function')) {
        return `export default ${exportValue}`;
    }
    
    // If exporting a variable, use export default
    return `export default ${exportValue};`;
}

/**
 * Converts a CommonJS named export to an ES export
 * @param {string} match - The matched exports.something statement
 * @param {string} exportName - The name of the export
 * @param {string} exportValue - The value being exported
 * @returns {string} The ES export statement
 */
function convertNamedExportToExport(match, exportName, exportValue) {
    return `export const ${exportName} = ${exportValue};`;
}

/**
 * Converts a CommonJS module.exports object to ES named exports
 * @param {string} match - The matched module.exports object statement
 * @param {string} objectContent - The content of the exports object
 * @returns {string} The ES export statements
 */
function convertModuleExportsObjectToNamedExports(match, objectContent) {
    // Split the object content by commas and convert each property
    const properties = objectContent.split(',');
    const exportStatements = [];
    
    for (const prop of properties) {
        const trimmedProp = prop.trim();
        if (!trimmedProp) continue;
        
        // Handle shorthand properties (e.g., { foo })
        if (!trimmedProp.includes(':')) {
            exportStatements.push(`export { ${trimmedProp} };`);
            continue;
        }
        
        // Handle regular properties (e.g., { foo: bar })
        const [name, value] = trimmedProp.split(':').map(p => p.trim());
        exportStatements.push(`export const ${name} = ${value};`);
    }
    
    return exportStatements.join('\n');
}

/**
 * Converts a CommonJS module to an ES module
 * @param {string} content - The content of the CommonJS module
 * @returns {string} The content of the ES module
 */
function convertToESModule(content) {
    let esModule = content;
    
    // Add ES Module marker comment at the top
    esModule = `/**\n * @module\n * @description ES Module (converted from CommonJS)\n */\n\n${esModule}`;
    
    // Convert require statements to import statements
    esModule = esModule.replace(patterns.require, convertRequireToImport);
    
    // Convert module.exports object to named exports
    esModule = esModule.replace(patterns.moduleExportsObject, convertModuleExportsObjectToNamedExports);
    
    // Convert named exports
    esModule = esModule.replace(patterns.namedExports, convertNamedExportToExport);
    
    // Convert module.exports to export default
    esModule = esModule.replace(patterns.moduleExports, convertModuleExportsToExport);
    
    // Convert Object.assign(exports, {...}) to named exports
    esModule = esModule.replace(patterns.objectAssignExports, (match, objectContent) => {
        return convertModuleExportsObjectToNamedExports(match, objectContent);
    });
    
    return esModule;
}

/**
 * Checks if a file is already an ES module
 * @param {string} content - The content of the file
 * @returns {boolean} True if the file is already an ES module
 */
function isESModule(content) {
    // Check for import or export statements
    return /\bimport\b.*\bfrom\b/.test(content) || /\bexport\b/.test(content);
}

/**
 * Processes a single file
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} True if the file was processed successfully
 */
async function processFile(filePath) {
    try {
        // Read the file
        const content = await readFile(filePath, 'utf8');
        
        // Skip if already an ES module
        if (isESModule(content)) {
            log(`Skipping ${filePath} (already an ES module)`, 'info');
            return false;
        }
        
        // Convert to ES module
        const esModule = convertToESModule(content);
        
        // Determine output path
        const outputPath = config.outputDir 
            ? path.join(config.outputDir, path.basename(filePath))
            : filePath;
        
        // Create backup if needed
        if (config.createBackups && !config.dryRun) {
            const backupPath = `${filePath}.bak`;
            await writeFile(backupPath, content);
            log(`Created backup at ${backupPath}`);
        }
        
        // Write the ES module
        if (!config.dryRun) {
            await writeFile(outputPath, esModule);
            log(`Converted ${filePath} to ES module`);
        } else {
            log(`Would convert ${filePath} to ES module (dry run)`);
        }
        
        return true;
    } catch (error) {
        log(`Error processing ${filePath}: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Recursively processes files in a directory
 * @param {string} dirPath - Path to the directory
 * @returns {Promise<number>} Number of files processed
 */
async function processDirectory(dirPath) {
    try {
        const entries = await readdir(dirPath);
        let processedCount = 0;
        
        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry);
            const entryStat = await stat(entryPath);
            
            if (entryStat.isDirectory() && config.recursive) {
                processedCount += await processDirectory(entryPath);
            } else if (entryStat.isFile() && config.extensions.includes(path.extname(entryPath))) {
                const processed = await processFile(entryPath);
                if (processed) processedCount++;
            }
        }
        
        return processedCount;
    } catch (error) {
        log(`Error processing directory ${dirPath}: ${error.message}`, 'error');
        return 0;
    }
}

/**
 * Main function
 */
async function main() {
    log('Starting module conversion', 'info');
    
    let totalProcessed = 0;
    
    // Process each source directory
    for (const sourceDir of config.sourceDirs) {
        log(`Processing directory: ${sourceDir}`, 'info');
        const processed = await processDirectory(sourceDir);
        totalProcessed += processed;
        log(`Processed ${processed} files in ${sourceDir}`);
    }
    
    log(`Conversion complete. Processed ${totalProcessed} files.`, 'info');
}

// Parse command line arguments
function parseCommandLineArgs() {
    const args = process.argv.slice(2);
    const parsedArgs = {};
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg.startsWith('--')) {
            const argName = arg.slice(2);
            
            if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
                parsedArgs[argName] = args[i + 1];
                i++;
            } else {
                parsedArgs[argName] = true;
            }
        }
    }
    
    return parsedArgs;
}

// Apply command line arguments to config
function applyCommandLineArgs() {
    const args = parseCommandLineArgs();
    
    if (args.source) {
        config.sourceDirs = [args.source];
    }
    
    if (args.dir) {
        config.sourceDirs = [args.dir];
    }
    
    if (args.output) {
        config.outputDir = args.output;
    }
    
    if (args.file) {
        config.sourceDirs = [];
        processFile(args.file).then(() => {
            log(`Processed file: ${args.file}`, 'info');
        }).catch(error => {
            log(`Error processing file ${args.file}: ${error.message}`, 'error');
        });
        return false;
    }
    
    if (args.backup !== undefined) {
        config.createBackups = args.backup === 'true' || args.backup === true;
    }
    
    if (args.recursive !== undefined) {
        config.recursive = args.recursive === 'true' || args.recursive === true;
    }
    
    if (args.overwrite !== undefined) {
        config.overwrite = args.overwrite === 'true' || args.overwrite === true;
    }
    
    if (args.verbose !== undefined) {
        config.verbose = args.verbose === 'true' || args.verbose === true;
    }
    
    if (args.dryRun !== undefined) {
        config.dryRun = args.dryRun === 'true' || args.dryRun === true;
    }
    
    return true;
}

// Run the main function if not processing a single file
if (applyCommandLineArgs()) {
    main().catch(error => {
        log(`Fatal error: ${error.message}`, 'error');
        process.exit(1);
    });
}

// Export functions for use in other modules
export {
    processFile,
    processDirectory,
    convertRequireToImport,
    convertModuleExportsToExport,
    convertNamedExportToExport,
    convertModuleExportsObjectToNamedExports
};
