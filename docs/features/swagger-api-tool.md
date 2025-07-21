# Swagger API Tool - Enhanced API Documentation Interface

## Overview

The **Swagger API Tool** is a professional, enhanced API documentation and testing interface for the PingOne Import Tool. It provides comprehensive token management capabilities, high-contrast accessibility design, and seamless integration with the existing authentication subsystem.

## Key Features

### 🔐 Secure Token Management
- **Worker Token Retrieval**: Secure retrieval of PingOne worker tokens using HTTPS
- **Real-time Status Display**: Live token status with expiration tracking
- **Automatic Refresh**: Token refresh capabilities with user-friendly controls
- **Security-First Design**: No sensitive data exposure in client-side code

### 🎨 High-Contrast Design
- **Accessibility Focused**: High-contrast color scheme for improved readability
- **Professional Appearance**: Clean, modern interface aligned with Ping Identity branding
- **Responsive Layout**: Mobile-friendly design with adaptive components
- **Enhanced Typography**: Improved font weights and spacing for better legibility

### 🚀 Advanced Integration
- **Subsystem Architecture**: Full integration with existing authentication and settings subsystems
- **Event-Driven Updates**: Real-time coordination via EventBus patterns
- **Population Management**: Enhanced population selector with visual feedback
- **Swagger UI Integration**: Automatic token injection into Swagger UI for seamless API testing

## Architecture

### Frontend Components

#### Token Management Panel
Located at the top of the Swagger interface, provides:
- **Retrieve Token**: Secure token retrieval from server credentials
- **Refresh Token**: Refresh existing tokens before expiration
- **Clear Token**: Safe token clearing with confirmation
- **Status Display**: Real-time token status, expiration time, and countdown

#### Enhanced Population Selector
Improved population management with:
- **Visual Feedback**: Status indicators and hover effects
- **Error Handling**: Comprehensive error display and recovery
- **Subsystem Integration**: Direct integration with PopulationSubsystem

### Backend Integration

#### API Endpoints
- `POST /api/auth/worker-token` - Retrieve new worker token
- `POST /api/auth/refresh-token` - Refresh existing token
- `GET /api/auth/token-status` - Check token status (no sensitive data)
- `DELETE /api/auth/worker-token` - Clear current token
- `POST /api/auth/validate-token` - Validate token format and expiration
- `GET /api/auth/test-connection` - Test API connectivity

#### Security Features
- **HTTPS Enforcement**: All token operations use secure communication
- **No Client Storage**: Tokens never stored in browser localStorage
- **Request Validation**: Comprehensive input validation and sanitization
- **Error Sanitization**: No sensitive information in error messages

## Usage Guide

### Getting Started

1. **Access the Tool**: Navigate to `/swagger` or `/api-docs` in your browser
2. **Retrieve Token**: Click "Retrieve Token" to get a PingOne worker token
3. **Monitor Status**: Watch real-time token status and expiration countdown
4. **Test APIs**: Use the integrated Swagger UI with automatic authentication

### Token Management Workflow

#### Initial Setup
```javascript
// Token retrieval happens automatically when clicking "Retrieve Token"
// No manual configuration required if server credentials are properly set
```

#### Status Monitoring
- **Valid**: Green badge, shows expiration time and countdown
- **Expired**: Red badge, refresh button disabled
- **Error**: Red badge with error details
- **Unknown**: Gray badge, no token information available

#### Best Practices
- **Monitor Expiration**: Keep an eye on the countdown timer
- **Refresh Early**: Refresh tokens before they expire (recommended: 5+ minutes remaining)
- **Clear When Done**: Clear tokens when finished testing for security

### API Testing

#### Automatic Authentication
When a valid token is retrieved, it's automatically injected into Swagger UI:
```javascript
// Automatic integration - no manual setup required
window.ui.preauthorizeApiKey('BearerAuth', tokenValue);
```

#### Population Selection
1. Select a population from the enhanced dropdown
2. Visual feedback confirms selection
3. Population ID is available for API calls requiring population context

## Configuration

### Server-Side Setup

#### Environment Variables
```bash
# Required for token management
PINGONE_CLIENT_ID=your_client_id
PINGONE_CLIENT_SECRET=your_client_secret
PINGONE_ENVIRONMENT_ID=your_environment_id
PINGONE_REGION=your_region
AUTH_SUBSYSTEM_ENCRYPTION_KEY=your_encryption_key
```

#### Settings.json Configuration
```json
{
  "pingone": {
    "clientId": "your_client_id",
    "clientSecret": "encrypted_client_secret",
    "environmentId": "your_environment_id",
    "region": "your_region"
  }
}
```

### Client-Side Configuration

#### Event Listeners
The tool automatically sets up event listeners for:
- `worker-token-updated` - Token successfully retrieved/refreshed
- `worker-token-cleared` - Token cleared from system
- `population-selected` - Population selection changed
- `auth-token-updated` - General authentication updates

## Customization

### Styling Customization

#### High-Contrast Theme
```css
/* Override default colors for custom branding */
.swagger-header {
  background: #your-brand-color;
  border-bottom: 3px solid #your-accent-color;
}

.token-management-panel {
  background: #your-panel-color;
  border: 2px solid #your-border-color;
}
```

