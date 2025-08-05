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
        log(`   - Imports added: ${importsAdded} (${importStatements.length} unique)`, 'cyan');
        log(`   - Exports added: ${exportsAdded} (${exportStatements.length} unique)`, 'cyan');
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
