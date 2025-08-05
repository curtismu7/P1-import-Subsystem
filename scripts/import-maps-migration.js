#!/usr/bin/env node

/**
 * Import Maps Migration Script
 * 
 * This script helps migrate modules from the bundle to import maps by:
 * 1. Analyzing the current bundle to identify modules
 * 2. Creating ES module versions of CommonJS modules
 * 3. Updating import maps configuration
 * 4. Testing module compatibility
 * 
 * Usage:
 *   node scripts/import-maps-migration.js [command]
 * 
 * Commands:
 *   analyze - Analyze bundle and identify modules for migration
 *   convert [file] - Convert a CommonJS module to ES module
 *   update-maps - Update import maps with new modules
 *   test - Test import maps compatibility
 *   status - Show migration status
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Analyze the bundle to identify modules for migration
 * @returns {Promise<void>}
 */
async function analyzeBundleForMigration() {
    log('🔍 Analyzing bundle for migration opportunities...', 'bright');
    
    try {
        // Get the latest bundle path
        const manifestPath = path.join(projectRoot, 'public', 'js', 'bundle-manifest.json');
        const manifestContent = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);
        const bundlePath = path.join(projectRoot, 'public', 'js', manifest.bundleFile);
        
        log(`📦 Analyzing bundle: ${manifest.bundleFile}`, 'blue');
        
        // Read the bundle content
        const bundleContent = await fs.readFile(bundlePath, 'utf8');
        
        // More comprehensive regex patterns to identify potential modules
        const modulePatterns = [
            // Pattern 1: JSDoc style comments with module name
            { pattern: /\/\*\*\s*\n\s*\*\s*([^*]+)\s*\n/g, priority: 2 },
            // Pattern 2: Module exports or requires
            { pattern: /(?:module\.exports|exports|require\()\s*=?\s*['"]([^'"]+)['"]?/g, priority: 1 },
            // Pattern 3: Import statements
            { pattern: /import\s+(?:\{[^}]*\}\s+from\s+|\*\s+as\s+[^\s]+\s+from\s+|[^\s]+\s+from\s+)?['"]([^'"]+)['"]\s*;?/g, priority: 3 },
            // Pattern 4: Define function calls (AMD)
            { pattern: /define\(['"]([^'"]+)['"]\s*,/g, priority: 2 }
        ];
        
        // Extract module names and paths with priority
        let moduleEntries = [];
        
        for (const { pattern, priority } of modulePatterns) {
            const matches = [...bundleContent.matchAll(pattern)];
            const patternModules = matches
                .map(match => {
                    const moduleName = match[1].trim();
                    // Filter out obvious non-modules
                    if (moduleName.length < 2 || 
                        /^\d+$/.test(moduleName) || 
                        /^(function|var|let|const|if|for|while)$/.test(moduleName)) {
                        return null;
                    }
                    return { name: moduleName, priority };
                })
                .filter(Boolean);
            
            moduleEntries = [...moduleEntries, ...patternModules];
        }
        
        // Deduplicate modules and sort by priority
        const uniqueModules = Array.from(new Map(
            moduleEntries.map(entry => [entry.name, entry])
        ).values());
        
        uniqueModules.sort((a, b) => b.priority - a.priority);
        
        // Extract just the module names for compatibility with existing code
        const modules = uniqueModules.map(entry => entry.name);
        
        // Get current import maps
        const importMapsPath = path.join(projectRoot, 'public', 'import-maps.json');
        const importMapsContent = await fs.readFile(importMapsPath, 'utf8');
        const importMaps = JSON.parse(importMapsContent);
        
        // Identify modules not yet in import maps
        const importMapModules = Object.keys(importMaps.imports);
        const missingModules = modules.filter(module => 
            !importMapModules.some(imp => 
                imp === module || 
                imp.endsWith(`/${module}`) || 
                imp.endsWith(`/${module}.js`)
            )
        );
        
        // Generate report
        log('\n📊 Bundle Analysis Report', 'bright');
        log(`Total potential modules identified: ${modules.length}`, 'blue');
        log(`Modules already in import maps: ${modules.length - missingModules.length}`, 'green');
        log(`Modules not yet in import maps: ${missingModules.length}`, 'yellow');
        
        if (missingModules.length > 0) {
            log('\n🎯 Modules to consider for migration:', 'bright');
            missingModules.forEach((module, index) => {
                log(`${index + 1}. ${module}`, 'cyan');
            });
        }
        
        // Categorize modules by priority
        const highPriorityModules = uniqueModules
            .filter(module => module.priority === 3)
            .map(module => module.name);
            
        const mediumPriorityModules = uniqueModules
            .filter(module => module.priority === 2)
            .map(module => module.name);
            
        const lowPriorityModules = uniqueModules
            .filter(module => module.priority === 1)
            .map(module => module.name);
        
        // Identify key application modules
        const keyModules = [
            'version', 'logger', 'api-client', 'settings-manager', 'token-manager',
            'import-subsystem', 'export-subsystem', 'ui-manager', 'error-handler'
        ];
        
        const priorityKeyModules = keyModules.filter(key => 
            modules.some(module => 
                module.toLowerCase().includes(key.toLowerCase())
            )
        );
        
        // Save analysis to file
        const reportPath = path.join(projectRoot, 'IMPORT_MAPS_MIGRATION_REPORT.md');
        const report = `# Import Maps Migration Report

## Analysis Summary
- **Date**: ${new Date().toISOString()}
- **Bundle Analyzed**: ${manifest.bundleFile}
- **Total Modules Identified**: ${modules.length}
- **Modules in Import Maps**: ${modules.length - missingModules.length}
- **Modules to Migrate**: ${missingModules.length}
- **Version**: ${process.env.APP_VERSION || 'Unknown'}

## Priority Migration Candidates

### Key Application Modules
${priorityKeyModules.map((module, index) => `${index + 1}. \`${module}\` - Core functionality`).join('\n')}