#### Button Styling
```css
/* Customize button appearance */
.btn-primary {
  background: #your-primary-color;
  border-color: #your-primary-color;
}
```

### Functionality Extension

#### Custom Token Handlers
```javascript
// Add custom event handlers
window.addEventListener('worker-token-updated', (event) => {
  // Custom logic for token updates
  console.log('Token updated:', event.detail);
});
```

#### Additional Status Checks
```javascript
// Extend token monitoring
function customTokenCheck() {
  // Add custom validation logic
  return tokenIsValid && customCondition;
}
```

## Troubleshooting

### Common Issues

#### Token Retrieval Fails
**Symptoms**: Error message when clicking "Retrieve Token"
**Solutions**:
1. Verify PingOne credentials in `.env` or `settings.json`
2. Check network connectivity
3. Validate PingOne environment configuration
4. Review server logs for detailed error information

#### Token Status Shows "Unknown"
**Symptoms**: Gray status badge, no expiration information
**Solutions**:
1. Check server health at `/api/health`
2. Verify authentication subsystem is running
3. Clear browser cache and reload
4. Check browser console for JavaScript errors

#### Population Loading Fails
**Symptoms**: Empty or error in population dropdown
**Solutions**:
1. Ensure valid token is retrieved first
2. Check PopulationSubsystem integration
3. Verify API permissions for population access
4. Review network requests in browser developer tools

### Error Messages

#### "Token retrieval failed: Network error"
- **Cause**: Server unreachable or network issues
- **Solution**: Check server status and network connectivity

#### "Invalid token response"
- **Cause**: Server returned unexpected response format
- **Solution**: Check server logs and API endpoint implementation

#### "Token refresh failed: Unauthorized"
- **Cause**: Current token is invalid or expired
- **Solution**: Clear token and retrieve a new one

## Security Considerations

### Data Protection
- **No Client Storage**: Tokens are never stored in browser storage
- **Secure Transmission**: All token operations use HTTPS
- **Error Sanitization**: Sensitive data never exposed in error messages
- **Request Validation**: All inputs validated server-side

### Best Practices
- **Regular Token Rotation**: Refresh tokens before expiration
- **Secure Credentials**: Store server credentials securely
- **Access Control**: Limit access to Swagger interface in production
- **Audit Logging**: Monitor token usage through server logs

## Testing

### Automated Tests
Run the comprehensive test suite:
```bash
# Run token management tests
npm test test/api/swagger-token-management.test.js

# Run all API tests
npm run test:api
```

### Manual Testing
1. **Token Lifecycle**: Test retrieve → refresh → clear workflow
2. **Error Handling**: Test with invalid credentials or network issues
3. **UI Responsiveness**: Test on different screen sizes and devices
4. **Integration**: Verify Swagger UI authentication works correctly

## Performance

### Optimization Features
- **Efficient Monitoring**: 1-second update intervals for token countdown
- **Smart Caching**: Server-side token caching with appropriate TTL
- **Lazy Loading**: Population data loaded on demand
- **Resource Cleanup**: Automatic cleanup of intervals and event listeners

### Monitoring
- **Token Usage**: Track token retrieval and refresh patterns
- **Error Rates**: Monitor failed token operations
- **Response Times**: Track API response performance
- **User Engagement**: Monitor feature usage and adoption

## Future Enhancements

### Planned Features
- **Multi-Environment Support**: Switch between different PingOne environments
- **Token History**: View recent token operations and status changes
- **Advanced Validation**: Enhanced token validation with detailed feedback
- **Export Capabilities**: Export API test results and token information

### Integration Opportunities
- **SSO Integration**: Single sign-on for token management
- **Role-Based Access**: Different token permissions based on user roles
- **Audit Dashboard**: Comprehensive audit trail for token operations
- **Mobile App**: Dedicated mobile interface for token management

## Support

### Documentation
- **API Reference**: Complete API documentation at `/api-docs`
- **Feature Guides**: Detailed guides in `/docs/features/`
- **Troubleshooting**: Common issues and solutions

### Getting Help
- **Server Logs**: Check `/logs/api.log` for detailed error information
- **Health Endpoint**: Monitor system status at `/api/health`
- **Debug Mode**: Enable debug logging for detailed troubleshooting

---

## Changelog

### Version 6.1.0 - Enhanced Swagger API Tool
- ✅ Professional "Swagger API Tool" branding and interface
- ✅ Comprehensive token management with secure HTTPS communication
- ✅ High-contrast, accessible design with improved readability
- ✅ Real-time token status display with expiration tracking
- ✅ Integration with existing authentication and settings subsystems
- ✅ Enhanced population management with visual feedback
- ✅ Comprehensive error handling and user feedback
- ✅ Extensive test coverage for token management features
- ✅ Complete documentation and usage guides

The Swagger API Tool represents a significant enhancement to the PingOne Import Tool's API documentation and testing capabilities, providing a professional, secure, and user-friendly interface for developers and administrators.
