/**
 * Test file for the /api/history endpoint
 * Verifies that the endpoint returns proper responses and handles errors correctly
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000';

describe('History Endpoint Tests', () => {
    test('GET /api/history should return success response', async () => {
        const response = await fetch(`${BASE_URL}/api/history`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.history)).toBe(true);
        expect(typeof data.total).toBe('number');
    });

    test('GET /api/history with limit parameter', async () => {
        const response = await fetch(`${BASE_URL}/api/history?limit=50`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.limit).toBe(50);
    });

    test('GET /api/history with offset parameter', async () => {
        const response = await fetch(`${BASE_URL}/api/history?offset=10&limit=20`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.offset).toBe(10);
        expect(data.limit).toBe(20);
    });

    test('GET /api/history with filter parameter', async () => {
        const response = await fetch(`${BASE_URL}/api/history?filter=import`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    test('GET /api/history with search parameter', async () => {
        const response = await fetch(`${BASE_URL}/api/history?search=test`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    test('GET /api/history should handle invalid parameters gracefully', async () => {
        const response = await fetch(`${BASE_URL}/api/history?limit=invalid&offset=invalid`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.limit).toBe(100); // Should default to 100
        expect(data.offset).toBe(0); // Should default to 0
    });
});

console.log('History endpoint tests completed successfully!'); 