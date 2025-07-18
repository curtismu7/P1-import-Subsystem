/**
 * Token Service Unit Tests
 * 
 * Tests for the TokenService class that manages token operations.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { TokenService } from '../../public/js/modules/token-management/token-service.js';
import { TokenStatus, TokenError } from '../../public/js/modules/token-management/models.js';

describe('TokenService', () => {
  let tokenService;
  let mockTokenProvider;
  let mockTokenValidator;
  let mockTokenStorage;
  let mockLogger;
  let clock;
  
  // Sample token response
  const sampleTokenResponse = {
    access_token: 'sample_access_token',
    refresh_token: 'sample_refresh_token',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'openid profile'
  };
  
  // Sample token info
  const sampleTokenInfo = {
    accessToken: 'sample_access_token',
    refreshToken: 'sample_refresh_token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    expiresAt: new Date(Date.now() + 3600 * 1000),
    scope: 'openid profile'
  };
  
  beforeEach(() => {
    // Use fake timers
    clock = sinon.useFakeTimers();
    
    // Create mock dependencies
    mockTokenProvider = {
      acquireToken: sinon.stub().resolves(sampleTokenResponse)
    };
    
    mockTokenValidator = {
      validateToken: sinon.stub().resolves(true),
      isTokenExpired: sinon.stub().returns(false),
      isTokenExpiringSoon: sinon.stub().returns(false),
      getTokenExpiration: sinon.stub().returns(new Date(Date.now() + 3600 * 1000)),
      getTokenClaims: sinon.stub().returns({ exp: Math.floor(Date.now() / 1000) + 3600 })
    };
    
    mockTokenStorage = {
      saveToken: sinon.stub().resolves(),
      getToken: sinon.stub().resolves('sample_access_token'),
      getTokenInfo: sinon.stub().resolves(sampleTokenInfo),
      clearToken: sinon.stub().resolves()
    };
    
    mockLogger = {
      debug: sinon.stub(),
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub()
    };
    
    // Create TokenService instance
    tokenService = new TokenService(
      mockTokenProvider,
      mockTokenValidator,
      mockTokenStorage,
      mockLogger,
      {
        autoRefreshThreshold: 300, // 5 minutes
        refreshRetryLimit: 2,
        refreshRetryDelay: 100,
        tokenExpirationBuffer: 30
      }
    );
  });
  
  afterEach(() => {
    // Restore timers
    clock.restore();
    
    // Restore all stubs
    sinon.restore();
    
    // Clean up token service
    if (tokenService) {
      tokenService.dispose();
    }
  });
  
  describe('constructor', () => {
    it('should throw an error if tokenProvider is not provided', () => {
      expect(() => new TokenService(null, mockTokenValidator, mockTokenStorage)).to.throw('Token provider is required');
    });
    
    it('should throw an error if tokenValidator is not provided', () => {
      expect(() => new TokenService(mockTokenProvider, null, mockTokenStorage)).to.throw('Token validator is required');
    });
    
    it('should throw an error if tokenStorage is not provided', () => {
      expect(() => new TokenService(mockTokenProvider, mockTokenValidator, null)).to.throw('Token storage is required');
    });
    
    it('should initialize with default options if not provided', () => {
      const service = new TokenService(mockTokenProvider, mockTokenValidator, mockTokenStorage);
      expect(service.options.autoRefreshThreshold).to.equal(60);
      expect(service.options.refreshRetryLimit).to.equal(3);
      expect(service.options.refreshRetryDelay).to.equal(1000);
      expect(service.options.tokenExpirationBuffer).to.equal(30);
    });
    
    it('should initialize with provided options', () => {
      const options = {
        autoRefreshThreshold: 120,
        refreshRetryLimit: 5,
        refreshRetryDelay: 2000,
        tokenExpirationBuffer: 60
      };
      
      const service = new TokenService(mockTokenProvider, mockTokenValidator, mockTokenStorage, mockLogger, options);
      
      expect(service.options.autoRefreshThreshold).to.equal(120);
      expect(service.options.refreshRetryLimit).to.equal(5);
      expect(service.options.refreshRetryDelay).to.equal(2000);
      expect(service.options.tokenExpirationBuffer).to.equal(60);
    });
  });
  
  describe('getToken', () => {
    it('should return the stored token if valid', async () => {
      const token = await tokenService.getToken();
      
      expect(token).to.equal('sample_access_token');
      expect(mockTokenStorage.getToken.calledOnce).to.be.true;
      expect(mockTokenProvider.acquireToken.called).to.be.false;
    });
    
    it('should acquire a new token if no stored token', async () => {
      // No stored token
      mockTokenStorage.getToken.resolves(null);
      
      const token = await tokenService.getToken();
      
      expect(token).to.equal('sample_access_token');
      expect(mockTokenStorage.getToken.calledOnce).to.be.true;
      expect(mockTokenProvider.acquireToken.calledOnce).to.be.true;
      expect(mockTokenStorage.saveToken.calledOnce).to.be.true;
    });
    
    it('should acquire a new token if stored token is expired', async () => {
      // Token is expired
      mockTokenValidator.isTokenExpired.returns(true);
      
      const token = await tokenService.getToken();
      
      expect(token).to.equal('sample_access_token');
      expect(mockTokenStorage.getToken.calledOnce).to.be.true;
      expect(mockTokenProvider.acquireToken.calledOnce).to.be.true;
      expect(mockTokenStorage.saveToken.calledOnce).to.be.true;
    });
    
    it('should acquire a new token if forceRefresh is true', async () => {
      const token = await tokenService.getToken(true);
      
      expect(token).to.equal('sample_access_token');
      expect(mockTokenStorage.getToken.calledOnce).to.be.true;
      expect(mockTokenProvider.acquireToken.calledOnce).to.be.true;
      expect(mockTokenStorage.saveToken.calledOnce).to.be.true;
    });
    
    it('should validate the acquired token', async () => {
      // No stored token
      mockTokenStorage.getToken.resolves(null);
      
      const token = await tokenService.getToken();
      
      expect(token).to.equal('sample_access_token');
      expect(mockTokenValidator.validateToken.calledOnce).to.be.true;
      expect(mockTokenValidator.validateToken.calledWith('sample_access_token')).to.be.true;
    });
    
    it('should throw an error if token validation fails', async () => {
      // No stored token
      mockTokenStorage.getToken.resolves(null);
      
      // Validation fails
      mockTokenValidator.validateToken.resolves(false);
      
      try {
        await tokenService.getToken();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(TokenError);
        expect(error.code).to.equal('invalid_token');
      }
    });
    
    it('should schedule a refresh if token is valid but expiring soon', async () => {
      // Token is expiring soon
      const expiresAt = new Date(Date.now() + 200 * 1000); // 200 seconds
      mockTokenStorage.getTokenInfo.resolves({
        ...sampleTokenInfo,
        expiresAt
      });
      
      // Spy on scheduleRefreshIfNeeded
      const spy = sinon.spy(tokenService, 'scheduleRefreshIfNeeded');
      
      await tokenService.getToken();
      
      expect(spy.calledOnce).to.be.true;
      expect(spy.calledWith(sinon.match.has('expiresAt', expiresAt))).to.be.true;
      
      // Advance time to just before refresh
      clock.tick(199 * 1000);
      
      // Refresh should not have been triggered yet
      expect(mockTokenProvider.acquireToken.called).to.be.false;
      
      // Advance time to trigger refresh
      clock.tick(2 * 1000);
      
      // Refresh should have been triggered
      expect(mockTokenProvider.acquireToken.calledOnce).to.be.true;
    });
    
    it('should use refresh token if available', async () => {
      // Token is expired
      mockTokenValidator.isTokenExpired.returns(true);
      
      // Mock acquireToken with refresh token
      mockTokenProvider.acquireToken.withArgs({ refreshToken: 'sample_refresh_token' }).resolves(sampleTokenResponse);
      
      const token = await tokenService.getToken();
      
      expect(token).to.equal('sample_access_token');
      expect(mockTokenProvider.acquireToken.calledOnce).to.be.true;
      expect(mockTokenProvider.acquireToken.calledWith({ refreshToken: 'sample_refresh_token' })).to.be.true;
    });
    
    it('should handle token acquisition errors', async () => {
      // No stored token
      mockTokenStorage.getToken.resolves(null);
      
      // Acquisition fails
      mockTokenProvider.acquireToken.rejects(new Error('API error'));
      
      try {
        await tokenService.getToken();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(TokenError);
        expect(error.code).to.equal('token_acquisition_failed');
        expect(error.message).to.include('API error');
      }
    });
    
    it('should notify error listeners when token acquisition fails', async () => {
      // No stored token
      mockTokenStorage.getToken.resolves(null);
      
      // Acquisition fails
      mockTokenProvider.acquireToken.rejects(new Error('API error'));
      
      // Add error listener
      const errorListener = sinon.spy();
      tokenService.onTokenError(errorListener);
      
      try {
        await tokenService.getToken();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(errorListener.calledOnce).to.be.true;
        expect(errorListener.calledWith(sinon.match.instanceOf(TokenError))).to.be.true;
      }
    });
  });
  
  describe('refreshToken', () => {
    it('should refresh the token using the refresh token', async () => {
      const token = await tokenService.refreshToken('sample_refresh_token');
      
      expect(token).to.equal('sample_access_token');
      expect(mockTokenProvider.acquireToken.calledOnce).to.be.true;
      expect(mockTokenProvider.acquireToken.calledWith({ refreshToken: 'sample_refresh_token' })).to.be.true;
      expect(mockTokenStorage.saveToken.calledOnce).to.be.true;
    });
    
    it('should get the refresh token from storage if not provided', async () => {
      const token = await tokenService.refreshToken();
      
      expect(token).to.equal('sample_access_token');
      expect(mockTokenStorage.getTokenInfo.calledOnce).to.be.true;
      expect(mockTokenProvider.acquireToken.calledOnce).to.be.true;
      expect(mockTokenProvider.acquireToken.calledWith({ refreshToken: 'sample_refresh_token' })).to.be.true;
    });
    
    it('should throw an error if no refresh token is available', async () => {
      // No refresh token
      mockTokenStorage.getTokenInfo.resolves({
        ...sampleTokenInfo,
        refreshToken: null
      });
      
      try {
        await tokenService.refreshToken();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(TokenError);
        expect(error.code).to.equal('no_refresh_token');
      }
    });
    
    it('should retry refresh on failure', async () => {
      // First attempt fails, second succeeds
      mockTokenProvider.acquireToken
        .onFirstCall().rejects(new Error('Temporary error'))
        .onSecondCall().resolves(sampleTokenResponse);
      
      const token = await tokenService.refreshToken('sample_refresh_token');
      
      expect(token).to.equal('sample_access_token');
      expect(mockTokenProvider.acquireToken.calledTwice).to.be.true;
    });
    
    it('should not retry on authentication errors', async () => {
      // Auth error
      mockTokenProvider.acquireToken.rejects(new TokenError('invalid_grant', 'Invalid refresh token'));
      
      try {
        await tokenService.refreshToken('sample_refresh_token');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(TokenError);
        expect(error.code).to.equal('invalid_grant');
        expect(mockTokenProvider.acquireToken.calledOnce).to.be.true;
      }
    });
    
    it('should notify refresh listeners on successful refresh', async () => {
      // Add refresh listener
      const refreshListener = sinon.spy();
      tokenService.onTokenRefresh(refreshListener);
      
      await tokenService.refreshToken('sample_refresh_token');
      
      expect(refreshListener.calledOnce).to.be.true;
      expect(refreshListener.calledWith('sample_access_token')).to.be.true;
    });
    
    it('should handle concurrent refresh requests', async () => {
      // Make acquireToken take some time
      mockTokenProvider.acquireToken = sinon.stub().callsFake(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(sampleTokenResponse), 100);
        });
      });
      
      // Start two refresh requests
      const promise1 = tokenService.refreshToken('sample_refresh_token');
      const promise2 = tokenService.refreshToken('sample_refresh_token');
      
      // Advance time
      clock.tick(200);
      
      // Both promises should resolve to the same token
      const [token1, token2] = await Promise.all([promise1, promise2]);
      
      expect(token1).to.equal('sample_access_token');
      expect(token2).to.equal('sample_access_token');
      
      // acquireToken should only be called once
      expect(mockTokenProvider.acquireToken.calledOnce).to.be.true;
    });
  });
  
  describe('getTokenStatus', () => {
    it('should return VALID for a valid token', async () => {
      const status = await tokenService.getTokenStatus();
      
      expect(status).to.equal(TokenStatus.VALID);
    });
    
    it('should return EXPIRED for an expired token', async () => {
      // Token is expired
      mockTokenValidator.isTokenExpired.returns(true);
      
      const status = await tokenService.getTokenStatus();
      
      expect(status).to.equal(TokenStatus.EXPIRED);
    });
    
    it('should return EXPIRING_SOON for a token that is expiring soon', async () => {
      // Token is expiring soon
      mockTokenValidator.isTokenExpired.returns(false);
      mockTokenValidator.isTokenExpiringSoon.returns(true);
      
      const status = await tokenService.getTokenStatus();
      
      expect(status).to.equal(TokenStatus.EXPIRING_SOON);
    });
    
    it('should return NONE if no token is available', async () => {
      // No token
      mockTokenStorage.getToken.resolves(null);
      mockTokenStorage.getTokenInfo.resolves(null);
      
      const status = await tokenService.getTokenStatus();
      
      expect(status).to.equal(TokenStatus.NONE);
    });
    
    it('should return REFRESHING if a refresh is in progress', async () => {
      // Start a refresh
      const refreshPromise = tokenService.refreshToken('sample_refresh_token');
      
      // Check status before refresh completes
      const status = await tokenService.getTokenStatus();
      
      expect(status).to.equal(TokenStatus.REFRESHING);
      
      // Advance time to complete refresh
      clock.tick(200);
      
      // Wait for refresh to complete
      await refreshPromise;
    });
  });
  
  describe('clearToken', () => {
    it('should clear the token from storage', async () => {
      await tokenService.clearToken();
      
      expect(mockTokenStorage.clearToken.calledOnce).to.be.true;
    });
  });
  
  describe('event listeners', () => {
    it('should register and unregister token refresh listeners', () => {
      const listener = sinon.spy();
      
      // Register listener
      const unregister = tokenService.onTokenRefresh(listener);
      
      // Trigger event
      tokenService.notifyTokenRefreshListeners('test_token');
      
      expect(listener.calledOnce).to.be.true;
      expect(listener.calledWith('test_token')).to.be.true;
      
      // Unregister listener
      unregister();
      
      // Trigger event again
      tokenService.notifyTokenRefreshListeners('test_token_2');
      
      // Listener should not be called again
      expect(listener.calledOnce).to.be.true;
    });
    
    it('should register and unregister token expired listeners', () => {
      const listener = sinon.spy();
      
      // Register listener
      const unregister = tokenService.onTokenExpired(listener);
      
      // Trigger event
      tokenService.notifyTokenExpiredListeners();
      
      expect(listener.calledOnce).to.be.true;
      
      // Unregister listener
      unregister();
      
      // Trigger event again
      tokenService.notifyTokenExpiredListeners();
      
      // Listener should not be called again
      expect(listener.calledOnce).to.be.true;
    });
    
    it('should register and unregister token error listeners', () => {
      const listener = sinon.spy();
      
      // Register listener
      const unregister = tokenService.onTokenError(listener);
      
      // Trigger event
      const error = new Error('Test error');
      tokenService.notifyTokenErrorListeners(error);
      
      expect(listener.calledOnce).to.be.true;
      expect(listener.calledWith(error)).to.be.true;
      
      // Unregister listener
      unregister();
      
      // Trigger event again
      tokenService.notifyTokenErrorListeners(new Error('Another error'));
      
      // Listener should not be called again
      expect(listener.calledOnce).to.be.true;
    });
    
    it('should handle errors in listeners gracefully', () => {
      // Listener that throws an error
      const badListener = sinon.stub().throws(new Error('Listener error'));
      
      // Register listener
      tokenService.onTokenRefresh(badListener);
      
      // Trigger event
      tokenService.notifyTokenRefreshListeners('test_token');
      
      // Listener should be called
      expect(badListener.calledOnce).to.be.true;
      
      // Error should be logged
      expect(mockLogger.error.calledOnce).to.be.true;
      expect(mockLogger.error.calledWith('Error in token refresh listener', sinon.match.has('error'))).to.be.true;
    });
  });
  
  describe('dispose', () => {
    it('should clean up timers and listeners', () => {
      // Set up a refresh timer
      tokenService.refreshTimer = setTimeout(() => {}, 1000);
      
      // Add listeners
      const refreshListener = sinon.spy();
      const expiredListener = sinon.spy();
      const errorListener = sinon.spy();
      
      tokenService.onTokenRefresh(refreshListener);
      tokenService.onTokenExpired(expiredListener);
      tokenService.onTokenError(errorListener);
      
      // Dispose
      tokenService.dispose();
      
      // Timer should be cleared
      expect(tokenService.refreshTimer).to.be.null;
      
      // Listeners should be cleared
      expect(tokenService.tokenRefreshListeners).to.be.empty;
      expect(tokenService.tokenExpiredListeners).to.be.empty;
      expect(tokenService.tokenErrorListeners).to.be.empty;
    });
  });
});