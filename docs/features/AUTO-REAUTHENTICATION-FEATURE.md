# Automatic Token Re-Authentication Feature

## Overview

The PingOne Import Tool now includes automatic token re-authentication capabilities that ensure seamless access to PingOne APIs without user intervention. When tokens expire, the system automatically detects the expiration, obtains new tokens using stored credentials, and retries the failed requests.

## Key Features

### 1. Automatic Token Expiration Detection
- **401 Response Detection**: Automatically detects 401 Unauthorized responses with token expiration indicators
- **Token Expiry Timestamp**: Monitors token expiry timestamps to refresh tokens before they expire
- **Multiple Expiration Indicators**: Recognizes various token expiration messages:
  - `token_expired`
  - `invalid_token`
  - `expired`

### 2. Seamless Re-Authentication
- **Stored Credentials**: Uses securely stored API credentials (Client ID, Client Secret, Environment ID)
- **Automatic Token Refresh**: Obtains new tokens using client credentials grant
- **No User Intervention**: Completely transparent to users - no manual re-authentication required

### 3. Intelligent Retry Logic
- **Single Retry**: Retries failed requests once with new tokens (configurable)
- **Rate Limiting Protection**: Includes delays between retries to prevent API abuse
- **Error Handling**: Graceful handling of authentication failures

### 4. Security Considerations
- **Credential Encryption**: API secrets are encrypted at rest
- **Secure Storage**: Credentials stored in environment variables or encrypted settings
- **Token Rotation**: Automatic token refresh prevents long-lived token exposure

## Implementation Details

### Client-Side Token Manager (`public/js/modules/token-manager.js`)

```javascript
// Enhanced TokenManager with auto-retry capabilities
class TokenManager {
    constructor(logger, settings) {
        // Auto-retry configuration
        this.maxRetries = 1; // Only retry once with new token
        this.retryDelay = 1000; // 1 second delay before retry
    }
    
    // Automatic retry with new token
    async retryWithNewToken(requestFn, options = {}) {
        let retryCount = 0;
        
        while (retryCount <= this.maxRetries) {
            try {
                const token = await this.getAccessToken();
                const response = await requestFn(token);
                
                // Check for token expiration
                if (response.status === 401) {
                    const responseText = await response.text().catch(() => '');
                    const isTokenExpired = responseText.includes('token_expired') || 
                                         responseText.includes('invalid_token') ||
                                         responseText.includes('expired');
                    
                    if (isTokenExpired && retryCount < this.maxRetries) {
                        // Clear expired token and retry
                        this.tokenCache = { accessToken: null, expiresAt: 0, ... };
                        retryCount++;
                        continue;
                    }
                }
                
                return response;
            } catch (error) {
                if (retryCount >= this.maxRetries) throw error;
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
    }
}
```

### Server-Side Token Manager (`server/token-manager.js`)

```javascript
// Enhanced server-side TokenManager
class TokenManager {
    constructor(logger) {
        // Auto-retry configuration
        this.maxRetries = 1;
        this.retryDelay = 1000;
    }
    
    // Handle token expiration from API responses
    async handleTokenExpiration(response, retryFn) {
        this.logger.warn('Token expiration detected, attempting automatic re-authentication');
        
        // Clear expired token
        this.token = null;
        this.tokenExpiry = null;
        
        try {
            // Get new token using stored credentials
            const newToken = await this.getAccessToken();
            
            // Wait before retrying to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            
            // Retry with new token
            return await retryFn(newToken);
        } catch (error) {
            this.logger.error('Failed to re-authenticate and retry request', error);
            throw error;
        }
    }
}
```

### Enhanced API Factory (`public/js/modules/api-factory.js`)

```javascript
// Create API clients with automatic token re-authentication
export function createAutoRetryAPIClient(settings, logger) {
    const tokenManager = new TokenManager(logger, settings);
    
    async function makeRequest(url, options = {}) {
        return await tokenManager.retryWithNewToken(async (token) => {
            const requestOptions = {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };
            
            const response = await fetch(url, requestOptions);
            
            // Check for token expiration
            if (response.status === 401) {
                const responseText = await response.text().catch(() => '');
                const isTokenExpired = responseText.includes('token_expired') || 
                                     responseText.includes('invalid_token') ||
                                     responseText.includes('expired');
                
                if (isTokenExpired) {
                    throw new Error('TOKEN_EXPIRED');
                }
            }
            
            return response;
        });
    }
    
    return { get, post, put, del, patch, getTokenInfo, updateSettings };
}
```

### Enhanced Proxy Middleware (`routes/pingone-proxy.js`)

```javascript
// Enhanced proxy with automatic token re-authentication
const createAutoRetryProxy = (tokenManager) => {
    return async (req, res) => {
        // Make the request with automatic retry on token expiration
        const response = await tokenManager.retryWithNewToken(async (token) => {
            // Update authorization header with new token
            if (!isAuthRequest) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            return await fetch(targetUrl, fetchOptions);
        });
        
        // Forward the response
        res.status(response.status);
        // ... response handling
    };
};
```

## Usage Examples

### Basic API Client Usage

```javascript
import { createPingOneAPIClient } from './modules/api-factory.js';

// Create client with auto-retry
const apiClient = createPingOneAPIClient(settings, logger);

// All requests automatically handle token expiration
try {
    const users = await apiClient.getUsers();
    console.log('Users retrieved successfully');
} catch (error) {
    console.error('Request failed:', error.message);
}
```

### Direct Token Manager Usage

```javascript
import TokenManager from './modules/token-manager.js';

const tokenManager = new TokenManager(logger, settings);

// Automatic retry with new token
const response = await tokenManager.retryWithNewToken(async (token) => {
    return await fetch('https://api.pingone.com/v1/users', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
});
```

