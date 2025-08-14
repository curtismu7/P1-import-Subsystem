// Security Management API v7.3.0
// Provides endpoints for security monitoring, audit logs, and security configuration

const express = require('express');
const router = express.Router();

class SecurityManagementAPI {
    constructor(auditLogger, requestSigner, securityHardening) {
        this.auditLogger = auditLogger;
        this.requestSigner = requestSigner;
        this.securityHardening = securityHardening;
        this.setupRoutes();
    }

    setupRoutes() {
        // Get security overview
        router.get('/overview', (req, res) => {
            try {
                const overview = {
                    auditLogging: this.auditLogger ? this.auditLogger.getStats() : null,
                    requestSigning: this.requestSigner ? this.requestSigner.getStats() : null,
                    securityHardening: this.securityHardening ? this.securityHardening.getStats() : null,
                    systemSecurity: {
                        nodeVersion: process.version,
                        environment: process.env.NODE_ENV || 'development',
                        uptime: process.uptime(),
                        memoryUsage: process.memoryUsage()
                    }
                };

                res.json({
                    success: true,
                    data: overview,
                    timestamp: new Date().toISOString()
                });

                // Log security overview access
                if (this.auditLogger) {
                    this.auditLogger.logDataAccess(
                        req.user?.id || 'anonymous',
                        '/api/security/overview',
                        'VIEW_SECURITY_OVERVIEW',
                        'success',
                        { accessType: 'security_dashboard' },
                        req
                    );
                }

            } catch (error) {
                console.error('❌ Error getting security overview:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve security overview',
                    details: error.message
                });
            }
        });

