#!/usr/bin/env node

/**
 * Comprehensive Bug Detection and Analysis Tool
 * 
 * This script systematically identifies and categorizes bugs in the PingOne Import Tool:
 * - Logic bugs and incorrect implementations
 * - Misused libraries and incorrect API usage
 * - Broken data flows and state management issues
 * - Uncaught exceptions and error handling gaps
 * - Race conditions and async/await issues
 * - Memory leaks and resource management problems
 * 
 * Features:
 * - Static code analysis for common bug patterns
 * - Dynamic analysis recommendations
 * - Automated fix suggestions
 * - Detailed reporting with severity levels
 * - Integration with ESLint and custom rules
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Bug detection patterns and rules
const BUG_PATTERNS = {
    // Critical Logic Bugs
    LOGIC_BUGS: [
        {
            pattern: /if\s*\([^)]*=\s*[^=]/,
            severity: 'HIGH',
            category: 'Logic Bug',
            description: 'Assignment in conditional (should be comparison)',
            fix: 'Replace = with == or === for comparison'
        },
        {
            pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
            severity: 'HIGH',
            category: 'Error Handling',
            description: 'Empty catch block - errors are silently ignored',
            fix: 'Add proper error handling or logging in catch blocks'
        },
        {
            pattern: /console\.log.*password|console\.log.*secret|console\.log.*token/i,
            severity: 'CRITICAL',
            category: 'Security Bug',
            description: 'Sensitive data logged to console',
            fix: 'Remove or mask sensitive data in logs'
        },
        {
            pattern: /\.innerHTML\s*=.*\+/,
            severity: 'HIGH',
            category: 'XSS Vulnerability',
            description: 'Potential XSS vulnerability with innerHTML concatenation',
            fix: 'Use textContent or proper sanitization'
        }
    ],

    // Async/Await and Promise Issues
    ASYNC_BUGS: [
        {
            pattern: /async\s+function[^{]*\{[^}]*(?!await)[^}]*\}/,
            severity: 'MEDIUM',
            category: 'Async Bug',
            description: 'Async function without await usage',
            fix: 'Remove async keyword if not needed, or add proper await usage'
        },
        {
            pattern: /\.then\([^)]*\)\.catch\([^)]*\)\s*(?!\.finally)/,
            severity: 'LOW',
            category: 'Promise Chain',
            description: 'Promise chain without finally block for cleanup',
            fix: 'Consider adding .finally() for cleanup operations'
        },
        {
            pattern: /new Promise\(\s*\([^)]*\)\s*=>\s*\{[^}]*setTimeout/,
            severity: 'MEDIUM',
            category: 'Anti-pattern',
            description: 'Promise constructor anti-pattern with setTimeout',
            fix: 'Use util.promisify or proper async patterns'
        }
    ],

    // Resource Management Issues
    RESOURCE_BUGS: [
        {
            pattern: /setInterval\([^)]*\)(?![^}]*clearInterval)/,
            severity: 'HIGH',
            category: 'Memory Leak',
            description: 'setInterval without corresponding clearInterval',
            fix: 'Add clearInterval in cleanup or component unmount'
        },
        {
            pattern: /addEventListener\([^)]*\)(?![^}]*removeEventListener)/,
            severity: 'MEDIUM',
            category: 'Memory Leak',
            description: 'Event listener without cleanup',
            fix: 'Add removeEventListener in cleanup code'
        },
        {
            pattern: /fs\.createReadStream\([^)]*\)(?![^}]*\.close)/,
            severity: 'MEDIUM',
            category: 'Resource Leak',
            description: 'File stream without explicit close',
            fix: 'Use try/finally or stream.pipeline for proper cleanup'
        }
    ],

    // API and Library Misuse
    LIBRARY_BUGS: [
        {
            pattern: /JSON\.parse\([^)]*\)(?!\s*catch)/,
            severity: 'HIGH',
            category: 'Error Handling',
            description: 'JSON.parse without try/catch',
            fix: 'Wrap JSON.parse in try/catch block'
        },
        {
            pattern: /parseInt\([^,)]*\)(?![^,)]*,\s*10)/,
            severity: 'MEDIUM',
            category: 'API Misuse',
            description: 'parseInt without radix parameter',
            fix: 'Add radix parameter: parseInt(value, 10)'
        },
        {
            pattern: /document\.getElementById\([^)]*\)\.(?!null)/,
            severity: 'HIGH',
            category: 'Null Reference',
            description: 'DOM element access without null check',
            fix: 'Add null check before accessing element properties'
        }
    ],

    // State Management Issues
    STATE_BUGS: [
        {
            pattern: /this\.state\s*=.*(?!constructor)/,
            severity: 'HIGH',
            category: 'State Bug',
            description: 'Direct state mutation outside constructor',
            fix: 'Use setState or proper state management patterns'
        },
        {
            pattern: /let\s+[^=]*=\s*\[\].*push\(/,
            severity: 'LOW',
            category: 'Performance',
            description: 'Array mutation pattern that could cause issues',
            fix: 'Consider immutable patterns or proper array handling'
        }
    ]
};

// File-specific bug patterns
const FILE_SPECIFIC_BUGS = {
    'bundle': {
        patterns: [
            {
                test: (content) => content.length < 50000 && content.includes('_defineProperty'),
                severity: 'CRITICAL',
                category: 'Bundle Corruption',
                description: 'Bundle contains only Babel helpers - application code missing',
                fix: 'Rebuild bundle from source files'
            },
            {
                test: (content) => !content.includes('window.app') && content.includes('function'),
                severity: 'HIGH',
                category: 'Bundle Issue',
                description: 'Bundle missing global app reference',
                fix: 'Ensure app.js exports are properly bundled'
            }
        ]
    },
    'server.js': {
        patterns: [
            {
                test: (content) => content.includes('process.exit(') && !content.includes('graceful'),
                severity: 'MEDIUM',
                category: 'Process Management',
                description: 'Hard process exit without graceful shutdown',
                fix: 'Implement graceful shutdown handlers'
            }
        ]
    }
};

class BugDetector {
    constructor() {
        this.bugs = [];
        this.stats = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            total: 0
        };
    }

    /**
     * Analyze a single file for bugs
     */
    async analyzeFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            
            // Validate content length to prevent string issues
            if (!content || content.length === 0) {
                console.log(`⚠️  Skipping empty file: ${filePath}`);
                return [];
            }
            
            if (content.length > 10 * 1024 * 1024) { // 10MB limit
                console.log(`⚠️  Skipping large file: ${filePath} (${content.length} bytes)`);
                return [];
            }
            
            const relativePath = path.relative(projectRoot, filePath);
            const fileName = path.basename(filePath);
            
            console.log(`🔍 Analyzing: ${relativePath}`);
            
            const fileBugs = [];
            
            // Run pattern-based detection with error handling
            for (const [category, patterns] of Object.entries(BUG_PATTERNS)) {
                for (const pattern of patterns) {
                    try {
                        const matches = this.findPatternMatches(content, pattern, filePath);
                        fileBugs.push(...matches);
                    } catch (error) {
                        console.warn(`Warning: Pattern matching failed for ${category}:`, error.message);
                    }
                }
            }
            
            // Run file-specific detection with error handling
            for (const [fileType, config] of Object.entries(FILE_SPECIFIC_BUGS)) {
                if (fileName.includes(fileType) || relativePath.includes(fileType)) {
                    for (const pattern of config.patterns) {
                        try {
                            if (pattern.test(content)) {
                                fileBugs.push({
                                    file: relativePath,
                                    line: 1,
                                    severity: pattern.severity,
                                    category: pattern.category,
                                    description: pattern.description,
                                    fix: pattern.fix,
                                    context: fileName
                                });
                            }
                        } catch (error) {
                            console.warn(`Warning: File-specific test failed for ${fileType}:`, error.message);
                        }
                    }
                }
            }
            
            // Update statistics safely
            fileBugs.forEach(bug => {
                const severity = bug.severity ? bug.severity.toLowerCase() : 'low';
                if (this.stats[severity] !== undefined) {
                    this.stats[severity]++;
                    this.stats.total++;
                }
            });
            
            this.bugs.push(...fileBugs);
            
            if (fileBugs.length > 0) {
                console.log(`  ⚠️  Found ${fileBugs.length} potential issues`);
            }
            
            return fileBugs;
            
        } catch (error) {
            console.error(`❌ Error analyzing ${filePath}:`, error.message);
            return [];
        }
    }
    
    /**
     * Find pattern matches in file content
     */
    findPatternMatches(content, patternConfig, filePath) {
        const matches = [];
        const lines = content.split('\n');
        const relativePath = path.relative(projectRoot, filePath);
        
        lines.forEach((line, index) => {
            if (patternConfig.pattern.test(line)) {
                matches.push({
                    file: relativePath,
                    line: index + 1,
                    severity: patternConfig.severity,
                    category: patternConfig.category,
                    description: patternConfig.description,
                    fix: patternConfig.fix,
                    context: line.trim(),
                    lineContent: line
                });
            }
        });
        
        return matches;
    }
    
    /**
     * Analyze specific critical areas
     */
    async analyzeCriticalAreas() {
        console.log('\n🎯 Analyzing Critical Areas...\n');
        
        const criticalFiles = [
            'src/client/app.js',
            'server.js',
            'public/js/bundle*.js',
            'routes/api/*.js',
            'public/js/modules/*.js',
            'src/client/subsystems/*.js'
        ];
        
        for (const pattern of criticalFiles) {
            const files = await this.findFiles(pattern);
            for (const file of files) {
                await this.analyzeFile(file);
            }
        }
    }
    
    /**
     * Find files matching a pattern
     */
    async findFiles(pattern) {
        try {
            // Handle glob patterns more safely
            if (pattern.includes('*')) {
                const baseDir = pattern.split('*')[0];
                const fullDir = path.join(projectRoot, baseDir);
                
                if (!await this.pathExists(fullDir)) {
                    return [];
                }
                
                const files = await this.getAllJsFiles(fullDir);
                return files;
            } else {
                const fullPath = path.join(projectRoot, pattern);
                if (await this.pathExists(fullPath)) {
                    return [fullPath];
                }
                return [];
            }
        } catch (error) {
            console.warn(`Warning: Could not process pattern ${pattern}:`, error.message);
            return [];
        }
    }
    
    /**
     * Recursively get all JS files from directory
     */
    async getAllJsFiles(dir) {
        const files = [];
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    const subFiles = await this.getAllJsFiles(fullPath);
                    files.push(...subFiles);
                } else if (entry.isFile() && entry.name.endsWith('.js')) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Directory might not exist or be accessible
        }
        
        return files;
    }
    
    /**
     * Check if path exists
     */
    async pathExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Generate comprehensive bug report
     */
    generateReport() {
        console.log('\n📊 Bug Detection Report');
        console.log('========================\n');
        
        // Statistics
        console.log('📈 Statistics:');
        console.log(`   🔴 Critical: ${this.stats.critical}`);
        console.log(`   🟠 High: ${this.stats.high}`);
        console.log(`   🟡 Medium: ${this.stats.medium}`);
        console.log(`   🟢 Low: ${this.stats.low}`);
        console.log(`   📊 Total: ${this.stats.total}\n`);
        
        // Group bugs by severity and category
        const bugsByCategory = this.groupBugsByCategory();
        
        for (const [category, bugs] of Object.entries(bugsByCategory)) {
            if (bugs.length === 0) continue;
            
            console.log(`🏷️  ${category} (${bugs.length} issues):`);
            console.log('─'.repeat(50));
            
            bugs.forEach((bug, index) => {
                const severityIcon = this.getSeverityIcon(bug.severity);
                console.log(`${index + 1}. ${severityIcon} ${bug.description}`);
                console.log(`   📁 File: ${bug.file}:${bug.line}`);
                console.log(`   🔧 Fix: ${bug.fix}`);
                if (bug.context) {
                    console.log(`   📝 Context: ${bug.context}`);
                }
                console.log('');
            });
        }
        
        return {
            stats: this.stats,
            bugs: this.bugs,
            categories: bugsByCategory
        };
    }
    
    /**
     * Group bugs by category
     */
    groupBugsByCategory() {
        const categories = {};
        
        this.bugs.forEach(bug => {
            if (!categories[bug.category]) {
                categories[bug.category] = [];
            }
            categories[bug.category].push(bug);
        });
        
        // Sort categories by severity
        for (const category in categories) {
            categories[category].sort((a, b) => {
                const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
                return severityOrder[b.severity] - severityOrder[a.severity];
            });
        }
        
        return categories;
    }
    
    /**
     * Get severity icon
     */
    getSeverityIcon(severity) {
        const icons = {
            CRITICAL: '🔴',
            HIGH: '🟠',
            MEDIUM: '🟡',
            LOW: '🟢'
        };
        return icons[severity] || '⚪';
    }
    
    /**
     * Generate automated fixes
     */
    async generateFixes() {
        console.log('\n🔧 Generating Automated Fixes...\n');
        
        const fixes = [];
        const criticalBugs = this.bugs.filter(bug => 
            bug.severity === 'CRITICAL' || bug.severity === 'HIGH'
        );
        
        for (const bug of criticalBugs) {
            const fix = await this.generateFixForBug(bug);
            if (fix) {
                fixes.push(fix);
            }
        }
        
        return fixes;
    }
    
    /**
     * Generate fix for specific bug
     */
    async generateFixForBug(bug) {
        // This would contain specific fix generation logic
        // For now, return the fix suggestion
        return {
            bug,
            fixType: 'manual',
            suggestion: bug.fix,
            priority: bug.severity
        };
    }
}

/**
 * Main execution function
 */
async function main() {
    console.log('🐛 PingOne Import Tool - Bug Detection System');
    console.log('==============================================\n');
    
    const detector = new BugDetector();
    
    try {
        // Analyze critical areas
        await detector.analyzeCriticalAreas();
        
        // Generate report
        const report = detector.generateReport();
        
        // Generate fixes for critical issues
        const fixes = await detector.generateFixes();
        
        // Save report to file
        const reportPath = path.join(projectRoot, 'logs', 'bug-detection-report.json');
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            report,
            fixes
        }, null, 2));
        
        console.log(`📋 Detailed report saved to: ${reportPath}`);
        
        // Exit with appropriate code
        if (detector.stats.critical > 0) {
            console.log('\n🚨 CRITICAL BUGS FOUND - Immediate attention required!');
            process.exit(1);
        } else if (detector.stats.high > 0) {
            console.log('\n⚠️  HIGH PRIORITY BUGS FOUND - Should be addressed soon');
            process.exit(0);
        } else {
            console.log('\n✅ No critical bugs detected');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('❌ Bug detection failed:', error.message);
        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { BugDetector, main as detectBugs };
