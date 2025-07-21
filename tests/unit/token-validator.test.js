/**
 * Token Validator Unit Tests
 * 
 * Tests for the TokenValidator classes that handle token validation.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { TokenValidator, JWTTokenValidator } from '../../public/js/modules/token-management/token-validator.js';

describe('TokenValidator', () => {
  describe('Base TokenValidator', () => {
    it('should be an abstract class with required methods', () => {
      const validator = new TokenValidator();
      
      expect(validator).to.be.instanceOf(TokenValidator);
      expect(() => validator.validateToken()).to.throw('must be implemented by subclass');
      expect(() => validator.isTokenExpired()).to.throw('must be implemented by subclass');
      expect(() => validator.isTokenExpiringSoon()).to.throw('must be implemented by subclass');
      expect(() => validator.getTokenExpiration()).to.throw('must be implemented by subclass');
      expect(() => validator.getTokenClaims()).to.throw('must be implemented by subclass');
    });
  });
  
  describe('JWTTokenValidator', () => {
    let validator;
    let mockLogger;
    let clock;
    
    // Sample JWT token parts
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    const payload = {
      sub: 'test_subject',
      iss: 'test_issuer',
      aud: 'test_audience',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000),
      scope: 'openid profile'
    };
    
    // Create a sample JWT token
    function createToken(customPayload = {}) {
      const tokenHeader = btoa(JSON.stringify(header));
      const tokenPayload = btoa(JSON.stringify({ ...payload, ...customPayload }));
      const signature = 'test_signature'; // Not a real signature
      
      return `${tokenHeader}.${tokenPayload}.${signature}`;
    }
    
    beforeEach(() => {
      // Use fake timers
      clock = sinon.useFakeTimers({
        now: Date.now(),
        toFake: ['Date']
      });
      
      // Create mock logger
      mockLogger = {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub()
      };
      
      // Create validator
      validator = new JWTTokenValidator({
        issuer: 'test_issuer',
        audience: 'test_audience',
        clockTolerance: 30
      }, mockLogger);
      
      // Spy on base64UrlDecode
      sinon.spy(validator, 'base64UrlDecode');
    });
    
    afterEach(() => {
      // Restore timers
      clock.restore();
      
      // Restore all stubs
      sinon.restore();
    });
    
    describe('constructor', () => {
      it('should initialize with default options if not provided', () => {
        const validator = new JWTTokenValidator();
        
        expect(validator.options.clockTolerance).to.equal(0);
        expect(validator.options.issuer).to.be.undefined;
        expect(validator.options.audience).to.be.undefined;
      });
      
      it('should initialize with provided options', () => {
        const validator = new JWTTokenValidator({
          issuer: 'custom_issuer',
          audience: 'custom_audience',
          clockTolerance: 60
        });
        
        expect(validator.options.issuer).to.equal('custom_issuer');
        expect(validator.options.audience).to.equal('custom_audience');
        expect(validator.options.clockTolerance).to.equal(60);
      });
    });
    
    describe('validateToken', () => {
      it('should validate a valid token', async () => {
        const token = createToken();
        
        const isValid = await validator.validateToken(token);
        
        expect(isValid).to.be.true;
      });
      
      it('should reject an empty token', async () => {
        const isValid = await validator.validateToken('');
        
        expect(isValid).to.be.false;
      });
      
      it('should reject a malformed token', async () => {
        const isValid = await validator.validateToken('not.a.jwt');
        
        expect(isValid).to.be.false;
      });
      
      it('should reject an expired token', async () => {
        // Create token that expired 1 hour ago
        const token = createToken({
          exp: Math.floor(Date.now() / 1000) - 3600
        });
        
        const isValid = await validator.validateToken(token);
        
        expect(isValid).to.be.false;
      });
      
      it('should accept a recently expired token within clock tolerance', async () => {
        // Create token that expired 20 seconds ago (within 30s tolerance)
        const token = createToken({
          exp: Math.floor(Date.now() / 1000) - 20
        });
        
        const isValid = await validator.validateToken(token);
        
        expect(isValid).to.be.true;
      });
      
      it('should reject a token with wrong issuer', async () => {
        const token = createToken({
          iss: 'wrong_issuer'
        });
        
        const isValid = await validator.validateToken(token);
        
        expect(isValid).to.be.false;
      });
      
      it('should reject a token with wrong audience', async () => {
        const token = createToken({
          aud: 'wrong_audience'
        });
        
        const isValid = await validator.validateToken(token);
        
        expect(isValid).to.be.false;
      });
      
      it('should accept a token with matching audience in array', async () => {
        const token = createToken({
          aud: ['other_audience', 'test_audience']
        });
        
        const isValid = await validator.validateToken(token);
        
        expect(isValid).to.be.true;
      });
      
      it('should accept a token when validator has multiple audiences', async () => {
        // Create validator with multiple audiences
        const multiAudienceValidator = new JWTTokenValidator({
          issuer: 'test_issuer',
          audience: ['primary_audience', 'test_audience']
        }, mockLogger);
        
        const token = createToken();
        
        const isValid = await multiAudienceValidator.validateToken(token);
        
        expect(isValid).to.be.true;
      });
      
      it('should ignore issuer and audience if not specified in options', async () => {
        // Create validator without issuer and audience
        const simpleValidator = new JWTTokenValidator({}, mockLogger);
        
        // Create token with different issuer and audience
        const token = createToken({
          iss: 'different_issuer',
          aud: 'different_audience'
        });
        
        const isValid = await simpleValidator.validateToken(token);
        
        expect(isValid).to.be.true;
      });
      
      it('should handle validation errors gracefully', async () => {
        // Force an error during validation
        sinon.stub(validator, 'getTokenClaims').throws(new Error('Parsing error'));
        
        const isValid = await validator.validateToken('valid.looking.token');
        
        expect(isValid).to.be.false;
        expect(mockLogger.error.calledOnce).to.be.true;
      });
    });
    
    describe('isTokenExpired', () => {
      it('should return true for an expired token', () => {
        // Create token that expired 1 hour ago
        const token = createToken({
          exp: Math.floor(Date.now() / 1000) - 3600
        });
        
        const isExpired = validator.isTokenExpired(token);
        
        expect(isExpired).to.be.true;
      });
      
      it('should return false for a valid token', () => {
        const token = createToken();
        
        const isExpired = validator.isTokenExpired(token);
        
        expect(isExpired).to.be.false;
      });
      
      it('should consider buffer time when checking expiration', () => {
        // Create token that expires in 30 seconds
        const token = createToken({
          exp: Math.floor(Date.now() / 1000) + 30
        });
        
        // Not expired
        expect(validator.isTokenExpired(token)).to.be.false;
        
        // Expired with 60 second buffer
        expect(validator.isTokenExpired(token, 60)).to.be.true;
      });
      
      it('should return true for a token without expiration', () => {
        // Create token without exp claim
        const tokenPayload = { ...payload };
        delete tokenPayload.exp;
        const token = createToken(tokenPayload);
        
        const isExpired = validator.isTokenExpired(token);
        
        expect(isExpired).to.be.true;
      });
      
      it('should return true for an invalid token', () => {
        const isExpired = validator.isTokenExpired('not.a.token');
        
        expect(isExpired).to.be.true;
      });
      
      it('should handle errors gracefully', () => {
        // Force an error
        sinon.stub(validator, 'getTokenClaims').throws(new Error('Parsing error'));
        
        const isExpired = validator.isTokenExpired('valid.looking.token');
        
        expect(isExpired).to.be.true;
        expect(mockLogger.error.calledOnce).to.be.true;
      });
    });
    
    describe('isTokenExpiringSoon', () => {
      it('should return true for a token expiring soon', () => {
        // Create token that expires in 30 seconds
        const token = createToken({
          exp: Math.floor(Date.now() / 1000) + 30
        });
        
        const isExpiringSoon = validator.isTokenExpiringSoon(token, 60);
        
        expect(isExpiringSoon).to.be.true;
      });
      
      it('should return false for a token not expiring soon', () => {
        // Create token that expires in 2 hours
        const token = createToken({
          exp: Math.floor(Date.now() / 1000) + 7200
        });
        
        const isExpiringSoon = validator.isTokenExpiringSoon(token, 60);
        
        expect(isExpiringSoon).to.be.false;
      });
      
      it('should return false for an already expired token', () => {
        // Create token that expired 1 hour ago
        const token = createToken({
          exp: Math.floor(Date.now() / 1000) - 3600
        });
        
        const isExpiringSoon = validator.isTokenExpiringSoon(token, 60);
        
        expect(isExpiringSoon).to.be.false;
      });
      
      it('should return false for a token without expiration', () => {
        // Create token without exp claim
        const tokenPayload = { ...payload };
        delete tokenPayload.exp;
        const token = createToken(tokenPayload);
        
        const isExpiringSoon = validator.isTokenExpiringSoon(token, 60);
        
        expect(isExpiringSoon).to.be.false;
      });
      
      it('should handle errors gracefully', () => {
        // Force an error
        sinon.stub(validator, 'getTokenClaims').throws(new Error('Parsing error'));
        
        const isExpiringSoon = validator.isTokenExpiringSoon('valid.looking.token', 60);
        
        expect(isExpiringSoon).to.be.false;
        expect(mockLogger.error.calledOnce).to.be.true;
      });
    });
    
    describe('getTokenExpiration', () => {
      it('should return the expiration date for a valid token', () => {
        const expirationTimestamp = Math.floor(Date.now() / 1000) + 3600;
        const token = createToken({
          exp: expirationTimestamp
        });
        
        const expiration = validator.getTokenExpiration(token);
        
        expect(expiration).to.be.instanceOf(Date);
        expect(expiration.getTime()).to.equal(expirationTimestamp * 1000);
      });
      
      it('should return null for a token without expiration', () => {
        // Create token without exp claim
        const tokenPayload = { ...payload };
        delete tokenPayload.exp;
        const token = createToken(tokenPayload);
        
        const expiration = validator.getTokenExpiration(token);
        
        expect(expiration).to.be.null;
      });
      
      it('should return null for an invalid token', () => {
        const expiration = validator.getTokenExpiration('not.a.token');
        
        expect(expiration).to.be.null;
      });
      
      it('should handle errors gracefully', () => {
        // Force an error
        sinon.stub(validator, 'getTokenClaims').throws(new Error('Parsing error'));
        
        const expiration = validator.getTokenExpiration('valid.looking.token');
        
        expect(expiration).to.be.null;
        expect(mockLogger.error.calledOnce).to.be.true;
      });
    });
    
    describe('getTokenClaims', () => {
      it('should return the claims for a valid token', () => {
        const token = createToken();
        
        const claims = validator.getTokenClaims(token);
        
        expect(claims).to.deep.include({
          sub: 'test_subject',
          iss: 'test_issuer',
          aud: 'test_audience',
          scope: 'openid profile'
        });
        expect(claims.exp).to.be.a('number');
        expect(claims.iat).to.be.a('number');
      });
      
      it('should return null for an empty token', () => {
        const claims = validator.getTokenClaims('');
        
        expect(claims).to.be.null;
      });
      
      it('should return null for a malformed token', () => {
        const claims = validator.getTokenClaims('not.a.jwt');
        
        expect(claims).to.be.null;
      });
      
      it('should return null for a token with invalid JSON', () => {
        // Create a token with invalid JSON in the payload
        const tokenHeader = btoa(JSON.stringify(header));
        const invalidPayload = btoa('{not valid json}');
        const signature = 'test_signature';
        const token = `${tokenHeader}.${invalidPayload}.${signature}`;
        
        const claims = validator.getTokenClaims(token);
        
        expect(claims).to.be.null;
        expect(mockLogger.error.calledOnce).to.be.true;
      });
    });
    
    describe('base64UrlDecode', () => {
      it('should decode base64url encoded strings', () => {
        // Standard base64url encoding (no padding, - instead of +, _ instead of /)
        const encoded = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
        const decoded = validator.base64UrlDecode(encoded);
        
        expect(decoded).to.equal('{"alg":"HS256","typ":"JWT"}');
      });
      
      it('should handle padding correctly', () => {
        // Base64url with padding needed
        const encoded = 'eyJzdWIiOiIxMjM0NTY3ODkwIn0';
        const decoded = validator.base64UrlDecode(encoded);
        
        expect(decoded).to.equal('{"sub":"1234567890"}');
      });
      
      it('should replace url-safe characters', () => {
        // Base64url with - and _
        const encoded = 'eyJ0ZXN0Ijoi4oCTX-KAky0ifQ';
        const decoded = validator.base64UrlDecode(encoded);
        
        expect(decoded).to.include('{"test":"');
      });
    });
  });
});