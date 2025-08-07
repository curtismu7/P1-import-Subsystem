// Playwright API endpoint test (client perspective)
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.P1IMPORT_BASE_URL || 'http://localhost:4000';

test.describe('API Health Check (Client Perspective)', () => {
  test('GET /api/health returns health status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('status');
    expect(['healthy', 'ok']).toContain(body.status);
    expect(body).toHaveProperty('checks');
  });

  test('GET /api/status returns system status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/status`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('server');
    expect(body).toHaveProperty('memory');
    expect(body).toHaveProperty('environment');
  });

  test('GET /api/version returns version info', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/version`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('buildTime');
  });
});