### High Priority Modules (Import/Export Statements)
${highPriorityModules.slice(0, 20).map((module, index) => `${index + 1}. \`${module}\``).join('\n')}
${highPriorityModules.length > 20 ? `\n...and ${highPriorityModules.length - 20} more` : ''}

### Medium Priority Modules (JSDoc/AMD)
${mediumPriorityModules.slice(0, 15).map((module, index) => `${index + 1}. \`${module}\``).join('\n')}
${mediumPriorityModules.length > 15 ? `\n...and ${mediumPriorityModules.length - 15} more` : ''}

### Low Priority Modules (CommonJS)
${lowPriorityModules.slice(0, 10).map((module, index) => `${index + 1}. \`${module}\``).join('\n')}
${lowPriorityModules.length > 10 ? `\n...and ${lowPriorityModules.length - 10} more` : ''}

## Migration Strategy

### Phase 1: Core Modules (Current)
- Migrate key application modules first
- Focus on version.js, logger.js, and other core utilities
- Update import maps with these core modules
- Test with hybrid loading (import maps + fallback bundle)

### Phase 2: Feature Modules (Next)
- Migrate subsystem modules (import, export, settings)
- Convert UI components to ES modules
- Update import maps incrementally
- Reduce bundle size gradually

### Phase 3: Library Dependencies (Future)
- Evaluate which libraries to include in import maps
- Consider CDN options for common libraries
- Optimize loading performance