        // Get audit logs
        router.get('/audit-logs', async (req, res) => {
            try {
                const criteria = {
                    eventType: req.query.eventType,
                    userId: req.query.userId,
                    result: req.query.result,
                    startTime: req.query.startTime,
                    endTime: req.query.endTime,
                    limit: parseInt(req.query.limit) || 100
                };

                const logs = this.auditLogger ? 
                    await this.auditLogger.searchLogs(criteria) : 
                    { success: false, error: 'Audit logger not available' };

                res.json({
                    success: logs.success,
                    data: logs.results || [],
                    total: logs.total || 0,
                    criteria,
                    timestamp: new Date().toISOString()
                });

                // Log audit log access
                if (this.auditLogger && logs.success) {
                    this.auditLogger.logDataAccess(
                        req.user?.id || 'anonymous',
                        '/api/security/audit-logs',
                        'VIEW_AUDIT_LOGS',
                        'success',
                        { 
                            searchCriteria: criteria,
                            resultsCount: logs.total || 0
                        },
                        req
                    );
                }

            } catch (error) {
                console.error('❌ Error retrieving audit logs:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve audit logs',
                    details: error.message
                });
            }
        });

        // Get security events (high-priority audit events)
        router.get('/security-events', async (req, res) => {
            try {
                const criteria = {
                    eventType: 'security_event',
                    startTime: req.query.startTime,
                    endTime: req.query.endTime,
                    limit: parseInt(req.query.limit) || 50
                };

                const events = this.auditLogger ? 
                    await this.auditLogger.searchLogs(criteria) : 
                    { success: false, error: 'Audit logger not available' };

                // Enhance events with severity analysis
                const enhancedEvents = events.results ? events.results.map(event => ({
                    ...event,
                    severity: this.analyzeSeverity(event),
                    riskScore: this.calculateRiskScore(event),
                    recommendations: this.getSecurityRecommendations(event)
                })) : [];

                res.json({
                    success: events.success,
                    data: enhancedEvents,
                    total: events.total || 0,
                    summary: this.generateSecurityEventSummary(enhancedEvents),
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error retrieving security events:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve security events',
                    details: error.message
                });
            }
        });

        // Test security configuration
        router.get('/test-configuration', (req, res) => {
            try {
                const tests = {
                    auditLogging: this.auditLogger ? {
                        status: 'ENABLED',
                        stats: this.auditLogger.getStats()
                    } : { status: 'DISABLED' },
                    
                    requestSigning: this.requestSigner ? {
                        status: 'ENABLED',
                        stats: this.requestSigner.getStats()
                    } : { status: 'DISABLED' },
                    
                    securityHardening: this.securityHardening ? {
                        status: 'ENABLED',
                        test: this.securityHardening.testConfiguration()
                    } : { status: 'DISABLED' }
                };

                const overallStatus = Object.values(tests).every(test => test.status === 'ENABLED') ? 
                    'SECURE' : 'NEEDS_ATTENTION';

                res.json({
                    success: true,
                    data: {
                        overallStatus,
                        components: tests,
                        recommendations: this.generateConfigurationRecommendations(tests)
                    },
                    timestamp: new Date().toISOString()
                });

                // Log security configuration test
                if (this.auditLogger) {
                    this.auditLogger.logSystemOperation(
                        'SECURITY_CONFIGURATION_TEST',
                        'success',
                        { 
                            overallStatus,
                            componentsEnabled: Object.keys(tests).filter(k => tests[k].status === 'ENABLED').length
                        },
                        req
                    );
                }

            } catch (error) {
                console.error('❌ Error testing security configuration:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to test security configuration',
                    details: error.message
                });
            }
        });

        // Generate security report
        router.get('/security-report', async (req, res) => {
            try {
                const timeRange = req.query.timeRange || '24h';
                const startTime = this.calculateStartTime(timeRange);

                // Gather security data
                const auditStats = this.auditLogger ? this.auditLogger.getStats() : null;
                const securityEvents = this.auditLogger ? 
                    await this.auditLogger.searchLogs({
                        eventType: 'security_event',
                        startTime: startTime.toISOString(),
                        limit: 1000
                    }) : { results: [] };

                const authEvents = this.auditLogger ? 
                    await this.auditLogger.searchLogs({
                        eventType: 'authentication',
                        startTime: startTime.toISOString(),
                        limit: 1000
                    }) : { results: [] };

                // Generate comprehensive report
                const report = {
                    reportPeriod: {
                        timeRange,
                        startTime: startTime.toISOString(),
                        endTime: new Date().toISOString()
                    },
                    summary: {
                        totalEvents: auditStats?.totalEvents || 0,
                        securityEvents: securityEvents.results?.length || 0,
                        authenticationEvents: authEvents.results?.length || 0,
                        failedAuthentications: authEvents.results?.filter(e => e.result === 'failure').length || 0
                    },
                    securityAnalysis: {
                        threatLevel: this.calculateThreatLevel(securityEvents.results || []),
                        commonThreats: this.identifyCommonThreats(securityEvents.results || []),
                        suspiciousIPs: this.identifySuspiciousIPs(securityEvents.results || []),
                        recommendations: this.generateSecurityRecommendations(securityEvents.results || [])
                    },
                    systemHealth: {
                        auditLogging: auditStats ? 'HEALTHY' : 'DISABLED',
                        requestSigning: this.requestSigner ? 'ENABLED' : 'DISABLED',
                        securityHardening: this.securityHardening ? 'ENABLED' : 'DISABLED'
                    }
                };

                res.json({
                    success: true,
                    data: report,
                    timestamp: new Date().toISOString()
                });

                // Log security report generation
                if (this.auditLogger) {
                    this.auditLogger.logSystemOperation(
                        'SECURITY_REPORT_GENERATED',
                        'success',
                        { 
                            timeRange,
                            eventsAnalyzed: report.summary.totalEvents,
                            threatLevel: report.securityAnalysis.threatLevel
                        },
                        req
                    );
                }

            } catch (error) {
                console.error('❌ Error generating security report:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to generate security report',
                    details: error.message
                });
            }
        });

        // Clear audit logs (admin only)
        router.post('/clear-audit-logs', (req, res) => {
            try {
                // This would typically require admin authentication
                // For now, we'll just log the attempt
                if (this.auditLogger) {
                    this.auditLogger.logSystemOperation(
                        'AUDIT_LOG_CLEAR_REQUESTED',
                        'success',
                        { 
                            requestedBy: req.user?.id || 'anonymous',
                            reason: req.body.reason || 'not_specified'
                        },
                        req
                    );
                }

                res.json({
                    success: true,
                    message: 'Audit log clear request logged. Manual intervention required.',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error processing audit log clear request:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to process audit log clear request',
                    details: error.message
                });
            }
        });
    }

    // Helper methods for security analysis
    analyzeSeverity(event) {
        if (event.eventType === 'security_event') {
            return event.details?.severity || 'medium';
        }
        if (event.result === 'failure' && event.eventType === 'authentication') {
            return 'high';
        }
        if (event.result === 'denied') {
            return 'medium';
        }
        return 'low';
    }

    calculateRiskScore(event) {
        let score = 0;
        
        // Base score by event type
        const eventScores = {
            'security_event': 50,
            'authentication': 30,
            'authorization': 25,
            'data_modification': 40,
            'system_operation': 20
        };
        
        score += eventScores[event.eventType] || 10;
        
        // Adjust by result
        if (event.result === 'failure') score += 30;
        if (event.result === 'denied') score += 20;
        if (event.result === 'suspicious') score += 40;
        
        return Math.min(score, 100);
    }

    getSecurityRecommendations(event) {
        const recommendations = [];
        
        if (event.eventType === 'authentication' && event.result === 'failure') {
            recommendations.push('Monitor for brute force attacks');
            recommendations.push('Consider implementing account lockout');
        }
        
        if (event.eventType === 'security_event') {
            recommendations.push('Investigate potential security threat');
            recommendations.push('Review access logs for this IP');
        }
        
        return recommendations;
    }

    generateSecurityEventSummary(events) {
        const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
        const typeCounts = {};
        
        events.forEach(event => {
            const severity = this.analyzeSeverity(event);
            severityCounts[severity] = (severityCounts[severity] || 0) + 1;
            
            typeCounts[event.eventType] = (typeCounts[event.eventType] || 0) + 1;
        });
        
        return {
            totalEvents: events.length,
            severityDistribution: severityCounts,
            typeDistribution: typeCounts,
            averageRiskScore: events.length > 0 ? 
                events.reduce((sum, e) => sum + this.calculateRiskScore(e), 0) / events.length : 0
        };
    }

    generateConfigurationRecommendations(tests) {
        const recommendations = [];
        
        if (tests.auditLogging.status === 'DISABLED') {
            recommendations.push({
                priority: 'HIGH',
                title: 'Enable Audit Logging',
                description: 'Audit logging is disabled. Enable it for security monitoring.'
            });
        }
        
        if (tests.requestSigning.status === 'DISABLED') {
            recommendations.push({
                priority: 'MEDIUM',
                title: 'Enable Request Signing',
                description: 'Request signing provides additional API security.'
            });
        }
        
        if (tests.securityHardening.status === 'DISABLED') {
            recommendations.push({
                priority: 'HIGH',
                title: 'Enable Security Hardening',
                description: 'Security hardening middleware provides essential protections.'
            });
        }
        
        return recommendations;
    }

    calculateStartTime(timeRange) {
        const now = new Date();
        const ranges = {
            '1h': 3600000,
            '24h': 86400000,
            '7d': 604800000,
            '30d': 2592000000
        };
        
        const ms = ranges[timeRange] || ranges['24h'];
        return new Date(now.getTime() - ms);
    }

    calculateThreatLevel(events) {
        if (events.length === 0) return 'LOW';
        
        const highRiskEvents = events.filter(e => this.calculateRiskScore(e) > 70);
        const mediumRiskEvents = events.filter(e => this.calculateRiskScore(e) > 40);
        
        if (highRiskEvents.length > 5) return 'CRITICAL';
        if (highRiskEvents.length > 2) return 'HIGH';
        if (mediumRiskEvents.length > 10) return 'MEDIUM';
        return 'LOW';
    }

    identifyCommonThreats(events) {
        const threats = {};
        events.forEach(event => {
            if (event.details?.threats) {
                event.details.threats.forEach(threat => {
                    threats[threat.name] = (threats[threat.name] || 0) + 1;
                });
            }
        });
        
        return Object.entries(threats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
    }

    identifySuspiciousIPs(events) {
        const ipCounts = {};
        events.forEach(event => {
            if (event.ip) {
                ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
            }
        });
        
        return Object.entries(ipCounts)
            .filter(([,count]) => count > 5)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([ip, count]) => ({ ip, count }));
    }

    generateSecurityRecommendations(events) {
        const recommendations = [];
        
        const failedAuths = events.filter(e => 
            e.eventType === 'authentication' && e.result === 'failure'
        );
        
        if (failedAuths.length > 10) {
            recommendations.push({
                priority: 'HIGH',
                title: 'High Authentication Failure Rate',
                description: 'Multiple authentication failures detected. Consider implementing rate limiting.'
            });
        }
        
        const suspiciousIPs = this.identifySuspiciousIPs(events);
        if (suspiciousIPs.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                title: 'Suspicious IP Activity',
                description: `${suspiciousIPs.length} IPs showing suspicious activity patterns.`
            });
        }
        
        return recommendations;
    }

    getRouter() {
        return router;
    }
}

module.exports = { SecurityManagementAPI };
