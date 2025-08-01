#!/usr/bin/env node

/**
 * Bundle Optimization Analyzer
 * 
 * Analyzes the current bundle for:
 * 1. Duplicate dependencies
 * 2. Unused files
 * 3. Large files that could be optimized
 * 4. Legacy code that can be removed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('📊 Bundle Optimization Analysis');
console.log('=' .repeat(50));

/**
 * Get current bundle info
 */
function getCurrentBundleInfo() {
    const manifestPath = path.join(rootDir, 'public/js/bundle-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const bundlePath = path.join(rootDir, 'public/js', manifest.bundleFile);
    
    if (!fs.existsSync(bundlePath)) {
        throw new Error(`Bundle file not found: ${manifest.bundleFile}`);
    }
    
    const stats = fs.statSync(bundlePath);
    const content = fs.readFileSync(bundlePath, 'utf8');
    
    return {
        name: manifest.bundleFile,
        path: bundlePath,
        size: stats.size,
        sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
        content: content,
        lines: content.split('\n').length
    };
}

/**
 * Analyze for duplicate dependencies
 */
function analyzeDuplicateDependencies(bundleContent) {
    console.log('🔍 Analyzing duplicate dependencies...');
    
    const duplicateChecks = [
        { name: 'jQuery', patterns: [/jquery/gi, /\$\(/g], threshold: 10 },
        { name: 'Bootstrap', patterns: [/bootstrap/gi, /\.btn-/g], threshold: 5 },
        { name: 'Font Awesome', patterns: [/font-?awesome/gi, /\.fa-/g], threshold: 5 },
        { name: 'Lodash/Underscore', patterns: [/lodash/gi, /_\./g], threshold: 10 },
        { name: 'Moment.js', patterns: [/moment/gi], threshold: 5 },
        { name: 'Axios', patterns: [/axios/gi], threshold: 3 },
        { name: 'Socket.IO', patterns: [/socket\.io/gi], threshold: 3 }
    ];
    
    const duplicates = [];
    
    duplicateChecks.forEach(check => {
        let totalMatches = 0;
        check.patterns.forEach(pattern => {
            const matches = bundleContent.match(pattern);
            if (matches) {
                totalMatches += matches.length;
            }
        });
        
        if (totalMatches > check.threshold) {
            duplicates.push({
                name: check.name,
                count: totalMatches,
                severity: totalMatches > check.threshold * 2 ? 'high' : 'medium'
            });
        }
    });
    
    return duplicates;
}

/**
 * Analyze for large code blocks
 */
function analyzeLargeCodeBlocks(bundleContent) {
    console.log('📏 Analyzing large code blocks...');
    
    const largeBlocks = [];
    const lines = bundleContent.split('\n');
    
    // Find very long lines (potential minified libraries)
    lines.forEach((line, index) => {
        if (line.length > 1000) {
            largeBlocks.push({
                type: 'long_line',
                line: index + 1,
                length: line.length,
                preview: line.substring(0, 100) + '...'
            });
        }
    });
    
    // Find repeated code patterns
    const functionPattern = /function\s+\w+\s*\([^)]*\)\s*\{/g;
    const functions = bundleContent.match(functionPattern) || [];
    
    if (functions.length > 100) {
        largeBlocks.push({
            type: 'many_functions',
            count: functions.length,
            suggestion: 'Consider code splitting or tree shaking'
        });
    }
    
    return largeBlocks;
}

/**
 * Analyze for legacy/unused code
 */
function analyzeLegacyCode(bundleContent) {
    console.log('🗑️ Analyzing legacy/unused code...');
    
    const legacyPatterns = [
        { name: 'IE Support', pattern: /msie|trident|internet explorer/gi, impact: 'medium' },
        { name: 'Old jQuery', pattern: /jquery.*1\.|jquery.*2\./gi, impact: 'high' },
        { name: 'Polyfills', pattern: /polyfill|shim/gi, impact: 'low' },
        { name: 'Console.log', pattern: /console\.log/gi, impact: 'low' },
        { name: 'Debug Code', pattern: /debug|DEBUG/g, impact: 'low' },
        { name: 'Test Code', pattern: /test|TEST|spec|SPEC/g, impact: 'medium' }
    ];
    
    const legacyCode = [];
    
    legacyPatterns.forEach(check => {
        const matches = bundleContent.match(check.pattern);
        if (matches && matches.length > 0) {
            legacyCode.push({
                name: check.name,
                count: matches.length,
                impact: check.impact
            });
        }
    });
    
    return legacyCode;
}

/**
 * Analyze bundle composition
 */
function analyzeBundleComposition(bundleContent) {
    console.log('🧩 Analyzing bundle composition...');
    
    const composition = {
        totalSize: bundleContent.length,
        components: []
    };
    
    // Estimate component sizes based on patterns
    const components = [
        { name: 'Token Management', pattern: /token|Token|TOKEN/g },
        { name: 'UI Components', pattern: /ui-|UI|component|Component/g },
        { name: 'API Clients', pattern: /api|Api|API|axios|fetch/g },
        { name: 'Utilities', pattern: /util|Util|helper|Helper/g },
        { name: 'Validation', pattern: /valid|Valid|check|Check/g },
        { name: 'Error Handling', pattern: /error|Error|catch|throw/g }
    ];
    
    components.forEach(comp => {
        const matches = bundleContent.match(comp.pattern) || [];
        const estimatedSize = matches.length * 50; // Rough estimate
        const percentage = ((estimatedSize / composition.totalSize) * 100).toFixed(1);
        
        composition.components.push({
            name: comp.name,
            matches: matches.length,
            estimatedSize: estimatedSize,
            percentage: percentage
        });
    });
    
    return composition;
}

/**
 * Generate optimization recommendations
 */
function generateOptimizationRecommendations(analysis) {
    console.log('💡 Generating optimization recommendations...');
    
    const recommendations = [];
    
    // Bundle size recommendations
    if (parseFloat(analysis.bundle.sizeInMB) > 2.0) {
        recommendations.push({
            priority: 'high',
            category: 'Bundle Size',
            issue: `Bundle is ${analysis.bundle.sizeInMB} MB (recommended: < 2 MB)`,
            solution: 'Consider code splitting, tree shaking, or removing unused dependencies'
        });
    }
    
    // Duplicate dependency recommendations
    analysis.duplicates.forEach(dup => {
        if (dup.severity === 'high') {
            recommendations.push({
                priority: 'high',
                category: 'Duplicates',
                issue: `${dup.name} appears ${dup.count} times`,
                solution: 'Consolidate or remove duplicate dependencies'
            });
        }
    });
    
    // Legacy code recommendations
    analysis.legacyCode.forEach(legacy => {
        if (legacy.impact === 'high' || legacy.count > 10) {
            recommendations.push({
                priority: legacy.impact === 'high' ? 'high' : 'medium',
                category: 'Legacy Code',
                issue: `${legacy.name} found ${legacy.count} times`,
                solution: 'Remove or update legacy code patterns'
            });
        }
    });
    
    // Large code block recommendations
    analysis.largeBlocks.forEach(block => {
        if (block.type === 'long_line' && block.length > 5000) {
            recommendations.push({
                priority: 'medium',
                category: 'Code Structure',
                issue: `Very long line (${block.length} chars) at line ${block.line}`,
                solution: 'Consider breaking up minified libraries or using source maps'
            });
        }
    });
    
    return recommendations;
}

/**
 * Main analysis function
 */
function runBundleAnalysis() {
    try {
        const bundle = getCurrentBundleInfo();
        
        console.log(`📦 Bundle: ${bundle.name}`);
        console.log(`📏 Size: ${bundle.sizeInMB} MB (${bundle.size.toLocaleString()} bytes)`);
        console.log(`📄 Lines: ${bundle.lines.toLocaleString()}`);
        console.log('');
        
        const analysis = {
            bundle: bundle,
            duplicates: analyzeDuplicateDependencies(bundle.content),
            largeBlocks: analyzeLargeCodeBlocks(bundle.content),
            legacyCode: analyzeLegacyCode(bundle.content),
            composition: analyzeBundleComposition(bundle.content)
        };
        
        // Display results
        console.log('📊 ANALYSIS RESULTS');
        console.log('=' .repeat(50));
        
        // Duplicates
        if (analysis.duplicates.length > 0) {
            console.log('⚠️  Potential Duplicates:');
            analysis.duplicates.forEach(dup => {
                const icon = dup.severity === 'high' ? '🔴' : '🟡';
                console.log(`   ${icon} ${dup.name}: ${dup.count} occurrences`);
            });
            console.log('');
        }
        
        // Legacy code
        if (analysis.legacyCode.length > 0) {
            console.log('🗑️ Legacy Code:');
            analysis.legacyCode.forEach(legacy => {
                const icon = legacy.impact === 'high' ? '🔴' : legacy.impact === 'medium' ? '🟡' : '🟢';
                console.log(`   ${icon} ${legacy.name}: ${legacy.count} occurrences`);
            });
            console.log('');
        }
        
        // Large blocks
        if (analysis.largeBlocks.length > 0) {
            console.log('📏 Large Code Blocks:');
            analysis.largeBlocks.forEach(block => {
                if (block.type === 'long_line') {
                    console.log(`   📄 Line ${block.line}: ${block.length} characters`);
                } else if (block.type === 'many_functions') {
                    console.log(`   🔧 ${block.count} functions detected`);
                }
            });
            console.log('');
        }
        
        // Composition
        console.log('🧩 Bundle Composition:');
        analysis.composition.components
            .sort((a, b) => b.matches - a.matches)
            .slice(0, 5)
            .forEach(comp => {
                console.log(`   📦 ${comp.name}: ${comp.matches} matches (~${comp.percentage}%)`);
            });
        console.log('');
        
        // Recommendations
        const recommendations = generateOptimizationRecommendations(analysis);
        
        if (recommendations.length > 0) {
            console.log('💡 OPTIMIZATION RECOMMENDATIONS');
            console.log('=' .repeat(50));
            
            const highPriority = recommendations.filter(r => r.priority === 'high');
            const mediumPriority = recommendations.filter(r => r.priority === 'medium');
            
            if (highPriority.length > 0) {
                console.log('🔴 High Priority:');
                highPriority.forEach(rec => {
                    console.log(`   • ${rec.issue}`);
                    console.log(`     → ${rec.solution}`);
                });
                console.log('');
            }
            
            if (mediumPriority.length > 0) {
                console.log('🟡 Medium Priority:');
                mediumPriority.forEach(rec => {
                    console.log(`   • ${rec.issue}`);
                    console.log(`     → ${rec.solution}`);
                });
                console.log('');
            }
        } else {
            console.log('✅ Bundle appears to be well optimized!');
        }
        
        console.log('=' .repeat(50));
        console.log('📊 Bundle analysis complete!');
        
        return analysis;
        
    } catch (error) {
        console.error('❌ Error during bundle analysis:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runBundleAnalysis();
}

export { runBundleAnalysis };