# PingOne Authentication System

This document describes the authentication system for the PingOne Import Tool, including setup, monitoring, and troubleshooting.

## Architecture

The authentication system consists of several components:

1. **Settings Manager** - Manages credentials and settings with backup/restore
2. **Credential Validator** - Validates credential format and API access
3. **Health Check** - Monitors authentication health and API connectivity
4. **Monitoring Script** - Runs continuous health checks and alerts on issues

## Setup

### 1. Prerequisites

- Node.js 14+
- PingOne account with API access
- Required environment variables (see `.env.example`)

### 2. Configuration

1. Copy `.env.example` to `.env` and update with your PingOne credentials:
   ```
   PINGONE_ENVIRONMENT_ID=your_environment_id
   PINGONE_CLIENT_ID=your_client_id
   PINGONE_CLIENT_SECRET=your_client_secret
   PINGONE_REGION=NorthAmerica
   ```

2. The system will automatically create/update `data/settings.json` with these credentials.

## Monitoring

The system includes a monitoring script that continuously checks authentication health:

```bash
# Run monitor with default settings (checks every 5 minutes)
node scripts/monitor-auth.js

# Customize check interval (in seconds)
node scripts/monitor-auth.js --interval 60

# Specify log file location
node scripts/monitor-auth.js --log-file logs/auth.log

# Enable email alerts
node scripts/monitor-auth.js --email admin@example.com
```

### Health Check Endpoint

A health check endpoint is available at `/api/health` that returns the current status:

```json
{
  "status": "healthy",
  "timestamp": "2025-07-30T15:45:00.000Z",
  "checks": {
    "settings_file": {
      "status": "healthy",
      "message": "Settings file is valid"
    },
    "pingone_connection": {
      "status": "healthy",
      "message": "Successfully connected to PingOne"
    },
    "token_validation": {
      "status": "healthy",
      "message": "Token validation successful",
      "details": {
        "expiresIn": 3600,
        "tokenType": "Bearer"
      }
    },
    "api_access": {
      "status": "healthy",
      "message": "API access verified"
    }
  }
}
```

## Recovery Procedures

### 1. Settings Corruption

If settings become corrupted, the system will automatically:
1. Attempt to load from backup (`data/settings.backup.json`)
2. If backup fails, create default settings
3. Log the issue for review

### 2. Authentication Failures

For authentication failures:
1. Check the logs for specific error messages
2. Verify credentials in PingOne Admin Console
3. Ensure the client has the necessary API permissions
4. Check network connectivity to PingOne API endpoints

## Security Considerations

- Credentials are never logged
- API tokens are rotated automatically
- Settings file permissions should be restricted
- Regular backups of settings are maintained

## Troubleshooting

### Common Issues

1. **Invalid Credentials**
   - Verify credentials in PingOne Admin Console
   - Check for typos in environment variables
   - Ensure the client is enabled and has correct permissions

2. **Connection Issues**
   - Verify network connectivity to PingOne API endpoints
   - Check for firewall rules blocking outbound connections
   - Verify the region is correct

3. **Token Validation Failures**
   - Check token expiration
   - Verify the client secret hasn't been rotated
   - Ensure system clock is synchronized (NTP)

## Maintenance

### Rotating Credentials

1. Generate new credentials in PingOne Admin Console
2. Update `.env` with new credentials
3. Restart the application

### Updating Settings

Settings can be updated via the API or by directly editing `data/settings.json` (not recommended in production).

## Monitoring and Alerts

Set up monitoring to watch for:
- Failed authentication attempts
- Approaching token expiration
- API rate limiting
- Connection timeouts
