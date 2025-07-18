/**
 * Token Provider Unit Tests
 * 
 * Tests for the TokenProvider classes that handle token acquisition.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { TokenProvider, PingOneTokenProvider } from '../../public/js/modules/token-management/token-provider.js';
import { TokenError } from '../../public/js/modules/token-management/models.js';

describe('TokenProvider', () => {
  describe('Base TokenProvider', () => {
    it('should be an abstract class with acquireToken method', () => {
      const provider = new TokenProvider();
      
      expect(provider).to.be.instanceOf(TokenProvider);
      expect(() => provider.acquireToken()).to.throw('must be implemented by subclass');
    });
  });
  
  describe('PingOneTokenProvider', () => {
    let provider;
    let mockApiClient;
    let mockLogger;
    
    // Sample token response
    const sampleTokenResponse = {
      access_token: 'sample_access_token',
      refresh_token: 'sample_refresh_token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'openid profile'
    };
    
    beforeEach(() => {
      // Create mock API client
      mockApiClient = {
        request: sinon.stub().resolves({
          ok: true,
          json: sinon.stub().resolves(sampleTokenResponse)
        })
      };
      
      // Create mock logger
      mockLogger = {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub()
      };
      
      // Create provider
      provider = new PingOneTokenProvider(
        mockApiClient,
        {
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret',
          environmentId: 'test_environment_id',
          region: 'na'
        },
        mockLogger
      );
    });
    
    afterEach(() => {
      sinon.restore();
    });
    
    describe('constructor', () => {
      it('should throw an error if apiClient is not provided', () => {
        expect(() => new PingOneTokenProvider()).to.throw('API client is required');
      });
      
      it('should throw an error if required options are missing', () => {
        expect(() => new PingOneTokenProvider(mockApiClient)).to.throw('Required options missing');
        expect(() => new PingOneTokenProvider(mockApiClient, { clientId: 'id' })).to.throw('Required options missing');
        expect(() => new PingOneTokenProvider(mockApiClient, { 
          clientId: 'id',
          clientSecret: 'secret'
        })).to.throw('Required options missing');
        expect(() => new PingOneTokenProvider(mockApiClient, { 
          clientId: 'id',
          clientSecret: 'secret',
          environmentId: 'env'
        })).to.throw('Required options missing');
      });
      
      it('should initialize with default options if not provided', () => {
        const provider = new PingOneTokenProvider(mockApiClient, {
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret',
          environmentId: 'test_environment_id',
          region: 'na'
        });
        
        expect(provider.options.grantType).to.equal('client_credentials');
        expect(provider.options.tokenEndpoint).to.equal('/as/token');
      });
      
      it('should initialize with provided options', () => {
        const provider = new PingOneTokenProvider(mockApiClient, {
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret',
          environmentId: 'test_environment_id',
          region: 'na',
          grantType: 'password',
          tokenEndpoint: '/custom/token'
        });
        
        expect(provider.options.grantType).to.equal('password');
        expect(provider.options.tokenEndpoint).to.equal('/custom/token');
      });
    });
    
    describe('acquireToken', () => {
      it('should acquire a token with client credentials', async () => {
        const token = await provider.acquireToken();
        
        expect(mockApiClient.request.calledOnce).to.be.true;
        
        // Verify request URL
        const requestUrl = mockApiClient.request.firstCall.args[0];
        expect(requestUrl).to.equal('https://auth.pingone.com/as/token');
        
        // Verify request options
        const requestOptions = mockApiClient.request.firstCall.args[1];
        expect(requestOptions.method).to.equal('POST');
        expect(requestOptions.headers['Content-Type']).to.equal('application/x-www-form-urlencoded');
        
        // Verify request body
        const body = new URLSearchParams(requestOptions.body);
        expect(body.get('grant_type')).to.equal('client_credentials');
        expect(body.get('client_id')).to.equal('test_client_id');
        expect(body.get('client_secret')).to.equal('test_client_secret');
        
        // Verify response
        expect(token).to.deep.equal(sampleTokenResponse);
      });
      
      it('should acquire a token with refresh token', async () => {
        const token = await provider.acquireToken({ refreshToken: 'test_refresh_token' });
        
        // Verify request body
        const requestOptions = mockApiClient.request.firstCall.args[1];
        const body = new URLSearchParams(requestOptions.body);
        expect(body.get('grant_type')).to.equal('refresh_token');
        expect(body.get('refresh_token')).to.equal('test_refresh_token');
        
        // Verify response
        expect(token).to.deep.equal(sampleTokenResponse);
      });
      
      it('should acquire a token with password credentials', async () => {
        // Set grant type to password
        provider.options.grantType = 'password';
        
        const token = await provider.acquireToken({
          username: 'test_user',
          password: 'test_password'
        });
        
        // Verify request body
        const requestOptions = mockApiClient.request.firstCall.args[1];
        const body = new URLSearchParams(requestOptions.body);
        expect(body.get('grant_type')).to.equal('password');
        expect(body.get('username')).to.equal('test_user');
        expect(body.get('password')).to.equal('test_password');
        
        // Verify response
        expect(token).to.deep.equal(sampleTokenResponse);
      });
      
      it('should handle API errors', async () => {
        // Mock API error
        mockApiClient.request.resolves({
          ok: false,
          status: 401,
          json: sinon.stub().resolves({
            error: 'invalid_client',
            error_description: 'Invalid client credentials'
          })
        });
        
        try {
          await provider.acquireToken();
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).to.be.instanceOf(TokenError);
          expect(error.code).to.equal('invalid_client');
          expect(error.message).to.equal('Invalid client credentials');
          expect(error.status).to.equal(401);
        }
      });
      
      it('should handle network errors', async () => {
        // Mock network error
        mockApiClient.request.rejects(new Error('Network error'));
        
        try {
          await provider.acquireToken();
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).to.be.instanceOf(TokenError);
          expect(error.code).to.equal('token_acquisition_failed');
          expect(error.message).to.include('Network error');
        }
      });
      
      it('should handle JSON parsing errors', async () => {
        // Mock JSON parsing error
        mockApiClient.request.resolves({
          ok: true,
          json: sinon.stub().rejects(new Error('Invalid JSON'))
        });
        
        try {
          await provider.acquireToken();
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).to.be.instanceOf(TokenError);
          expect(error.code).to.equal('token_acquisition_failed');
          expect(error.message).to.include('Invalid JSON');
        }
      });
    });
    
    describe('getBaseUrl', () => {
      it('should return the correct base URL for NA region', () => {
        provider.options.region = 'na';
        expect(provider.getBaseUrl()).to.equal('https://auth.pingone.com');
      });
      
      it('should return the correct base URL for EU region', () => {
        provider.options.region = 'eu';
        expect(provider.getBaseUrl()).to.equal('https://auth.pingone.eu');
      });
      
      it('should return the correct base URL for AP region', () => {
        provider.options.region = 'ap';
        expect(provider.getBaseUrl()).to.equal('https://auth.pingone.asia');
      });
      
      it('should return the correct base URL for CA region', () => {
        provider.options.region = 'ca';
        expect(provider.getBaseUrl()).to.equal('https://auth.pingone.ca');
      });
      
      it('should default to NA region for unknown regions', () => {
        provider.options.region = 'unknown';
        expect(provider.getBaseUrl()).to.equal('https://auth.pingone.com');
      });
      
      it('should handle case-insensitive region names', () => {
        provider.options.region = 'EU';
        expect(provider.getBaseUrl()).to.equal('https://auth.pingone.eu');
      });
    });
  });
});