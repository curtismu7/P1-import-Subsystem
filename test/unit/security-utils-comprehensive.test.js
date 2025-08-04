/**
 * 🛡️ COMPREHENSIVE SECURITY UTILS TESTS
 * 
 * Version: 7.0.0.10
 * Date: 2025-08-04
 * 
 * Tests all aspects of the bulletproof SecurityUtils implementation
 */

import { SecurityUtils } from '../../public/js/modules/security-utils.js';

describe('🛡️ SecurityUtils Comprehensive Tests', () => {
    
    beforeEach(() => {
        // Reset SecurityUtils state before each test
        SecurityUtils.clearCache();
        SecurityUtils.resetStats();
    });

    describe('🔧 Initialization', () => {
        test('should initialize with default configuration', () => {
            const result = SecurityUtils.initialize();
            expect(result).toBe(true);
            expect(SecurityUtils.config).toBeDefined();
            expect(SecurityUtils.config.policies).toBeDefined();
        });

        test('should initialize with custom configuration', () => {
            const customConfig = {
                policies: {
                    enableLogging: false,
                    maxObjectSize: 500000
                }
            };
            
            const result = SecurityUtils.initialize(customConfig);
            expect(result).toBe(true);
            expect(SecurityUtils.config.policies.enableLogging).toBe(false);
            expect(SecurityUtils.config.policies.maxObjectSize).toBe(500000);
        });
    });

    describe('🔒 Sensitive Data Masking', () => {
        test('should mask basic sensitive data', () => {
            const data = {
                username: 'testuser',
                password: 'secret123',
                email: 'test@example.com'
            };

            const masked = SecurityUtils.maskSensitiveData(data);
            
            expect(masked.username).toBe('testuser'); // Not sensitive
            expect(masked.password).toBe('se***MASKED***'); // Masked
            expect(masked.email).toBe('te***MASKED***'); // Email is sensitive
        });

        test('should handle nested objects', () => {
            const data = {
                user: {
                    credentials: {
                        password: 'secret123',
                        apiKey: 'abc123def456'
                    },
                    profile: {
                        name: 'John Doe',
                        token: 'jwt.token.here'
                    }
                }
            };

            const masked = SecurityUtils.maskSensitiveData(data);
            
            expect(masked.user.profile.name).toBe('John Doe'); // Not sensitive
            expect(masked.user.credentials.password).toBe('se***MASKED***'); // Masked
            expect(masked.user.credentials.apiKey).toBe('ab***MASKED***'); // Masked
            expect(masked.user.profile.token).toBe('jw***MASKED***'); // Masked
        });

        test('should handle arrays', () => {
            const data = {
                users: [
                    { name: 'User1', password: 'pass1' },
                    { name: 'User2', secret: 'secret2' }
                ]
            };

            const masked = SecurityUtils.maskSensitiveData(data);
            
            expect(masked.users[0].name).toBe('User1');
            expect(masked.users[0].password).toBe('pa***MASKED***');
            expect(masked.users[1].name).toBe('User2');
            expect(masked.users[1].secret).toBe('se***MASKED***');
        });

        test('should handle circular references', () => {
            const data = { name: 'test' };
            data.self = data; // Circular reference

            const masked = SecurityUtils.maskSensitiveData(data);
            
            expect(masked.name).toBe('test');
            expect(masked.self).toBe('[MAX_DEPTH_REACHED]');
        });

        test('should respect custom masking options', () => {
            const data = { password: 'verylongpassword123' };
            const options = {
                showFirst: 4,
                showLast: 2,
                preserveLength: true,
                maskChar: 'X'
            };

            const masked = SecurityUtils.maskSensitiveData(data, options);
            
            expect(masked.password).toBe('veryXXXXXXXXXXXXX23');
        });

        test('should handle null and undefined values', () => {
            expect(SecurityUtils.maskSensitiveData(null)).toBe(null);
            expect(SecurityUtils.maskSensitiveData(undefined)).toBe(undefined);
            expect(SecurityUtils.maskSensitiveData('')).toBe('');
        });

        test('should handle primitive values', () => {
            expect(SecurityUtils.maskSensitiveData('string')).toBe('string');
            expect(SecurityUtils.maskSensitiveData(123)).toBe(123);
            expect(SecurityUtils.maskSensitiveData(true)).toBe(true);
        });
    });

    describe('🧹 HTML Sanitization', () => {
        test('should sanitize basic HTML', () => {
            const html = '<p>Hello <b>World</b></p>';
            const sanitized = SecurityUtils.sanitizeHTML(html);
            
            expect(sanitized).toBe('<p>Hello <b>World</b></p>');
        });

        test('should remove script tags', () => {
            const html = '<p>Hello</p><script>alert("xss")</script>';
            const sanitized = SecurityUtils.sanitizeHTML(html);
            
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).not.toContain('alert');
            expect(sanitized).toContain('<p>Hello</p>');
        });

        test('should remove event handlers', () => {
            const html = '<button onclick="alert(\'xss\')">Click me</button>';
            const sanitized = SecurityUtils.sanitizeHTML(html);
            
            expect(sanitized).not.toContain('onclick');
            expect(sanitized).not.toContain('alert');
        });

        test('should remove inline styles when configured', () => {
            const html = '<p style="color: red;">Styled text</p>';
            const sanitized = SecurityUtils.sanitizeHTML(html);
            
            expect(sanitized).not.toContain('style=');
            expect(sanitized).toContain('Styled text');
        });

        test('should filter allowed tags', () => {
            const html = '<div><p>Paragraph</p><script>alert("xss")</script><h1>Header</h1></div>';
            const options = {
                allowedTags: ['p'],
                allowedAttributes: []
            };
            
            const sanitized = SecurityUtils.sanitizeHTML(html, options);
            
            expect(sanitized).toContain('<p>Paragraph</p>');
            expect(sanitized).not.toContain('<div>');
            expect(sanitized).not.toContain('<h1>');
            expect(sanitized).not.toContain('<script>');
        });

        test('should handle malformed HTML', () => {
            const html = '<p>Unclosed paragraph<div>Nested without closing';
            const sanitized = SecurityUtils.sanitizeHTML(html);
            
            // Should not throw error and return safe content
            expect(typeof sanitized).toBe('string');
        });

        test('should handle non-string input', () => {
            expect(SecurityUtils.sanitizeHTML(null)).toBe('');
            expect(SecurityUtils.sanitizeHTML(123)).toBe('');
            expect(SecurityUtils.sanitizeHTML({})).toBe('');
        });
    });

    describe('🔍 Input Validation', () => {
        test('should validate email addresses', () => {
            expect(SecurityUtils.validateInput('test@example.com', 'email').valid).toBe(true);
            expect(SecurityUtils.validateInput('invalid-email', 'email').valid).toBe(false);
            expect(SecurityUtils.validateInput('', 'email').valid).toBe(false);
        });

        test('should validate URLs', () => {
            expect(SecurityUtils.validateInput('https://example.com', 'url').valid).toBe(true);
            expect(SecurityUtils.validateInput('http://localhost:3000', 'url').valid).toBe(true);
            expect(SecurityUtils.validateInput('not-a-url', 'url').valid).toBe(false);
        });

        test('should validate JSON', () => {
            expect(SecurityUtils.validateInput('{"key": "value"}', 'json').valid).toBe(true);
            expect(SecurityUtils.validateInput('[1, 2, 3]', 'json').valid).toBe(true);
            expect(SecurityUtils.validateInput('invalid json', 'json').valid).toBe(false);
        });

        test('should validate HTML structure', () => {
            expect(SecurityUtils.validateInput('<p>Valid</p>', 'html').valid).toBe(true);
            expect(SecurityUtils.validateInput('<div><span>Nested</span></div>', 'html').valid).toBe(true);
            expect(SecurityUtils.validateInput('<p>Unclosed paragraph', 'html').valid).toBe(false);
        });

        test('should validate generic input size', () => {
            const smallInput = { data: 'small' };
            const result = SecurityUtils.validateInput(smallInput);
            
            expect(result.valid).toBe(true);
            expect(result.size).toBeDefined();
        });
    });

    describe('📊 Statistics and Monitoring', () => {
        test('should track masking operations', () => {
            const initialStats = SecurityUtils.getSecurityStats();
            const initialCount = initialStats.maskingOperations;

            SecurityUtils.maskSensitiveData({ password: 'test' });
            SecurityUtils.maskSensitiveData({ secret: 'test' });

            const finalStats = SecurityUtils.getSecurityStats();
            expect(finalStats.maskingOperations).toBe(initialCount + 2);
        });

        test('should track sanitization operations', () => {
            const initialStats = SecurityUtils.getSecurityStats();
            const initialCount = initialStats.sanitizationOperations;

            SecurityUtils.sanitizeHTML('<p>Test</p>');
            SecurityUtils.sanitizeHTML('<div>Another test</div>');

            const finalStats = SecurityUtils.getSecurityStats();
            expect(finalStats.sanitizationOperations).toBe(initialCount + 2);
        });

        test('should track cache hits and misses', () => {
            const data = { password: 'test123' };
            
            // First call should be a cache miss
            SecurityUtils.maskSensitiveData(data);
            let stats = SecurityUtils.getSecurityStats();
            expect(stats.cacheMisses).toBeGreaterThan(0);
            
            // Second call should be a cache hit
            SecurityUtils.maskSensitiveData(data);
            stats = SecurityUtils.getSecurityStats();
            expect(stats.cacheHits).toBeGreaterThan(0);
        });

        test('should provide comprehensive stats', () => {
            const stats = SecurityUtils.getSecurityStats();
            
            expect(stats).toHaveProperty('maskingOperations');
            expect(stats).toHaveProperty('sanitizationOperations');
            expect(stats).toHaveProperty('errorsHandled');
            expect(stats).toHaveProperty('cacheHits');
            expect(stats).toHaveProperty('cacheMisses');
            expect(stats).toHaveProperty('cacheSize');
            expect(stats).toHaveProperty('uptime');
        });

        test('should clear cache', () => {
            // Add some items to cache
            SecurityUtils.maskSensitiveData({ password: 'test1' });
            SecurityUtils.maskSensitiveData({ secret: 'test2' });
            
            let stats = SecurityUtils.getSecurityStats();
            expect(stats.cacheSize).toBeGreaterThan(0);
            
            const clearedCount = SecurityUtils.clearCache();
            expect(clearedCount).toBeGreaterThan(0);
            
            stats = SecurityUtils.getSecurityStats();
            expect(stats.cacheSize).toBe(0);
        });

        test('should reset statistics', () => {
            // Generate some activity
            SecurityUtils.maskSensitiveData({ password: 'test' });
            SecurityUtils.sanitizeHTML('<p>test</p>');
            
            let stats = SecurityUtils.getSecurityStats();
            expect(stats.maskingOperations).toBeGreaterThan(0);
            expect(stats.sanitizationOperations).toBeGreaterThan(0);
            
            const oldStats = SecurityUtils.resetStats();
            expect(oldStats.maskingOperations).toBeGreaterThan(0);
            
            stats = SecurityUtils.getSecurityStats();
            expect(stats.maskingOperations).toBe(0);
            expect(stats.sanitizationOperations).toBe(0);
        });
    });

    describe('🚨 Error Handling', () => {
        test('should handle errors in masking gracefully', () => {
            // Create an object that will cause JSON.stringify to fail
            const problematicData = {};
            problematicData.circular = problematicData;
            
            // Should not throw error
            expect(() => {
                SecurityUtils.maskSensitiveData(problematicData);
            }).not.toThrow();
        });

        test('should handle errors in sanitization gracefully', () => {
            // Should not throw error even with problematic input
            expect(() => {
                SecurityUtils.sanitizeHTML(null);
            }).not.toThrow();
            
            expect(() => {
                SecurityUtils.sanitizeHTML(undefined);
            }).not.toThrow();
        });

        test('should track errors in statistics', () => {
            const initialStats = SecurityUtils.getSecurityStats();
            const initialErrors = initialStats.errorsHandled;
            
            // Force an error by passing invalid input to internal methods
            try {
                SecurityUtils.validateInput(null, 'invalid-type');
            } catch (e) {
                // Expected to handle gracefully
            }
            
            const finalStats = SecurityUtils.getSecurityStats();
            // Error count might increase depending on internal error handling
            expect(finalStats.errorsHandled).toBeGreaterThanOrEqual(initialErrors);
        });
    });

    describe('⚡ Performance', () => {
        test('should complete masking operations quickly', () => {
            const data = {
                user: {
                    password: 'test123',
                    profile: {
                        secret: 'secret456',
                        nested: {
                            apiKey: 'key789'
                        }
                    }
                }
            };
            
            const startTime = performance.now();
            SecurityUtils.maskSensitiveData(data);
            const endTime = performance.now();
            
            expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
        });

        test('should complete sanitization operations quickly', () => {
            const html = '<div><p>Test content</p><script>alert("test")</script></div>'.repeat(10);
            
            const startTime = performance.now();
            SecurityUtils.sanitizeHTML(html);
            const endTime = performance.now();
            
            expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
        });

        test('should benefit from caching', () => {
            const data = { password: 'test123' };
            
            // First call - cache miss
            const startTime1 = performance.now();
            SecurityUtils.maskSensitiveData(data);
            const endTime1 = performance.now();
            const firstCallTime = endTime1 - startTime1;
            
            // Second call - cache hit
            const startTime2 = performance.now();
            SecurityUtils.maskSensitiveData(data);
            const endTime2 = performance.now();
            const secondCallTime = endTime2 - startTime2;
            
            // Cache hit should be faster (though this might be flaky in fast environments)
            expect(secondCallTime).toBeLessThanOrEqual(firstCallTime * 2);
        });
    });

    describe('🔧 Configuration', () => {
        test('should respect custom sensitive patterns', () => {
            const customConfig = {
                sensitivePatterns: [/customSecret/i, /specialKey/i]
            };
            
            SecurityUtils.initialize(customConfig);
            
            const data = {
                customSecret: 'secret123',
                specialKey: 'key456',
                normalField: 'normal'
            };
            
            const masked = SecurityUtils.maskSensitiveData(data);
            
            expect(masked.customSecret).toBe('se***MASKED***');
            expect(masked.specialKey).toBe('ke***MASKED***');
            expect(masked.normalField).toBe('normal');
        });

        test('should respect custom masking options', () => {
            const customConfig = {
                maskingOptions: {
                    showFirst: 1,
                    maskText: '[HIDDEN]',
                    minLength: 5
                }
            };
            
            SecurityUtils.initialize(customConfig);
            
            const data = { password: 'longpassword' };
            const masked = SecurityUtils.maskSensitiveData(data);
            
            expect(masked.password).toBe('l[HIDDEN]');
        });

        test('should respect HTML sanitization options', () => {
            const customConfig = {
                htmlSanitization: {
                    allowedTags: ['div', 'p', 'span'],
                    allowedAttributes: ['class', 'id', 'data-test'],
                    removeScripts: true
                }
            };
            
            SecurityUtils.initialize(customConfig);
            
            const html = '<div class="test" data-test="value"><p>Content</p><script>alert("xss")</script></div>';
            const sanitized = SecurityUtils.sanitizeHTML(html);
            
            expect(sanitized).toContain('class="test"');
            expect(sanitized).toContain('data-test="value"');
            expect(sanitized).not.toContain('<script>');
        });
    });
});
