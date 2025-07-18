/**
 * Auth Subsystem Integration Tests
 * 
 * Tests the functionality of the PingOne authentication subsystem.
 */

import { expect } from 'chai';
import fetch from 'node-fetch';
import { pingOneAuth, credentialEncryptor } from '../../../auth-subsystem/server/index.js';

describe('Auth Subsystem', () => {
  // Test credentials (these should be mocked in a real test)
  const testCredentials = {
    apiClientId: 'test-client-id',
    apiSecret: 'test-client-secret',
    environmentId: 'test-environment-id',
    region: 'NorthAmerica'
  };

  describe('Credential Encryptor', () => {
    it('should encrypt and decrypt values', async () => {
      const value = 'test-secret-value';
      const encrypted = await credentialEncryptor.encrypt(value);
      
      // Verify encrypted value has the correct format
      expect(encrypted).to.be.a('string');
      expect(encrypted).to.include('enc:');
      
      // Decrypt and verify
      const decrypted = await credentialEncryptor.decrypt(encrypted);
      expect(decrypted).to.equal(value);
    });
    
    it('should detect encrypted values', () => {
      expect(credentialEncryptor.isEncrypted('enc:something')).to.be.true;
      expect(credentialEncryptor.isEncrypted('plaintext')).to.be.false;
    });
  });

  describe('PingOne Auth', () => {
    // These tests would normally use mocks for external API calls
    
    it('should validate credentials format', async () => {
      // Test with missing credentials
      const result1 = await pingOneAuth.validateCredentials({
        apiClientId: 'test-id',
        // Missing apiSecret
        environmentId: 'test-env'
      });
      
      expect(result1.success).to.be.false;
      expect(result1.message).to.include('Missing required credentials');
      
      // Test with complete credentials (would normally mock the API call)
      // This test is commented out as it would make a real API call
      /*
      const result2 = await pingOneAuth.validateCredentials(testCredentials);
      expect(result2.success).to.be.true;
      */
    });
    
    it('should save and retrieve credentials', async () => {
      // Mock the encryptAndSaveSettings method to avoid actual file writes
      const originalMethod = credentialEncryptor.encryptAndSaveSettings;
      credentialEncryptor.encryptAndSaveSettings = async () => true;
      
      const result = await pingOneAuth.saveCredentials(testCredentials);
      expect(result).to.be.true;
      
      // Restore the original method
      credentialEncryptor.encryptAndSaveSettings = originalMethod;
    });
  });

  // These tests would run against a live server
  describe('API Endpoints', () => {
    const baseUrl = 'http://localhost:4000/api/v1/auth';
    
    // Skip these tests in CI environments or when not running a local server
    const shouldSkip = process.env.CI === 'true' || process.env.SKIP_API_TESTS === 'true';
    
    it('should return token status', async function() {
      if (shouldSkip) this.skip();
      
      const response = await fetch(`${baseUrl}/status`);
      const data = await response.json();
      
      expect(response.status).to.be.oneOf([200, 401]);
      expect(data).to.have.property('success');
      expect(data).to.have.property('hasToken');
    });
    
    it('should validate credentials', async function() {
      if (shouldSkip) this.skip();
      
      const response = await fetch(`${baseUrl}/validate-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiClientId: 'invalid-id',
          apiSecret: 'invalid-secret',
          environmentId: 'invalid-env'
        })
      });
      
      const data = await response.json();
      expect(response.status).to.equal(200);
      expect(data).to.have.property('success', false);
      expect(data).to.have.property('message');
    });
  });
});