## Configuration Options

### Token Manager Configuration

```javascript
const tokenManager = new TokenManager(logger, settings);

// Configure retry behavior
tokenManager.maxRetries = 1;        // Number of retries (default: 1)
tokenManager.retryDelay = 1000;     // Delay between retries in ms (default: 1000)
tokenManager.tokenExpiryBuffer = 5 * 60 * 1000; // Buffer before expiry (default: 5 minutes)
```

### Settings Requirements

The automatic re-authentication requires the following settings:

```javascript
const settings = {
    apiClientId: 'your-client-id',
    apiSecret: 'your-client-secret',     // Can be encrypted with 'enc:' prefix
    environmentId: 'your-environment-id',
    region: 'NorthAmerica'               // Optional, defaults to NorthAmerica
};
```

## Error Handling

### Token Expiration Errors

When token expiration is detected:

1. **Log Warning**: System logs a warning about token expiration
2. **Clear Token**: Expired token is cleared from cache
3. **Get New Token**: New token is obtained using stored credentials
4. **Retry Request**: Original request is retried with new token
5. **Handle Failure**: If re-authentication fails, error is propagated

### Rate Limiting Protection

- **Request Spacing**: Minimum 50ms between token requests (20/sec limit)
- **Retry Delays**: 1-second delay between retries
- **Queue Management**: Concurrent requests are queued during token refresh

### Authentication Failures

If stored credentials are invalid:

1. **Clear Token Cache**: All cached tokens are cleared
2. **Log Error**: Detailed error is logged
3. **Propagate Error**: Authentication error is returned to caller
4. **User Notification**: User is notified to check credentials

## Security Best Practices

### Credential Storage

- **Environment Variables**: Preferred method for production
- **Encrypted Settings**: API secrets encrypted with 'enc:' prefix
- **Secure Transmission**: HTTPS for all API communications

### Token Management

- **Short Lifetimes**: Tokens expire in 1 hour (configurable)
- **Automatic Refresh**: Tokens refreshed 5 minutes before expiry
- **Secure Storage**: Tokens stored in memory only, not persisted

### Error Handling

- **No Credential Exposure**: Credentials never logged or exposed
- **Secure Error Messages**: Generic error messages for security
- **Audit Logging**: Authentication events logged for monitoring

## Monitoring and Logging

### Token Events

```javascript
// Token obtained successfully
logger.info('Successfully obtained new access token', {
    tokenType: 'Bearer',
    expiresIn: '3600s',
    responseTime: '150ms'
});

// Token expiration detected
logger.warn('Token expiration detected, attempting automatic re-authentication');

// Re-authentication successful
logger.info('Successfully obtained new token, retrying request');

// Re-authentication failed
logger.error('Failed to re-authenticate and retry request', {
    error: error.message,
    originalStatus: response.status
});
```

### Performance Metrics

- **Token Refresh Time**: Time to obtain new tokens
- **Retry Success Rate**: Percentage of successful retries
- **Authentication Failures**: Rate of credential failures

## Troubleshooting

### Common Issues

1. **Invalid Credentials**
   - Check API Client ID and Secret
   - Verify Environment ID
   - Ensure proper permissions

2. **Rate Limiting**
   - Reduce request frequency
   - Implement exponential backoff
   - Monitor API usage

3. **Network Issues**
   - Check internet connectivity
   - Verify PingOne API availability
   - Review firewall settings

### Debug Mode

Enable detailed logging for troubleshooting:

```javascript
const logger = {
    debug: console.debug,
    info: console.log,
    warn: console.warn,
    error: console.error
};

const tokenManager = new TokenManager(logger, settings);
```

## Migration Guide

### From Manual Token Management

1. **Replace Direct Token Calls**:
   ```javascript
   // Old way
   const token = await getToken();
   const response = await fetch(url, {
       headers: { 'Authorization': `Bearer ${token}` }
   });
   
   // New way
   const response = await apiClient.get(url);
   ```

2. **Update Error Handling**:
   ```javascript
   // Old way
   if (response.status === 401) {
       await refreshToken();
       // retry manually
   }
   
   // New way - automatic handling
   const response = await apiClient.get(url);
   ```

3. **Remove Manual Retry Logic**:
   ```javascript
   // Remove manual retry loops
   // The API client handles this automatically
   ```

## Benefits

### For Users
- **Seamless Experience**: No interruption due to token expiration
- **Reduced Errors**: Fewer authentication-related failures
- **Improved Reliability**: Consistent API access

### For Developers
- **Simplified Code**: No manual token management required
- **Better Error Handling**: Centralized authentication logic
- **Enhanced Security**: Automatic token rotation

### For Operations
- **Reduced Support**: Fewer authentication-related issues
- **Better Monitoring**: Comprehensive logging and metrics
- **Improved Security**: Automatic credential management

## Future Enhancements

### Planned Features
- **Multi-Region Support**: Automatic region-specific token management
- **Advanced Retry Logic**: Exponential backoff and circuit breakers
- **Token Pooling**: Shared token management across multiple requests
- **Metrics Dashboard**: Real-time authentication metrics

### Security Enhancements
- **Credential Rotation**: Automatic credential refresh
- **Audit Trail**: Comprehensive authentication audit logs
- **Threat Detection**: Anomaly detection for authentication patterns

## Conclusion

The automatic token re-authentication feature provides a robust, secure, and user-friendly solution for managing PingOne API authentication. By automatically handling token expiration and credential management, it ensures seamless access while maintaining security best practices.

This implementation follows OAuth 2.0 best practices and provides enterprise-grade reliability for production environments. 