# Settings Page Token Information Fix

## Problem
The Settings page was showing "Token: Invalid" even when a valid token was available. The issue was that the Settings page was not using the proper API endpoint to retrieve token status, unlike other parts of the frontend.

## Root Cause
The Settings page was using `this.app.tokenStatus` which was not properly synchronized with the server-side token status. Other subsystems like `GlobalTokenManagerSubsystem` and `TokenManagerSubsystem` use the `/api/v1/auth/token` endpoint to get accurate token status.

## Solution

### 1. **Updated Token Status Retrieval**
- Changed from using `this.app.tokenStatus` to calling the proper API endpoint `/api/v1/auth/token`
- Added fallback to localStorage like other subsystems
- Added error handling with fallback to app token status

### 2. **Enhanced Token Status Method**
```javascript
async getTokenStatusFromServer() {
    try {
        // Use the same endpoint as other subsystems
        const response = await fetch('/api/v1/auth/token');
        if (response.ok) {
            const serverTokenInfo = await response.json();
            
            if (serverTokenInfo.success && serverTokenInfo.tokenInfo) {
                return {
                    isValid: serverTokenInfo.tokenInfo.isValid,
                    timeLeft: serverTokenInfo.tokenInfo.timeLeft || 0,
                    expiresAt: serverTokenInfo.tokenInfo.expiresAt ? new Date(serverTokenInfo.tokenInfo.expiresAt) : null,
                    source: 'server'
                };
            }
        }
        
        // Fallback to localStorage like other subsystems
        const token = localStorage.getItem('pingone_worker_token');
        const expiry = localStorage.getItem('pingone_token_expiry');
        
        if (!token || !expiry) {
            return { isValid: false, timeLeft: 0, expiresAt: null, source: 'localStorage' };
        }
        
        const expiryTime = parseInt(expiry);
        const currentTime = Date.now();
        const timeLeft = Math.floor((expiryTime - currentTime) / 1000);
        
        return {
            isValid: true,
            timeLeft: Math.max(0, timeLeft),
            expiresAt: new Date(expiryTime),
            source: 'localStorage'
        };
        
    } catch (error) {
        console.error('Error getting token status from server:', error);
        throw error;
    }
}
```

### 3. **Updated Refresh Token Handler**
- Changed from using `this.app.getToken()` to direct API call to `/api/v1/auth/token`
- Properly updates both app token status and Settings page display
- Uses consistent API endpoint with other subsystems

### 4. **Added Proper Error Handling**
- Fallback to app token status if server call fails
- Graceful degradation with localStorage fallback
- Comprehensive logging for debugging

## Key Changes Made

### **File: `public/js/pages/settings-page.js`**

1. **Updated `updateTokenInfo()` method**:
   - Now calls `getTokenStatusFromServer()` instead of using `this.app.tokenStatus`
   - Added proper error handling with fallback
   - Enhanced logging for debugging

2. **Added `getTokenStatusFromServer()` method**:
   - Uses `/api/v1/auth/token` endpoint like other subsystems
   - Includes localStorage fallback
   - Returns consistent token status format

3. **Added `updateTokenInfoFromApp()` method**:
   - Fallback method using app token status
   - Ensures display always shows some status

4. **Updated `handleRefreshToken()` method**:
   - Uses proper API endpoint for token refresh
   - Updates both app status and Settings display
   - Consistent with other subsystems

5. **Added `formatTimeLeft()` method**:
   - Local time formatting method
   - Consistent with other parts of the application

## Testing Results

### **Before Fix**
- Settings page showed "Token: Invalid" even with valid token
- Token status was not synchronized with server
- Refresh token functionality was inconsistent

### **After Fix**
- ✅ Settings page correctly shows "Token: Valid" when token is valid
- ✅ Token status is properly synchronized with server
- ✅ Refresh token functionality works correctly
- ✅ Proper error handling and fallbacks
- ✅ Consistent with other subsystems

## Verification

The fix was verified using browser-based testing:

```bash
npx playwright test tests/playwright/settings-focus-fix-test.spec.js --headed
```

**Result**: ✅ **PASSED** - Token status now correctly shows "Token: Valid"

## Impact

- **Settings page now properly displays token status**
- **Consistent with other subsystems** (GlobalTokenManager, TokenManager)
- **Proper error handling and fallbacks**
- **Enhanced user experience** with accurate token information
- **Maintains compatibility** with existing app functionality

The Settings page token information section now works correctly and displays accurate token status using the same API endpoints as the rest of the application.
