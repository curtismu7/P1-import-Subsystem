# PingOne Authentication Subsystem

## Overview

The PingOne Authentication Subsystem provides a standalone, isolated authentication mechanism for the PingOne Import Tool. It handles credential storage, token management, and authentication with PingOne APIs in a consistent and secure manner.

## Features

- **Isolated Architecture**: Self-contained subsystem with clear API boundaries
- **Secure Credential Storage**: Encrypted storage of API secrets in both server and client
- **Token Management**: Automatic token acquisition, caching, and refresh
- **Credential Consistency**: Synchronization of credentials across server and client
- **Clear-Text Display**: Secure display of credentials on the settings page
- **Token Retrieval at Startup**: Automatic token retrieval during application startup

## Architecture

### Directory Structure

```
auth-subsystem/
├── server/
│   ├── index.js             # Server API endpoints
│   ├── pingone-auth.js      # Server-side authentication service
│   └── credential-encryptor.js  # Secure credential encryption
└── client/
    ├── index.js             # Client API
    ├── pingone-auth-client.js   # Client-side authentication service
    └── credential-storage.js    # Client-side credential storage
```

### Server API Endpoints

The server component exposes the following API endpoints:

- `GET /api/v1/auth/token` - Get access token
- `GET /api/v1/auth/status` - Get token status
- `POST /api/v1/auth/validate-credentials` - Validate credentials
- `POST /api/v1/auth/save-credentials` - Save credentials
- `GET /api/v1/auth/credentials` - Get current credentials (without secret)
- `POST /api/v1/auth/clear-token` - Clear token

### Client API

The client component provides a simple API for authentication:

```javascript
import pingOneAuth from 'auth-subsystem/client';

// Get access token
const token = await pingOneAuth.getAccessToken();

// Get token info
const tokenInfo = pingOneAuth.getTokenInfo();

// Save credentials
await pingOneAuth.saveCredentials({
  apiClientId: 'your-client-id',
  apiSecret: 'your-client-secret',
  environmentId: 'your-environment-id',
  region: 'NorthAmerica'
});

// Validate credentials
const validationResult = await pingOneAuth.validateCredentials({
  apiClientId: 'your-client-id',
  apiSecret: 'your-client-secret',
  environmentId: 'your-environment-id',
  region: 'NorthAmerica'
});

// Make API request with token
const response = await pingOneAuth.fetchWithToken('https://api.pingone.com/v1/environments');
```

## Credential Storage

Credentials are stored in three locations:

1. **Server**: `data/settings.json` with encrypted API secret
2. **Client**: LocalStorage with encrypted API secret
3. **Environment Variables**: Optional configuration via environment variables

### Encryption

- **Server**: AES-256-CBC encryption using `AUTH_SUBSYSTEM_ENCRYPTION_KEY` environment variable
- **Client**: Web Crypto API (AES-GCM) with fallback to Base64 encoding

## Integration

### Server Integration

```javascript
import express from 'express';
import authRouter from 'auth-subsystem/server';

const app = express();

// Mount auth subsystem routes
app.use('/api/v1/auth', authRouter);
```

### Client Integration

```javascript
import { PingOneAuth } from 'auth-subsystem/client';

// Create custom instance with logger
const pingOneAuth = new PingOneAuth({
  logger: customLogger,
  settings: initialSettings
});

// Use in application
async function initApp() {
  try {
    const token = await pingOneAuth.getAccessToken();
    console.log('Authentication successful');
  } catch (error) {
    console.error('Authentication failed:', error.message);
  }
}
```

## Configuration

### Environment Variables

- `PINGONE_CLIENT_ID` - PingOne API client ID
- `PINGONE_CLIENT_SECRET` - PingOne API client secret
- `PINGONE_ENVIRONMENT_ID` - PingOne environment ID
- `PINGONE_REGION` - PingOne region (default: NorthAmerica)
- `AUTH_SUBSYSTEM_ENCRYPTION_KEY` - Encryption key for API secret

## Security Considerations

- API secrets are encrypted at rest in both server and client storage
- Tokens are never stored in persistent storage, only in memory
- Automatic token refresh before expiration
- Credentials are validated before saving
- Clear-text display only on secure settings page

## Error Handling

The subsystem includes comprehensive error handling:

- Token acquisition failures with automatic retry
- Credential validation with detailed error messages
- Fallback mechanisms for encryption/decryption
- Detailed logging for troubleshooting

## Testing

The subsystem includes comprehensive tests:

- Unit tests for server and client components
- Integration tests for credential consistency
- End-to-end tests for authentication flow
- Regression tests for subsystem isolation