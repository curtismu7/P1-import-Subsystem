/**
 * Auth Subsystem Client Tests
 * 
 * Tests the client-side functionality of the PingOne authentication subsystem.
 * These tests are designed to run in a browser environment.
 */

// Mock browser environment for testing
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

// Mock window.crypto for testing
const mockCrypto = {
  subtle: {
    encrypt: async () => new Uint8Array([1, 2, 3, 4]),
    decrypt: async () => new TextEncoder().encode('test-secret'),
    generateKey: async () => ({ type: 'secret' }),
    exportKey: async () => new Uint8Array([5, 6, 7, 8]),
    importKey: async () => ({ type: 'secret' })
  },
  getRandomValues: (array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }
};

// Mock fetch for testing
const mockFetch = async (url, options) => {
  if (url.includes('/token')) {
    return {
      ok: true,
      json: async () => ({ 
        success: true, 
        token: 'mock-token',
        tokenInfo: {
          expiresAt: Date.now() + 3600000,
          tokenType: 'Bearer'
        }
      })
    };
  }
  
  if (url.includes('/validate-credentials')) {
    const body = JSON.parse(options.body);
    const isValid = body.apiClientId === 'valid-id' && 
                   body.apiSecret === 'valid-secret' && 
                   body.environmentId === 'valid-env';
                   
    return {
      ok: true,
      json: async () => ({ 
        success: isValid, 
        message: isValid ? 'Credentials validated successfully' : 'Invalid credentials'
      })
    };
  }
  
  return {
    ok: false,
    status: 404,
    json: async () => ({ success: false, error: 'Not found' })
  };
};

describe('Auth Subsystem Client', () => {
  let originalLocalStorage;
  let originalCrypto;
  let originalFetch;
  
  // Import the modules to test
  let CredentialStorage;
  let PingOneAuthClient;
  let PingOneAuth;
  
  before(() => {
    // Save original globals
    originalLocalStorage = global.localStorage;
    originalCrypto = global.crypto;
    originalFetch = global.fetch;
    
    // Mock globals
    global.localStorage = mockLocalStorage;
    global.crypto = mockCrypto;
    global.fetch = mockFetch;
    global.btoa = (str) => Buffer.from(str).toString('base64');
    global.atob = (str) => Buffer.from(str, 'base64').toString();
    
    // Import modules (in a browser environment, these would be imported differently)
    CredentialStorage = require('../../auth-subsystem/client/credential-storage.js').default;
    PingOneAuthClient = require('../../auth-subsystem/client/pingone-auth-client.js').default;
    PingOneAuth = require('../../auth-subsystem/client/index.js').PingOneAuth;
  });
  
  after(() => {
    // Restore original globals
    global.localStorage = originalLocalStorage;
    global.crypto = originalCrypto;
    global.fetch = originalFetch;
  });
  
  describe('CredentialStorage', () => {
    let credentialStorage;
    
    beforeEach(() => {
      localStorage.clear();
      credentialStorage = new CredentialStorage();
    });
    
    it('should save and retrieve credentials', async () => {
      const credentials = {
        apiClientId: 'test-client-id',
        apiSecret: 'test-client-secret',
        environmentId: 'test-environment-id',
        region: 'NorthAmerica'
      };
      
      const result = await credentialStorage.saveCredentials(credentials);
      expect(result).to.be.true;
      
      const retrieved = await credentialStorage.getCredentials();
      expect(retrieved).to.deep.include({
        apiClientId: credentials.apiClientId,
        environmentId: credentials.environmentId,
        region: credentials.region
      });
      
      // Secret should be decrypted
      expect(retrieved.apiSecret).to.equal(credentials.apiSecret);
    });
    
    it('should clear credentials', async () => {
      const credentials = {
        apiClientId: 'test-client-id',
        apiSecret: 'test-client-secret',
        environmentId: 'test-environment-id',
        region: 'NorthAmerica'
      };
      
      await credentialStorage.saveCredentials(credentials);
      expect(credentialStorage.hasCredentials()).to.be.true;
      
      credentialStorage.clearCredentials();
      expect(credentialStorage.hasCredentials()).to.be.false;
    });
  });
  
  describe('PingOneAuthClient', () => {
    let authClient;
    
    beforeEach(() => {
      localStorage.clear();
      authClient = new PingOneAuthClient();
    });
    
    it('should get token from server', async () => {
      const token = await authClient.getAccessToken();
      expect(token).to.equal('mock-token');
      
      const tokenInfo = authClient.getTokenInfo();
      expect(tokenInfo).to.have.property('accessToken', 'mock-token');
      expect(tokenInfo).to.have.property('isValid', true);
    });
    
    it('should validate credentials', async () => {
      const validCredentials = {
        apiClientId: 'valid-id',
        apiSecret: 'valid-secret',
        environmentId: 'valid-env',
        region: 'NorthAmerica'
      };
      
      const invalidCredentials = {
        apiClientId: 'invalid-id',
        apiSecret: 'invalid-secret',
        environmentId: 'invalid-env',
        region: 'NorthAmerica'
      };
      
      const validResult = await authClient.validateCredentials(validCredentials);
      expect(validResult).to.have.property('success', true);
      
      const invalidResult = await authClient.validateCredentials(invalidCredentials);
      expect(invalidResult).to.have.property('success', false);
    });
    
    it('should clear token', async () => {
      await authClient.getAccessToken();
      expect(authClient.getTokenInfo()).to.not.be.null;
      
      authClient.clearToken();
      expect(authClient.getTokenInfo().isValid).to.be.false;
    });
  });
  
  describe('PingOneAuth', () => {
    let pingOneAuth;
    
    beforeEach(() => {
      localStorage.clear();
      pingOneAuth = new PingOneAuth();
    });
    
    it('should provide a unified API for authentication', async () => {
      // Test token retrieval
      const token = await pingOneAuth.getAccessToken();
      expect(token).to.equal('mock-token');
      
      // Test credential management
      const credentials = {
        apiClientId: 'test-client-id',
        apiSecret: 'test-client-secret',
        environmentId: 'test-environment-id',
        region: 'NorthAmerica'
      };
      
      const saveResult = await pingOneAuth.saveCredentials(credentials, false);
      expect(saveResult).to.be.true;
      
      const hasCredentials = pingOneAuth.hasCredentials();
      expect(hasCredentials).to.be.true;
      
      const retrievedCredentials = await pingOneAuth.getCredentials();
      expect(retrievedCredentials).to.deep.include({
        apiClientId: credentials.apiClientId,
        environmentId: credentials.environmentId,
        region: credentials.region
      });
      
      // Test fetchWithToken
      const response = await pingOneAuth.fetchWithToken('/api/test');
      expect(response).to.have.property('ok', false);
    });
  });
});