## Next Steps
1. Run \`npm run import-maps:migrate [module-name]\` to convert priority modules
2. Run \`npm run import-maps:update-maps\` to update import maps configuration
3. Run \`npm run build:bundle\` to rebuild the fallback bundle
4. Run \`npm run start:importmaps\` to test with import maps enabled
5. Run \`npm run version:update:centralized 7.0.0.22\` to update version after migration

## Migration Progress
- [${modules.length - missingModules.length > 0 ? 'x' : ' '}] Initial import maps configuration
- [ ] Core module migration
- [ ] Feature module migration
- [ ] Library dependency evaluation
- [ ] Performance optimization
- [ ] Full import maps implementation

---
Generated by Import Maps Migration Tool on ${new Date().toLocaleString()}
`;
        
        await fs.writeFile(reportPath, report);
        log(`\n✅ Analysis report saved to: IMPORT_MAPS_MIGRATION_REPORT.md`, 'green');
        
        return { modules, missingModules };
        
    } catch (error) {
        log(`❌ Error analyzing bundle: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Convert a CommonJS module to ES module format
 * @param {string} filePath - Path to the module file
 */
async function convertModuleToES(filePath) {
    try {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
        log(`🔄 Converting module: ${path.relative(projectRoot, fullPath)}`, 'bright');
        
        // Check if file exists
        try {
            await fs.access(fullPath);
        } catch (error) {
            log(`❌ File not found: ${fullPath}`, 'red');
            return;
        }
        
        // Read file content
        const content = await fs.readFile(fullPath, 'utf8');
        
        // Check if already ES module
        if (content.includes('export ') || content.includes('import ')) {
            log(`ℹ️ File appears to already use ES module syntax`, 'yellow');
            // Continue with conversion anyway to ensure complete conversion
        }
        
        // Convert CommonJS to ES module
        let esContent = content;
        
        // Track all imports to add at the top
        const importStatements = [];
        const exportStatements = [];
        let importsAdded = 0;
        let exportsAdded = 0;
        
        // Handle different require patterns
        
        // Pattern 1: const/let/var name = require('module');
        const basicRequirePattern = /(?:const|let|var)\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);/g;
        const basicRequires = [...content.matchAll(basicRequirePattern)];
        
        basicRequires.forEach(match => {
            const varName = match[1];
            const modulePath = match[2];
            importStatements.push(`import ${varName} from '${modulePath}';`);
            importsAdded++;
        });
        
        // Pattern 2: const/let/var { name1, name2 } = require('module');
        const destructuringRequirePattern = /(?:const|let|var)\s+\{([^}]+)\}\s*=\s*require\(['"]([^'"]+)['"]\);/g;
        const destructuringRequires = [...content.matchAll(destructuringRequirePattern)];
        
        destructuringRequires.forEach(match => {
            const imports = match[1].split(',').map(name => name.trim());
            const modulePath = match[2];
            importStatements.push(`import { ${imports.join(', ')} } from '${modulePath}';`);
            importsAdded++;
        });
        
        // Pattern 3: const/let/var name = require('module').submodule;
        const submoduleRequirePattern = /(?:const|let|var)\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)\.(\w+);/g;
        const submoduleRequires = [...content.matchAll(submoduleRequirePattern)];
        
        submoduleRequires.forEach(match => {
            const varName = match[1];
            const modulePath = match[2];
            const submodule = match[3];
            importStatements.push(`import { ${submodule} as ${varName} } from '${modulePath}';`);
            importsAdded++;
        });
        
        // Handle different export patterns
        
        // Pattern 1: module.exports = value;
        const defaultExportPattern = /module\.exports\s*=\s*([^;]+);?/g;
        esContent = esContent.replace(defaultExportPattern, (match, exportValue) => {
            exportsAdded++;
            return `export default ${exportValue};`;
        });
        
        // Pattern 2: exports.name = value; or module.exports.name = value;
        const namedExportPattern = /(?:exports|module\.exports)\.(\w+)\s*=\s*([^;]+);/g;
        const namedExports = [...content.matchAll(namedExportPattern)];
        
        namedExports.forEach(match => {
            const exportName = match[1];
            const exportValue = match[2];
            
            // If it's a function or class declaration that's being exported
            if (exportValue.trim() === exportName) {
                // We'll handle this with an export declaration before the function/class
                exportStatements.push(`export { ${exportName} };`);
            } else {
                // It's a variable or expression being exported
                exportStatements.push(`export const ${exportName} = ${exportValue};`);
            }
            exportsAdded++;
        });
        
        // Pattern 3: Object.assign(exports, { name1, name2 });
        const objectAssignPattern = /Object\.assign\((?:exports|module\.exports),\s*\{([^}]+)\}\);/g;
        const objectAssignExports = [...content.matchAll(objectAssignPattern)];
        
        objectAssignExports.forEach(match => {
            const exports = match[1].split(',').map(exp => {
                const parts = exp.split(':').map(part => part.trim());
                return parts.length > 1 ? `${parts[0]} as ${parts[1]}` : parts[0];
            });
            exportStatements.push(`export { ${exports.join(', ')} };`);
            exportsAdded += exports.length;
        });
        
        // Remove all CommonJS require statements
        esContent = esContent
            .replace(basicRequirePattern, '')
            .replace(destructuringRequirePattern, '')
            .replace(submoduleRequirePattern, '')
            .replace(defaultExportPattern, '')
            .replace(namedExportPattern, '')
            .replace(objectAssignPattern, '');
        
        // Add import statements at the top
        if (importStatements.length > 0) {
            const importSection = [...new Set(importStatements)].join('\n') + '\n\n';
            esContent = importSection + esContent;
        }
        
        // Add export statements where appropriate
        if (exportStatements.length > 0) {
            // Add exports at the end if they're not already handled
            esContent = esContent + '\n\n' + [...new Set(exportStatements)].join('\n');
        }
        
        // Clean up multiple blank lines
        esContent = esContent.replace(/\n{3,}/g, '\n\n');
        
        // Create backup of original file
        const backupPath = `${fullPath}.bak`;
        await fs.writeFile(backupPath, content);
        log(`✅ Created backup: ${path.relative(projectRoot, backupPath)}`, 'green');
        
        // Write converted file
        await fs.writeFile(fullPath, esContent);
        log(`✅ Converted to ES module: ${path.relative(projectRoot, fullPath)}`, 'green');
        
        // Log conversion summary
        log(`📊 Conversion summary for ${path.basename(fullPath)}:`, 'cyan');
        log(`   - Imports added: ${importsAdded} (${[...new Set(importStatements)].length} unique)`, 'cyan');
        log(`   - Exports added: ${exportsAdded} (${[...new Set(exportStatements)].length} unique)`, 'cyan');
        log(`   - Patterns detected:`, 'cyan');
        if (basicRequires.length) log(`     - Basic requires: ${basicRequires.length}`, 'cyan');
        if (destructuringRequires.length) log(`     - Destructuring requires: ${destructuringRequires.length}`, 'cyan');
        if (submoduleRequires.length) log(`     - Submodule requires: ${submoduleRequires.length}`, 'cyan');
        if (namedExports.length) log(`     - Named exports: ${namedExports.length}`, 'cyan');
        if (objectAssignExports.length) log(`     - Object.assign exports: ${objectAssignExports.length}`, 'cyan');
        
    } catch (error) {
        log(`❌ Error converting module: ${error.message}`, 'red');
        log(`   Stack: ${error.stack}`, 'red');
        throw error;
    }
}

/**
 * Update import maps with new modules
 */
async function updateImportMaps() {
    try {
        log('🔄 Updating import maps...', 'bright');
        
        // Get current import maps
        const importMapsPath = path.join(projectRoot, 'public', 'import-maps.json');
        const importMapsContent = await fs.readFile(importMapsPath, 'utf8');
        const importMaps = JSON.parse(importMapsContent);
        
        // Scan src/client directory for modules
        const clientDir = path.join(projectRoot, 'src', 'client');
        const modules = await scanDirectoryForModules(clientDir);
        
        // Update import maps
        let updatedCount = 0;
        
        for (const module of modules) {
            const relativePath = path.relative(projectRoot, module.path);
            const webPath = '/' + relativePath.replace(/\\/g, '/');
            const moduleName = path.basename(module.path, '.js');
            
            // Skip if already in import maps
            if (importMaps.imports[moduleName] || 
                Object.values(importMaps.imports).includes(webPath)) {
                continue;
            }
            
            // Add to import maps
            importMaps.imports[moduleName] = webPath;
            updatedCount++;
        }
        
        // Write updated import maps
        await fs.writeFile(importMapsPath, JSON.stringify(importMaps, null, 2));
        
        log(`✅ Updated import maps with ${updatedCount} new modules`, 'green');
        
    } catch (error) {
        log(`❌ Error updating import maps: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Scan directory for ES modules
 * @param {string} dir - Directory to scan
 * @returns {Array} - Array of module objects
 */
async function scanDirectoryForModules(dir) {
    const modules = [];
    
    async function scan(directory) {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            
            if (entry.isDirectory()) {
                await scan(fullPath);
            } else if (entry.name.endsWith('.js')) {
                const content = await fs.readFile(fullPath, 'utf8');
                
                // Check if it's an ES module
                if (content.includes('export ') || content.includes('import ')) {
                    modules.push({
                        path: fullPath,
                        name: entry.name,
                        isESModule: true
                    });
                }
            }
        }
    }
    
    await scan(dir);
    return modules;
}

/**
 * Test import maps compatibility
 */
async function testImportMaps() {
    try {
        log('🧪 Testing import maps compatibility...', 'bright');
        
        // Start server with import maps enabled
        log('🚀 Starting server with import maps...', 'blue');
        execSync('npm run start:importmaps', { stdio: 'inherit' });
        
        log('✅ Import maps test complete', 'green');
        
    } catch (error) {
        log(`❌ Error testing import maps: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Show migration status
 */
async function showMigrationStatus() {
    try {
        log('📊 Import Maps Migration Status', 'bright');
        
        // Get current import maps
        const importMapsPath = path.join(projectRoot, 'public', 'import-maps.json');
        const importMapsContent = await fs.readFile(importMapsPath, 'utf8');
        const importMaps = JSON.parse(importMapsContent);
        
        // Count modules in import maps
        const moduleCount = Object.keys(importMaps.imports).length;
        
        // Get bundle size
        const manifestPath = path.join(projectRoot, 'public', 'js', 'bundle-manifest.json');
        const manifestContent = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);
        const bundlePath = path.join(projectRoot, 'public', 'js', manifest.bundleFile);
        const bundleStats = await fs.stat(bundlePath);
        const bundleSizeMB = (bundleStats.size / (1024 * 1024)).toFixed(2);
        
        log(`📦 Bundle: ${manifest.bundleFile} (${bundleSizeMB} MB)`, 'blue');
        log(`🗺️ Import Maps: ${moduleCount} modules mapped`, 'green');
        
        // Check if import maps are enabled by default
        const loaderPath = path.join(projectRoot, 'public', 'js', 'import-maps-loader.js');
        const loaderContent = await fs.readFile(loaderPath, 'utf8');
        const defaultMode = loaderContent.includes("preferredMode: localStorage.getItem('preferredLoadingMode') || 'import-maps'") ? 
            'import-maps' : 'bundle';
        
        log(`🔄 Default Loading Mode: ${defaultMode}`, defaultMode === 'import-maps' ? 'green' : 'yellow');
        
        // Show migration progress
        const reportPath = path.join(projectRoot, 'IMPORT_MAPS_MIGRATION_REPORT.md');
        let migrationProgress = 'No migration report found';
        
        try {
            await fs.access(reportPath);
            const reportContent = await fs.readFile(reportPath, 'utf8');
            const progressSection = reportContent.match(/## Migration Progress([\s\S]*?)(?:##|$)/);
            if (progressSection) {
                migrationProgress = progressSection[1].trim();
            }
        } catch (error) {
            // Report doesn't exist yet
        }
        
        log('\n📋 Migration Progress:', 'bright');
        log(migrationProgress, 'cyan');
        
    } catch (error) {
        log(`❌ Error showing migration status: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    try {
        const command = process.argv[2] || 'help';
        
        switch (command) {
            case 'analyze':
                await analyzeBundleForMigration();
                break;
                
            case 'convert':
                const filePath = process.argv[3];
                if (!filePath) {
                    log('❌ Error: File path required', 'red');
                    log('Usage: node scripts/import-maps-migration.js convert [file]', 'yellow');
                    process.exit(1);
                }
                await convertModuleToES(filePath);
                break;
                
            case 'update-maps':
                await updateImportMaps();
                break;
                
            case 'test':
                await testImportMaps();
                break;
                
            case 'status':
                await showMigrationStatus();
                break;
                
            case 'help':
            default:
                log('📚 Import Maps Migration Script', 'bright');
                log('Usage: node scripts/import-maps-migration.js [command]', 'cyan');
                log('\nCommands:', 'bright');
                log('  analyze         - Analyze bundle and identify modules for migration', 'cyan');
                log('  convert [file]  - Convert a CommonJS module to ES module', 'cyan');
                log('  update-maps     - Update import maps with new modules', 'cyan');
                log('  test            - Test import maps compatibility', 'cyan');
                log('  status          - Show migration status', 'cyan');
                log('  help            - Show this help message', 'cyan');
                break;
        }
        
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        process.exit(1);
    }
}

main();
