import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the CSS file
const cssPath = path.join(__dirname, 'public/css/styles.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

console.log('Original CSS file size:', cssContent.length, 'characters');

// Function to extract CSS rules
function extractRules(css) {
    const rules = [];
    const regex = /([^{}]+)\s*\{([^{}]+)\}/g;
    let match;
    
    while ((match = regex.exec(css)) !== null) {
        const selector = match[1].trim();
        const properties = match[2].trim();
        rules.push({ selector, properties });
    }
    
    return rules;
}

// Function to normalize CSS properties for comparison
function normalizeProperties(properties) {
    return properties
        .split(';')
        .map(prop => prop.trim())
        .filter(prop => prop.length > 0)
        .sort()
        .join(';');
}

// Function to clean up log-related CSS to make it more compact
function makeLogsCompact(properties) {
    // Reduce padding and margins for log entries
    properties = properties.replace(/padding:\s*[^;]+;/g, 'padding: 0.5rem;');
    properties = properties.replace(/margin:\s*[^;]+;/g, 'margin: 0.25rem 0;');
    properties = properties.replace(/font-size:\s*[^;]+;/g, 'font-size: 0.85rem;');
    properties = properties.replace(/line-height:\s*[^;]+;/g, 'line-height: 1.3;');
    
    // Make log entries more compact
    if (properties.includes('log-entry')) {
        properties = properties.replace(/min-height:\s*[^;]+;/g, 'min-height: auto;');
        properties = properties.replace(/height:\s*[^;]+;/g, 'height: auto;');
    }
    
    return properties;
}

// Extract all rules
const allRules = extractRules(cssContent);

// Remove duplicates and keep the first occurrence
const uniqueRules = [];
const seenProperties = new Set();

allRules.forEach(rule => {
    const normalizedProps = normalizeProperties(rule.properties);
    const key = `${rule.selector}|${normalizedProps}`;
    
    if (!seenProperties.has(key)) {
        seenProperties.add(key);
        
        // Make logs more compact
        const compactProperties = makeLogsCompact(rule.properties);
        
        uniqueRules.push({
            selector: rule.selector,
            properties: compactProperties
        });
    }
});

// Reconstruct CSS
let cleanedCss = '';
uniqueRules.forEach(rule => {
    cleanedCss += `${rule.selector} {\n    ${rule.properties}\n}\n\n`;
});

// Write the cleaned CSS
fs.writeFileSync(cssPath, cleanedCss, 'utf8');

console.log('Cleaned CSS file size:', cleanedCss.length, 'characters');
console.log('Removed', allRules.length - uniqueRules.length, 'duplicate rules');
console.log('Kept', uniqueRules.length, 'unique rules');
console.log('Reduction:', Math.round((1 - cleanedCss.length / cssContent.length) * 100), '%');

console.log('\nBackup saved as: public/css/styles.css.backup');
console.log('If you need to restore, run: cp public/css/styles.css.backup public/css/styles.css'); 