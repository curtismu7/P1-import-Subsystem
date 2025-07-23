#!/usr/bin/env node

/**
 * Module Breakdown Plan for PingOne Import Tool
 * 
 * Addresses the 61 large modules identified in the DRY audit by creating
 * a systematic plan to break them into smaller, focused modules following
 * single responsibility principle.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class ModuleBreakdownPlanner {
    constructor() {
        this.breakdownPlans = [];
        this.logger = console;
    }

    async createBreakdownPlan() {
        console.log('📋 Creating Module Breakdown Plan...\n');

        // Priority modules to break down (from DRY audit)
        const priorityModules = [
            {
                file: 'src/client/app.js',
                lines: 1840,
                priority: 'CRITICAL',
                reason: 'Main application file - too many responsibilities'
            },
            {
                file: 'src/client/components/analytics-dashboard-ui.js',
                lines: 1028,
                priority: 'HIGH',
                reason: 'Large UI component - needs component breakdown'
            },
            {
                file: 'public/js/app.js',
                lines: 257837,
                priority: 'CRITICAL',
                reason: 'Massive bundled file - likely contains duplicated code'
            }
        ];

        for (const module of priorityModules) {
            await this.analyzeModuleForBreakdown(module);
        }

        await this.generateBreakdownReport();
        return this.breakdownPlans;
    }

    async analyzeModuleForBreakdown(moduleInfo) {
        const { file, lines, priority, reason } = moduleInfo;
        console.log(`🔍 Analyzing ${file} (${lines} lines)...`);

        try {
            const filePath = path.join(projectRoot, file);
            const content = await fs.readFile(filePath, 'utf8');
            
            const breakdown = this.createBreakdownStrategy(file, content, priority);
            this.breakdownPlans.push({
                originalFile: file,
                lines,
                priority,
                reason,
                breakdown,
                estimatedEffort: this.estimateBreakdownEffort(breakdown)
            });

        } catch (error) {
            console.warn(`⚠️  Could not analyze ${file}: ${error.message}`);
        }
    }

    createBreakdownStrategy(filePath, content, priority) {
        const fileName = path.basename(filePath, '.js');
        
        // Different strategies based on file type
        if (filePath.includes('app.js') && filePath.includes('src/client')) {
            return this.createAppBreakdownStrategy(content);
        } else if (filePath.includes('analytics-dashboard')) {
            return this.createUIComponentBreakdownStrategy(content);
        } else if (filePath.includes('public/js/app.js')) {
            return this.createBundleBreakdownStrategy(content);
        } else {
            return this.createGenericBreakdownStrategy(fileName, content);
        }
    }

    createAppBreakdownStrategy(content) {
        return {
            strategy: 'Main Application Decomposition',
            newModules: [
                {
                    name: 'app-core.js',
                    responsibility: 'Core application initialization and lifecycle',
                    extractFrom: ['constructor', 'init', 'start', 'stop'],
                    estimatedLines: 200
                },
                {
                    name: 'subsystem-manager.js',
                    responsibility: 'Subsystem initialization and management',
                    extractFrom: ['initializeSubsystems', 'subsystem creation'],
                    estimatedLines: 300
                },
                {
                    name: 'ui-coordinator.js',
                    responsibility: 'UI initialization and coordination',
                    extractFrom: ['UI setup', 'view management', 'element binding'],
                    estimatedLines: 250
                },
                {
                    name: 'event-coordinator.js',
                    responsibility: 'Global event handling and coordination',
                    extractFrom: ['event listeners', 'event handlers'],
                    estimatedLines: 200
                },
                {
                    name: 'settings-coordinator.js',
                    responsibility: 'Settings management and persistence',
                    extractFrom: ['settings loading', 'settings saving'],
                    estimatedLines: 150
                },
                {
                    name: 'authentication-coordinator.js',
                    responsibility: 'Authentication flow coordination',
                    extractFrom: ['token management', 'auth setup'],
                    estimatedLines: 180
                }
            ],
            refactoringSteps: [
                '1. Extract core initialization logic',
                '2. Move subsystem management to dedicated module',
                '3. Separate UI coordination concerns',
                '4. Extract event handling patterns',
                '5. Isolate settings management',
                '6. Create authentication coordinator',
                '7. Update main app.js to use coordinators',
                '8. Test integration and functionality'
            ]
        };
    }

    createUIComponentBreakdownStrategy(content) {
        return {
            strategy: 'UI Component Decomposition',
            newModules: [
                {
                    name: 'analytics-chart-components.js',
                    responsibility: 'Chart rendering and data visualization',
                    extractFrom: ['chart creation', 'data formatting'],
                    estimatedLines: 200
                },
                {
                    name: 'analytics-data-manager.js',
                    responsibility: 'Data fetching and processing',
                    extractFrom: ['API calls', 'data transformation'],
                    estimatedLines: 150
                },
                {
                    name: 'analytics-ui-controls.js',
                    responsibility: 'UI controls and interactions',
                    extractFrom: ['buttons', 'filters', 'controls'],
                    estimatedLines: 180
                },
                {
                    name: 'analytics-layout-manager.js',
                    responsibility: 'Layout and responsive design',
                    extractFrom: ['layout logic', 'responsive handling'],
                    estimatedLines: 120
                }
            ],
            refactoringSteps: [
                '1. Extract chart components',
                '2. Separate data management logic',
                '3. Create UI controls module',
                '4. Extract layout management',
                '5. Create main analytics coordinator',
                '6. Update imports and dependencies',
                '7. Test component integration'
            ]
        };
    }

    createBundleBreakdownStrategy(content) {
        return {
            strategy: 'Bundle Analysis and Cleanup',
            newModules: [
                {
                    name: 'ANALYSIS_NEEDED',
                    responsibility: 'Bundle appears to be generated - needs analysis',
                    extractFrom: ['Analyze bundle contents'],
                    estimatedLines: 'Unknown'
                }
            ],
            refactoringSteps: [
                '1. Analyze bundle contents for duplicate code',
                '2. Identify source modules contributing to size',
                '3. Remove unused dependencies',
                '4. Optimize build process',
                '5. Implement code splitting if needed'
            ]
        };
    }

    createGenericBreakdownStrategy(fileName, content) {
        // Analyze content for common patterns
        const functionCount = (content.match(/function\s+\w+/g) || []).length;
        const classCount = (content.match(/class\s+\w+/g) || []).length;
        
        return {
            strategy: 'Generic Module Decomposition',
            newModules: [
                {
                    name: `${fileName}-core.js`,
                    responsibility: 'Core functionality',
                    estimatedLines: Math.floor(content.split('\n').length * 0.4)
                },
                {
                    name: `${fileName}-utils.js`,
                    responsibility: 'Utility functions',
                    estimatedLines: Math.floor(content.split('\n').length * 0.3)
                },
                {
                    name: `${fileName}-config.js`,
                    responsibility: 'Configuration and constants',
                    estimatedLines: Math.floor(content.split('\n').length * 0.3)
                }
            ],
            refactoringSteps: [
                '1. Identify core vs utility functions',
                '2. Extract configuration values',
                '3. Create separate modules',
                '4. Update imports and exports',
                '5. Test functionality'
            ]
        };
    }

    estimateBreakdownEffort(breakdown) {
        const moduleCount = breakdown.newModules.length;
        const stepCount = breakdown.refactoringSteps.length;
        
        if (moduleCount <= 2) return 'Low (4-8 hours)';
        if (moduleCount <= 4) return 'Medium (1-2 days)';
        if (moduleCount <= 6) return 'High (2-4 days)';
        return 'Very High (1+ weeks)';
    }

    async generateBreakdownReport() {
        console.log('\n📊 Generating Module Breakdown Report...');

        const report = {
            summary: {
                totalModules: this.breakdownPlans.length,
                totalNewModules: this.breakdownPlans.reduce((sum, plan) => sum + plan.breakdown.newModules.length, 0),
                priorityBreakdown: this.getPriorityBreakdown(),
                timestamp: new Date().toISOString()
            },
            breakdownPlans: this.breakdownPlans,
            implementationPriority: this.getImplementationPriority(),
            recommendations: this.getRecommendations()
        };

        // Write report
        const reportPath = path.join(projectRoot, 'logs/module-breakdown-plan.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        // Print summary
        console.log('\n📋 Module Breakdown Summary:');
        console.log(`🔴 Critical Priority: ${report.summary.priorityBreakdown.CRITICAL || 0}`);
        console.log(`🟠 High Priority: ${report.summary.priorityBreakdown.HIGH || 0}`);
        console.log(`🟡 Medium Priority: ${report.summary.priorityBreakdown.MEDIUM || 0}`);
        console.log(`📄 Report saved: ${reportPath}`);

        return report;
    }

    getPriorityBreakdown() {
        const breakdown = {};
        for (const plan of this.breakdownPlans) {
            breakdown[plan.priority] = (breakdown[plan.priority] || 0) + 1;
        }
        return breakdown;
    }

    getImplementationPriority() {
        return [
            {
                phase: 'Phase 1: Critical Infrastructure',
                modules: ['src/client/app.js'],
                rationale: 'Core application file affects entire system',
                estimatedTime: '1-2 weeks'
            },
            {
                phase: 'Phase 2: UI Components',
                modules: ['analytics-dashboard-ui.js'],
                rationale: 'Large UI components impact user experience',
                estimatedTime: '3-5 days'
            },
            {
                phase: 'Phase 3: Bundle Optimization',
                modules: ['public/js/app.js'],
                rationale: 'Bundle size affects performance',
                estimatedTime: '1-2 days'
            }
        ];
    }

    getRecommendations() {
        return [
            {
                category: 'Immediate Actions',
                items: [
                    'Start with app.js breakdown - highest impact',
                    'Create utility modules first (logger, DOM, error handling)',
                    'Establish module naming conventions',
                    'Set up automated testing for refactored modules'
                ]
            },
            {
                category: 'Best Practices',
                items: [
                    'Follow single responsibility principle',
                    'Keep modules under 300 lines when possible',
                    'Use clear, descriptive module names',
                    'Document module interfaces and dependencies'
                ]
            },
            {
                category: 'Quality Assurance',
                items: [
                    'Test each module independently',
                    'Verify integration after breakdown',
                    'Monitor performance impact',
                    'Update documentation and comments'
                ]
            }
        ];
    }
}

// Execute planning
async function main() {
    console.log('📋 PingOne Import Tool - Module Breakdown Planning');
    console.log('=================================================\n');
    
    const planner = new ModuleBreakdownPlanner();
    
    try {
        const plans = await planner.createBreakdownPlan();
        
        console.log('\n🎯 Top Priority Breakdowns:');
        plans
            .filter(plan => plan.priority === 'CRITICAL')
            .forEach((plan, index) => {
                console.log(`${index + 1}. ${plan.originalFile} (${plan.lines} lines)`);
                console.log(`   Strategy: ${plan.breakdown.strategy}`);
                console.log(`   New Modules: ${plan.breakdown.newModules.length}`);
                console.log(`   Effort: ${plan.estimatedEffort}`);
            });
        
        console.log('\n✅ Module breakdown planning completed!');
        console.log('📄 Check logs/module-breakdown-plan.json for detailed plans');
        
    } catch (error) {
        console.error('❌ Module breakdown planning failed:', error.message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { ModuleBreakdownPlanner };
