// Global test setup for API tests
const path = require('path');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for testing
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock external services for testing
jest.mock('../../auth-subsystem/server/pingone-auth.js', () => ({
    authenticate: jest.fn().mockResolvedValue({
        success: true,
        token: 'mock-token',
        expiresIn: 3600
    }),
    validateToken: jest.fn().mockResolvedValue({
        valid: true,
        user: { id: 'test-user', email: 'test@example.com' }
    }),
    refreshToken: jest.fn().mockResolvedValue({
        success: true,
        token: 'new-mock-token',
        expiresIn: 3600
    })
}));

// Global test utilities
global.testUtils = {
    createMockUser: () => ({
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        population: 'test-population'
    }),
    
    createMockPopulation: () => ({
        id: 'test-population-id',
        name: 'Test Population',
        description: 'Test population for API testing'
    }),
    
    createMockCsvContent: (rows = 10) => {
        const header = 'email,firstName,lastName,population';
        const data = Array(rows).fill().map((_, i) => 
            `test${i}@example.com,Test${i},User${i},test-population`
        );
        return [header, ...data].join('\n');
    },
    
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Global test hooks
beforeAll(() => {
    console.log('🧪 Starting API test suite...');
});

afterAll(() => {
    console.log('✅ API test suite completed');
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Increase timeout for all tests
jest.setTimeout(30000);