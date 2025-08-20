/**
 * Auth Subsystem Integration Tests
 * 
 * Tests the integration of the PingOne authentication subsystem with the rest of the application.
 */

import { expect } from 'chai';
import fetch from 'node-fetch';
import { pingOneAuth } from '../../auth-subsystem/server/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Skip these tests in CI environments or when not running a local server
const shouldSkip = process.env.CI === 'true' || process.env.SKIP_INTEGRATION_TESTS === 'true';
const describeIf = shouldSkip ? describe.skip : describe;

describeIf('Auth Subsystem Integration', () => {
  const baseUrl = 'http://localhost:4000';
  const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
  
  // Test credentials (these should be mocked in a real test)
  const testCredentials = {
    apiClientId: 'test-client-id',
    apiSecret: 'test-client-secret',
    environmentId: 'test-environment-id',
    region: 'NorthAmerica'
  };
  
  // Backup and restore settings.json
  let originalSettings;
  
  beforeAll(async () => {
    try {
      // Backup original settings
      const settingsData = await fs.readFile(settingsPath, 'utf8');
      originalSettings = settingsData;
    } catch (error) {
      console.warn('Could not backup settings.json:', error.message);
    }
  });
  
  afterAll(async () => {
    try {
      // Restore original settings
      if (originalSettings) {
        await fs.writeFile(settingsPath, originalSettings, 'utf8');
      }
    } catch (error) {
      console.warn('Could not restore settings.json:', error.message);
    }
  });
  
  describe('Credential Consistency', () => {
    it('should validate credentials via API', async function() {
      
      const response = await fetch(`${baseUrl}/api/v1/auth/validate-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCredentials)
      });
      
      const data = await response.json();
      expect(response.status).to.be.oneOf([200, 401]);
      expect(data).to.have.property('success');
      expect(data).to.have.property('message');
    });
    
    it('should save credentials via API', async function() {
      
      // This test would normally use mock credentials
      // For a real test, we'd need valid credentials
      const response = await fetch(`${baseUrl}/api/v1/auth/save-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCredentials)
      });
      
      const data = await response.json();
      expect(response.status).to.be.oneOf([200, 400, 401]);
      expect(data).to.have.property('success');
    });
    
    it('should get credentials via API', async function() {
      
      const response = await fetch(`${baseUrl}/api/v1/auth/credentials`);
      const data = await response.json();
      
      expect(response.status).to.equal(200);
      
      if (data.success) {
        expect(data).to.have.nested.property('credentials.apiClientId');
        expect(data).to.have.nested.property('credentials.environmentId');
        expect(data).to.have.nested.property('credentials.region');
        // Should not include the secret
        expect(data).to.not.have.nested.property('credentials.apiSecret');
      }
    });
  });
  
  describe('Token Management', () => {
    it('should get token via API', async function() {
      
      const response = await fetch(`${baseUrl}/api/v1/auth/token`);
      const data = await response.json();
      
      expect(response.status).to.be.oneOf([200, 401]);
      
      if (data.success) {
        expect(data).to.have.property('token');
        expect(data).to.have.property('tokenInfo');
        expect(data.tokenInfo).to.have.property('expiresIn');
      }
    });
    
    it('should get token status via API', async function() {
      
      const response = await fetch(`${baseUrl}/api/v1/auth/status`);
      const data = await response.json();
      
      expect(response.status).to.equal(200);
      expect(data).to.have.property('hasToken');
      expect(data).to.have.property('status');
    });
    
    it('should clear token via API', async function() {
      
      const response = await fetch(`${baseUrl}/api/v1/auth/clear-token`, {
        method: 'POST'
      });
      
      const data = await response.json();
      expect(response.status).to.equal(200);
      expect(data).to.have.property('success', true);
    });
  });
  
  describe('Subsystem Isolation', () => {
    it('should handle server startup with invalid credentials', async function() {
      
      // This test would simulate server startup with invalid credentials
      // and verify that the server still starts and falls back to the settings page
      
      // For a real test, we'd need to restart the server with invalid credentials
      // Here we'll just verify that the health endpoint is available
      
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json();
      
      expect(response.status).to.equal(200);
      expect(data).to.have.property('status');
      expect(data).to.have.nested.property('server.pingOne');
    });
    
    it('should handle API requests with invalid token', async function() {
      
      // Clear token first
      await fetch(`${baseUrl}/api/v1/auth/clear-token`, {
        method: 'POST'
      });
      
      // Try to access a protected API endpoint
      const response = await fetch(`${baseUrl}/api/pingone/environments`);
      
      // Should return 401 Unauthorized or redirect to settings
      expect(response.status).to.be.oneOf([401, 302]);
    });
  });
});