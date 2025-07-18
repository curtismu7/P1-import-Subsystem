/**
 * Token Storage Unit Tests
 * 
 * Tests for the TokenStorage classes that handle token storage.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { TokenStorage, SecureTokenStorage, SimpleTokenStorage } from '../../public/js/modules/token-management/token-storage.js';

describe('TokenStorage', () => {
  describe('Base TokenStorage', () => {
    it('should be an abstract class with required methods', () => {
      const storage = new TokenStorage();
      
      expect(storage).to.be.instanceOf(TokenStorage);
      expect(() => storage.saveToken()).to.throw('must be implemented by subclass');
      expect(() => storage.getToken()).to.throw('must be implemented by subclass');
      expect(() => storage.getTokenInfo()).to.throw('must be implemented by subclass');
      expect(() => storage.clearToken()).to.throw('must be implemented by subclass');
    });
  });
  
  describe('SecureTokenStorage', () => {
    let storage;
    let mockEncryptionService;
    let mockLogger;
    let mockLocalStorage;
    
    // Sample token and token info
    const sampleToken = 'sample_access_token';
    const sampleTokenInfo = {
      accessToken: 'sample_access_token',
      refreshToken: 'sample_refresh_token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      scope: 'openid profile'
    };
    
    beforeEach(() => {
      // Create mock encryption service
      mockEncryptionService = {
        encrypt: sinon.stub().resolves('encrypted_token'),
        decrypt: sinon.stub().resolves(sampleToken)
      };
      
      // Create mock logger
      mockLogger = {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub()
      };
      
      // Create mock localStorage
      mockLocalStorage = {
        getItem: sinon.stub(),
        setItem: sinon.stub(),
        removeItem: sinon.stub()
      };
      
      // Replace global localStorage with mock
      global.localStorage = mockLocalStorage;
      
      // Create storage
      storage = new SecureTokenStorage(mockEncryptionService, {}, mockLogger);
    });
    
    afterEach(() => {
      // Restore all stubs
      sinon.restore();
      
      // Restore global localStorage
      delete global.localStorage;
    });
    
    describe('constructor', () => {
      it('should throw an error if encryptionService is not provided', () => {
        expect(() => new SecureTokenStorage()).to.throw('Encryption service is required');
      });
      
      it('should initialize with default options if not provided', () => {
        const storage = new SecureTokenStorage(mockEncryptionService);
        
        expect(storage.options.tokenKey).to.equal('auth_token');
        expect(storage.options.tokenInfoKey).to.equal('auth_token_info');
        expect(storage.options.storageType).to.equal('localStorage');
        expect(storage.options.encrypt).to.be.true;
      });
      
      it('should initialize with provided options', () => {
        const storage = new SecureTokenStorage(mockEncryptionService, {
          tokenKey: 'custom_token_key',
          tokenInfoKey: 'custom_token_info_key',
          storageType: 'sessionStorage',
          encrypt: false
        });
        
        expect(storage.options.tokenKey).to.equal('custom_token_key');
        expect(storage.options.tokenInfoKey).to.equal('custom_token_info_key');
        expect(storage.options.storageType).to.equal('sessionStorage');
        expect(storage.options.encrypt).to.be.false;
      });
      
      it('should use sessionStorage if specified', () => {
        // Create mock sessionStorage
        global.sessionStorage = {
          getItem: sinon.stub(),
          setItem: sinon.stub(),
          removeItem: sinon.stub()
        };
        
        const storage = new SecureTokenStorage(mockEncryptionService, {
          storageType: 'sessionStorage'
        });
        
        expect(storage.storage).to.equal(global.sessionStorage);
        
        // Clean up
        delete global.sessionStorage;
      });
    });
    
    describe('saveToken', () => {
      it('should encrypt and save the token', async () => {
        await storage.saveToken(sampleToken, sampleTokenInfo);
        
        // Should encrypt the token
        expect(mockEncryptionService.encrypt.calledOnce).to.be.true;
        expect(mockEncryptionService.encrypt.calledWith(sampleToken)).to.be.true;
        
        // Should save the encrypted token
        expect(mockLocalStorage.setItem.calledWith('auth_token', 'encrypted_token')).to.be.true;
        
        // Should save token info without the actual tokens
        expect(mockLocalStorage.setItem.calledWith('auth_token_info', sinon.match.string)).to.be.true;
        
        // Verify token info
        const savedTokenInfo = JSON.parse(mockLocalStorage.setItem.args[1][1]);
        expect(savedTokenInfo).to.not.have.property('accessToken');
        expect(savedTokenInfo).to.not.have.property('refreshToken');
        expect(savedTokenInfo.tokenType).to.equal('Bearer');
        expect(savedTokenInfo.expiresIn).to.equal(3600);
        expect(savedTokenInfo.expiresAt).to.be.a('string'); // ISO string
        expect(savedTokenInfo.scope).to.equal('openid profile');
      });
      
      it('should save the token without encryption if disabled', async () => {
        // Disable encryption
        storage.options.encrypt = false;
        
        await storage.saveToken(sampleToken, sampleTokenInfo);
        
        // Should not encrypt the token
        expect(mockEncryptionService.encrypt.called).to.be.false;
        
        // Should save the token as-is
        expect(mockLocalStorage.setItem.calledWith('auth_token', sampleToken)).to.be.true;
      });
      
      it('should handle errors gracefully', async () => {
        // Force an error
        mockLocalStorage.setItem.throws(new Error('Storage error'));
        
        try {
          await storage.saveToken(sampleToken, sampleTokenInfo);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Failed to save token');
          expect(mockLogger.error.calledOnce).to.be.true;
        }
      });
    });
    
    describe('getToken', () => {
      it('should retrieve and decrypt the token', async () => {
        // Set up mock storage
        mockLocalStorage.getItem.withArgs('auth_token').returns('encrypted_token');
        
        const token = await storage.getToken();
        
        // Should get the encrypted token
        expect(mockLocalStorage.getItem.calledWith('auth_token')).to.be.true;
        
        // Should decrypt the token
        expect(mockEncryptionService.decrypt.calledOnce).to.be.true;
        expect(mockEncryptionService.decrypt.calledWith('encrypted_token')).to.be.true;
        
        // Should return the decrypted token
        expect(token).to.equal(sampleToken);
      });
      
      it('should return null if no token is stored', async () => {
        // No stored token
        mockLocalStorage.getItem.withArgs('auth_token').returns(null);
        
        const token = await storage.getToken();
        
        expect(token).to.be.null;
        expect(mockEncryptionService.decrypt.called).to.be.false;
      });
      
      it('should return the token without decryption if encryption is disabled', async () => {
        // Disable encryption
        storage.options.encrypt = false;
        
        // Set up mock storage
        mockLocalStorage.getItem.withArgs('auth_token').returns(sampleToken);
        
        const token = await storage.getToken();
        
        // Should not decrypt the token
        expect(mockEncryptionService.decrypt.called).to.be.false;
        
        // Should return the token as-is
        expect(token).to.equal(sampleToken);
      });
      
      it('should return null if decryption fails', async () => {
        // Set up mock storage
        mockLocalStorage.getItem.withArgs('auth_token').returns('encrypted_token');
        
        // Decryption fails
        mockEncryptionService.decrypt.rejects(new Error('Decryption error'));
        
        const token = await storage.getToken();
        
        expect(token).to.be.null;
        expect(mockLogger.error.calledOnce).to.be.true;
      });
      
      it('should handle errors gracefully', async () => {
        // Force an error
        mockLocalStorage.getItem.throws(new Error('Storage error'));
        
        const token = await storage.getToken();
        
        expect(token).to.be.null;
        expect(mockLogger.error.calledOnce).to.be.true;
      });
    });
    
    describe('getTokenInfo', () => {
      it('should retrieve and parse token info', async () => {
        // Set up mock storage
        const storedTokenInfo = {
          tokenType: 'Bearer',
          expiresIn: 3600,
          expiresAt: new Date().toISOString(),
          scope: 'openid profile'
        };
        mockLocalStorage.getItem.withArgs('auth_token_info').returns(JSON.stringify(storedTokenInfo));
        
        const tokenInfo = await storage.getTokenInfo();
        
        // Should get the token info
        expect(mockLocalStorage.getItem.calledWith('auth_token_info')).to.be.true;
        
        // Should parse the token info
        expect(tokenInfo.tokenType).to.equal('Bearer');
        expect(tokenInfo.expiresIn).to.equal(3600);
        expect(tokenInfo.expiresAt).to.be.instanceOf(Date);
        expect(tokenInfo.scope).to.equal('openid profile');
      });
      
      it('should return null if no token info is stored', async () => {
        // No stored token info
        mockLocalStorage.getItem.withArgs('auth_token_info').returns(null);
        
        const tokenInfo = await storage.getTokenInfo();
        
        expect(tokenInfo).to.be.null;
      });
      
      it('should handle invalid JSON gracefully', async () => {
        // Invalid JSON
        mockLocalStorage.getItem.withArgs('auth_token_info').returns('invalid json');
        
        const tokenInfo = await storage.getTokenInfo();
        
        expect(tokenInfo).to.be.null;
        expect(mockLogger.error.calledOnce).to.be.true;
      });
      
      it('should handle errors gracefully', async () => {
        // Force an error
        mockLocalStorage.getItem.throws(new Error('Storage error'));
        
        const tokenInfo = await storage.getTokenInfo();
        
        expect(tokenInfo).to.be.null;
        expect(mockLogger.error.calledOnce).to.be.true;
      });
    });
    
    describe('clearToken', () => {
      it('should remove the token and token info', async () => {
        await storage.clearToken();
        
        // Should remove the token
        expect(mockLocalStorage.removeItem.calledWith('auth_token')).to.be.true;
        
        // Should remove the token info
        expect(mockLocalStorage.removeItem.calledWith('auth_token_info')).to.be.true;
      });
      
      it('should handle errors gracefully', async () => {
        // Force an error
        mockLocalStorage.removeItem.throws(new Error('Storage error'));
        
        try {
          await storage.clearToken();
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Failed to clear token');
          expect(mockLogger.error.calledOnce).to.be.true;
        }
      });
    });
  });
  
  describe('SimpleTokenStorage', () => {
    let storage;
    let mockLogger;
    let mockLocalStorage;
    
    // Sample token and token info
    const sampleToken = 'sample_access_token';
    const sampleTokenInfo = {
      accessToken: 'sample_access_token',
      refreshToken: 'sample_refresh_token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      scope: 'openid profile'
    };
    
    beforeEach(() => {
      // Create mock logger
      mockLogger = {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub()
      };
      
      // Create mock localStorage
      mockLocalStorage = {
        getItem: sinon.stub(),
        setItem: sinon.stub(),
        removeItem: sinon.stub()
      };
      
      // Replace global localStorage with mock
      global.localStorage = mockLocalStorage;
      
      // Create storage
      storage = new SimpleTokenStorage({}, mockLogger);
    });
    
    afterEach(() => {
      // Restore all stubs
      sinon.restore();
      
      // Restore global localStorage
      delete global.localStorage;
    });
    
    describe('constructor', () => {
      it('should initialize with default options if not provided', () => {
        const storage = new SimpleTokenStorage();
        
        expect(storage.options.tokenKey).to.equal('auth_token');
        expect(storage.options.tokenInfoKey).to.equal('auth_token_info');
        expect(storage.options.storageType).to.equal('localStorage');
      });
      
      it('should initialize with provided options', () => {
        const storage = new SimpleTokenStorage({
          tokenKey: 'custom_token_key',
          tokenInfoKey: 'custom_token_info_key',
          storageType: 'sessionStorage'
        });
        
        expect(storage.options.tokenKey).to.equal('custom_token_key');
        expect(storage.options.tokenInfoKey).to.equal('custom_token_info_key');
        expect(storage.options.storageType).to.equal('sessionStorage');
      });
    });
    
    describe('saveToken', () => {
      it('should save the token', async () => {
        await storage.saveToken(sampleToken, sampleTokenInfo);
        
        // Should save the token
        expect(mockLocalStorage.setItem.calledWith('auth_token', sampleToken)).to.be.true;
        
        // Should save token info without the actual tokens
        expect(mockLocalStorage.setItem.calledWith('auth_token_info', sinon.match.string)).to.be.true;
        
        // Verify token info
        const savedTokenInfo = JSON.parse(mockLocalStorage.setItem.args[1][1]);
        expect(savedTokenInfo).to.not.have.property('accessToken');
        expect(savedTokenInfo).to.not.have.property('refreshToken');
        expect(savedTokenInfo.tokenType).to.equal('Bearer');
        expect(savedTokenInfo.expiresIn).to.equal(3600);
        expect(savedTokenInfo.expiresAt).to.be.a('string'); // ISO string
        expect(savedTokenInfo.scope).to.equal('openid profile');
      });
    });
    
    describe('getToken', () => {
      it('should retrieve the token', async () => {
        // Set up mock storage
        mockLocalStorage.getItem.withArgs('auth_token').returns(sampleToken);
        
        const token = await storage.getToken();
        
        // Should get the token
        expect(mockLocalStorage.getItem.calledWith('auth_token')).to.be.true;
        
        // Should return the token
        expect(token).to.equal(sampleToken);
      });
    });
    
    describe('getTokenInfo', () => {
      it('should retrieve and parse token info', async () => {
        // Set up mock storage
        const storedTokenInfo = {
          tokenType: 'Bearer',
          expiresIn: 3600,
          expiresAt: new Date().toISOString(),
          scope: 'openid profile'
        };
        mockLocalStorage.getItem.withArgs('auth_token_info').returns(JSON.stringify(storedTokenInfo));
        
        const tokenInfo = await storage.getTokenInfo();
        
        // Should get the token info
        expect(mockLocalStorage.getItem.calledWith('auth_token_info')).to.be.true;
        
        // Should parse the token info
        expect(tokenInfo.tokenType).to.equal('Bearer');
        expect(tokenInfo.expiresIn).to.equal(3600);
        expect(tokenInfo.expiresAt).to.be.instanceOf(Date);
        expect(tokenInfo.scope).to.equal('openid profile');
      });
    });
    
    describe('clearToken', () => {
      it('should remove the token and token info', async () => {
        await storage.clearToken();
        
        // Should remove the token
        expect(mockLocalStorage.removeItem.calledWith('auth_token')).to.be.true;
        
        // Should remove the token info
        expect(mockLocalStorage.removeItem.calledWith('auth_token_info')).to.be.true;
      });
    });
  });
});