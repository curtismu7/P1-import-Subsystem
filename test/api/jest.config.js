export default {
    testEnvironment: 'node',
    testMatch: [
        '**/test/api/**/*.test.js'
    ],
    setupFilesAfterEnv: ['<rootDir>/test/api/setup.js'],
    collectCoverageFrom: [
        'routes/**/*.js',
        'server/**/*.js',
        'auth-subsystem/**/*.js',
        '!**/node_modules/**',
        '!**/test/**',
        '!**/logs/**'
    ],
    coverageDirectory: 'test/reports/coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testTimeout: 30000,
    verbose: true,
    detectOpenHandles: true,
    forceExit: true,
    maxWorkers: 1, // Run tests sequentially to avoid port conflicts
    globals: {
        'ts-jest': {
            useESM: true
        }
    }
};