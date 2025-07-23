#!/usr/bin/env node

/**
 * DRY (Don't Repeat Yourself) Audit Script for PingOne Import Tool
 * 
 * This script analyzes the codebase for:
 * 1. Code duplication and repetitive patterns
 * 2. Module separation concerns
 * 3. Opportunities for refactoring and consolidation
 * 4. Violation of single responsibility principle
 * 5. Missing abstractions and utility functions
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class DRYAuditor {
    constructor() {
        this.violations = [];
        this.codePatterns = new Map();
        this.moduleAnalysis = new Map();
        this.duplicateBlocks = [];
        this.refactoringOpportunities = [];
    }

    async auditCodebase() {
        console.log('🔍 Starting DRY Audit of PingOne Import Tool...\n');

        // Analyze key directories
        const directories = [
            'src/client',
            'public/js',
            'routes',
            'server',
            'auth-subsystem'
        ];

        for (const dir of directories) {
            const dirPath = path.join(projectRoot, dir);
            try {
                await this.analyzeDirectory(dirPath, dir);
            } catch (error) {
                console.warn(`⚠️  Could not analyze ${dir}: ${error.message}`);
            }
        }

        // Generate comprehensive report
        await this.generateReport();
        
        return {
            violations: this.violations,
            duplicateBlocks: this.duplicateBlocks,
            refactoringOpportunities: this.refactoringOpportunities
        };
    }

    async analyzeDirectory(dirPath, dirName) {
        console.log(`📁 Analyzing ${dirName}...`);

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    await this.analyzeDirectory(fullPath, `${dirName}/${entry.name}`);
                } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
                    await this.analyzeFile(fullPath, `${dirName}/${entry.name}`);
                }
            }
        } catch (error) {
            console.warn(`⚠️  Error reading directory ${dirPath}: ${error.message}`);
        }
    }

    async analyzeFile(filePath, relativePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n');
            
            // Skip very small files or generated files
            if (lines.length < 20 || relativePath.includes('bundle') || relativePath.includes('.min.')) {
                return;
            }

            console.log(`  📄 ${relativePath}`);

            // Analyze for various DRY violations
            this.detectDuplicateCode(content, relativePath);
            this.detectRepeatedPatterns(content, relativePath);
            this.analyzeModuleStructure(content, relativePath);
            this.detectMissingAbstractions(content, relativePath);
            this.analyzeErrorHandling(content, relativePath);
            this.detectConfigurationDuplication(content, relativePath);

        } catch (error) {
            console.warn(`⚠️  Could not analyze ${filePath}: ${error.message}`);
        }
    }

    detectDuplicateCode(content, filePath) {
        // Look for duplicate function bodies
        const functionRegex = /function\s+\w+\s*\([^)]*\)\s*\{([^}]+)\}/g;
        const functions = [];
        let match;

        while ((match = functionRegex.exec(content)) !== null) {
            const body = match[1].trim();
            if (body.length > 100) { // Only check substantial functions
                functions.push({ body, filePath, match: match[0] });
            }
        }

        // Check for similar function bodies
        for (let i = 0; i < functions.length; i++) {
            for (let j = i + 1; j < functions.length; j++) {
                const similarity = this.calculateSimilarity(functions[i].body, functions[j].body);
                if (similarity > 0.8) {
                    this.violations.push({
                        type: 'Duplicate Function Logic',
                        severity: 'HIGH',
                        file: filePath,
                        description: `Similar function logic detected (${Math.round(similarity * 100)}% similarity)`,
                        suggestion: 'Extract common logic into shared utility function',
                        details: {
                            function1: functions[i].match.substring(0, 100) + '...',
                            function2: functions[j].match.substring(0, 100) + '...'
                        }
                    });
                }
            }
        }
    }

    detectRepeatedPatterns(content, filePath) {
        // Common repeated patterns to look for
        const patterns = [
            {
                name: 'Console Logging',
                regex: /console\.(log|error|warn|info)\s*\(/g,
                threshold: 10,
                suggestion: 'Use centralized logging utility'
            },
            {
                name: 'Try-Catch Blocks',
                regex: /try\s*\{[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?\}/g,
                threshold: 5,
                suggestion: 'Create error handling wrapper functions'
            },
            {
                name: 'DOM Element Selection',
                regex: /document\.(querySelector|getElementById|getElementsByClassName)/g,
                threshold: 8,
                suggestion: 'Use safe element selection utility'
            },
            {
                name: 'Fetch API Calls',
                regex: /fetch\s*\(/g,
                threshold: 5,
                suggestion: 'Create centralized API client'
            },
            {
                name: 'Event Listeners',
                regex: /addEventListener\s*\(/g,
                threshold: 8,
                suggestion: 'Use event management utility'
            }
        ];

        for (const pattern of patterns) {
            const matches = content.match(pattern.regex);
            if (matches && matches.length >= pattern.threshold) {
                this.violations.push({
                    type: 'Repeated Pattern',
                    severity: 'MEDIUM',
                    file: filePath,
                    description: `${pattern.name} used ${matches.length} times`,
                    suggestion: pattern.suggestion,
                    count: matches.length
                });
            }
        }
    }

    analyzeModuleStructure(content, filePath) {
        const lines = content.split('\n');
        let functionCount = 0;
        let classCount = 0;
        let exportCount = 0;
        let importCount = 0;

        for (const line of lines) {
            if (line.match(/^\s*(function|const\s+\w+\s*=\s*function|const\s+\w+\s*=\s*\([^)]*\)\s*=>)/)) {
                functionCount++;
            }
            if (line.match(/^\s*class\s+\w+/)) {
                classCount++;
            }
            if (line.match(/^\s*(export|module\.exports)/)) {
                exportCount++;
            }
            if (line.match(/^\s*(import|require\()/)) {
                importCount++;
            }
        }

        // Check for overly large modules
        if (lines.length > 500) {
            this.violations.push({
                type: 'Large Module',
                severity: 'MEDIUM',
                file: filePath,
                description: `Module has ${lines.length} lines`,
                suggestion: 'Consider breaking into smaller, focused modules',
                metrics: { lines: lines.length, functions: functionCount, classes: classCount }
            });
        }

        // Check for modules with too many responsibilities
        if (functionCount > 20) {
            this.violations.push({
                type: 'Too Many Functions',
                severity: 'MEDIUM',
                file: filePath,
                description: `Module has ${functionCount} functions`,
                suggestion: 'Split into multiple modules with single responsibilities',
                count: functionCount
            });
        }
    }

    detectMissingAbstractions(content, filePath) {
        // Look for hardcoded values that should be constants
        const hardcodedPatterns = [
            {
                name: 'Magic Numbers',
                regex: /\b(1000|5000|10000|30000|60000)\b/g,
                suggestion: 'Extract as named constants (TIMEOUT_MS, RETRY_DELAY_MS, etc.)'
            },
            {
                name: 'Hardcoded URLs',
                regex: /(https?:\/\/[^\s'"]+|\/api\/[^\s'"]+)/g,
                suggestion: 'Use configuration or URL builder utility'
            },
            {
                name: 'Hardcoded Selectors',
                regex: /['"`](#[\w-]+|\.[\w-]+|\[[\w-]+=)/g,
                suggestion: 'Define selectors as constants or use selector utility'
            }
        ];

        for (const pattern of hardcodedPatterns) {
            const matches = content.match(pattern.regex);
            if (matches && matches.length > 3) {
                this.violations.push({
                    type: 'Missing Abstraction',
                    severity: 'LOW',
                    file: filePath,
                    description: `${pattern.name} found ${matches.length} times`,
                    suggestion: pattern.suggestion,
                    examples: matches.slice(0, 3)
                });
            }
        }
    }

    analyzeErrorHandling(content, filePath) {
        // Look for inconsistent error handling patterns
        const errorPatterns = [
            {
                pattern: /catch\s*\([^)]*\)\s*\{\s*console\.(error|log)/g,
                issue: 'Console-only error handling'
            },
            {
                pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
                issue: 'Empty catch blocks'
            },
            {
                pattern: /throw\s+new\s+Error\s*\(\s*['"`][^'"`]*['"`]\s*\)/g,
                issue: 'Generic error messages'
            }
        ];

        for (const { pattern, issue } of errorPatterns) {
            const matches = content.match(pattern);
            if (matches && matches.length > 2) {
                this.violations.push({
                    type: 'Inconsistent Error Handling',
                    severity: 'MEDIUM',
                    file: filePath,
                    description: `${issue} found ${matches.length} times`,
                    suggestion: 'Use standardized error handling utility',
                    count: matches.length
                });
            }
        }
    }

    detectConfigurationDuplication(content, filePath) {
        // Look for repeated configuration patterns
        const configPatterns = [
            /timeout:\s*\d+/g,
            /retries:\s*\d+/g,
            /delay:\s*\d+/g,
            /port:\s*\d+/g
        ];

        let configCount = 0;
        for (const pattern of configPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                configCount += matches.length;
            }
        }

        if (configCount > 5) {
            this.violations.push({
                type: 'Configuration Duplication',
                severity: 'MEDIUM',
                file: filePath,
                description: `${configCount} configuration values found`,
                suggestion: 'Centralize configuration in dedicated config module',
                count: configCount
            });
        }
    }

    calculateSimilarity(str1, str2) {
        // Simple similarity calculation based on common lines
        const lines1 = str1.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const lines2 = str2.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        if (lines1.length === 0 || lines2.length === 0) return 0;
        
        let commonLines = 0;
        for (const line1 of lines1) {
            if (lines2.includes(line1) && line1.length > 10) {
                commonLines++;
            }
        }
        
        return commonLines / Math.max(lines1.length, lines2.length);
    }

    async generateReport() {
        console.log('\n📊 Generating DRY Audit Report...');

        // Categorize violations by severity
        const critical = this.violations.filter(v => v.severity === 'CRITICAL');
        const high = this.violations.filter(v => v.severity === 'HIGH');
        const medium = this.violations.filter(v => v.severity === 'MEDIUM');
        const low = this.violations.filter(v => v.severity === 'LOW');

        // Generate refactoring opportunities
        this.generateRefactoringOpportunities();

        const report = {
            summary: {
                totalViolations: this.violations.length,
                critical: critical.length,
                high: high.length,
                medium: medium.length,
                low: low.length,
                timestamp: new Date().toISOString()
            },
            violations: this.violations,
            refactoringOpportunities: this.refactoringOpportunities,
            recommendations: this.generateRecommendations()
        };

        // Write detailed report
        const reportPath = path.join(projectRoot, 'logs/dry-audit-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        // Print summary
        console.log('\n📋 DRY Audit Summary:');
        console.log(`🔴 Critical: ${critical.length}`);
        console.log(`🟠 High: ${high.length}`);
        console.log(`🟡 Medium: ${medium.length}`);
        console.log(`🟢 Low: ${low.length}`);
        console.log(`📄 Report saved: ${reportPath}`);

        return report;
    }

    generateRefactoringOpportunities() {
        // Analyze violations to suggest refactoring opportunities
        const patternCounts = new Map();
        
        for (const violation of this.violations) {
            const key = violation.type;
            if (!patternCounts.has(key)) {
                patternCounts.set(key, []);
            }
            patternCounts.get(key).push(violation);
        }

        for (const [pattern, violations] of patternCounts) {
            if (violations.length >= 3) {
                this.refactoringOpportunities.push({
                    opportunity: `Refactor ${pattern}`,
                    priority: violations[0].severity,
                    affectedFiles: violations.length,
                    description: `${violations.length} files have ${pattern} issues`,
                    suggestedAction: this.getSuggestedAction(pattern),
                    estimatedEffort: this.estimateEffort(violations.length),
                    files: violations.map(v => v.file)
                });
            }
        }
    }

    getSuggestedAction(pattern) {
        const actions = {
            'Repeated Pattern': 'Create utility functions to eliminate repetition',
            'Large Module': 'Break large modules into smaller, focused modules',
            'Missing Abstraction': 'Extract constants and configuration',
            'Inconsistent Error Handling': 'Implement standardized error handling',
            'Configuration Duplication': 'Create centralized configuration system',
            'Duplicate Function Logic': 'Extract common logic into shared utilities'
        };
        
        return actions[pattern] || 'Review and refactor as appropriate';
    }

    estimateEffort(fileCount) {
        if (fileCount <= 2) return 'Low (1-2 hours)';
        if (fileCount <= 5) return 'Medium (3-6 hours)';
        if (fileCount <= 10) return 'High (1-2 days)';
        return 'Very High (3+ days)';
    }

    generateRecommendations() {
        return [
            {
                category: 'Immediate Actions',
                items: [
                    'Create centralized logging utility to replace console.* calls',
                    'Implement safe DOM element selection utility',
                    'Create standardized error handling wrapper functions',
                    'Extract hardcoded configuration values to config files'
                ]
            },
            {
                category: 'Module Organization',
                items: [
                    'Break large modules (>500 lines) into smaller focused modules',
                    'Implement single responsibility principle for each module',
                    'Create clear module boundaries and interfaces',
                    'Establish consistent module naming conventions'
                ]
            },
            {
                category: 'Code Quality',
                items: [
                    'Extract duplicate logic into shared utility functions',
                    'Replace magic numbers with named constants',
                    'Standardize API client patterns across the application',
                    'Implement consistent event handling patterns'
                ]
            },
            {
                category: 'Long-term Improvements',
                items: [
                    'Consider implementing a plugin architecture for extensibility',
                    'Create comprehensive utility library for common operations',
                    'Establish code review guidelines focusing on DRY principles',
                    'Implement automated code quality checks in CI/CD'
                ]
            }
        ];
    }
}

// Execute audit
async function main() {
    console.log('🔍 PingOne Import Tool - DRY Audit');
    console.log('===================================\n');
    
    const auditor = new DRYAuditor();
    
    try {
        const results = await auditor.auditCodebase();
        
        console.log('\n🎯 Top Refactoring Opportunities:');
        results.refactoringOpportunities
            .sort((a, b) => b.affectedFiles - a.affectedFiles)
            .slice(0, 5)
            .forEach((opp, index) => {
                const priority = opp.priority === 'HIGH' ? '🔴' : 
                               opp.priority === 'MEDIUM' ? '🟡' : '🟢';
                console.log(`${index + 1}. ${priority} ${opp.opportunity} (${opp.affectedFiles} files, ${opp.estimatedEffort})`);
            });
        
        console.log('\n✅ DRY audit completed successfully!');
        console.log('📄 Check logs/dry-audit-report.json for detailed findings');
        
    } catch (error) {
        console.error('❌ DRY audit failed:', error.message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { DRYAuditor };
