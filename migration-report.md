# Unified Token Management Migration Report

Generated: 2025-08-05T21:52:45.590Z

## 📊 Summary

- **Files scanned**: 267
- **Files with matches**: 53
- **Total matches**: 546

### Pattern Breakdown

- 🔴 **directLocalStorage**: 197 matches (HIGH priority)
- 🟡 **tokenManagers**: 129 matches (MEDIUM priority)
- 🟡 **tokenValidation**: 83 matches (MEDIUM priority)
- 🟢 **legacyTokenKeys**: 137 matches (LOW priority)

## 🎯 Migration Priorities

### 🔴 High Priority (Must Fix)
Direct localStorage access that bypasses the unified token manager.

### 🟡 Medium Priority (Should Fix)
Token manager instances and validation logic that should use unified methods.

### 🟢 Low Priority (Will Migrate Automatically)
Legacy token keys that are automatically migrated by the unified system.

## 🔍 Detailed Findings

### 🔴 HIGH Priority Files (21)

#### `public/js/app.js`

**Line 1540**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 1570**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 1607**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 3663**: `directLocalStorage`
```javascript
const storedToken = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 3664**: `directLocalStorage`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 3677**: `directLocalStorage`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 3656**: `tokenManagers`
```javascript
const token = await this.pingOneClient.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 1543**: `tokenValidation`
```javascript
if (Date.now() < expiryTime) {
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 1573**: `tokenValidation`
```javascript
if (Date.now() < expiryTime) {
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 1610**: `tokenValidation`
```javascript
if (Date.now() < expiryTime) {
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 1542**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 1572**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 1609**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 3669**: `tokenValidation`
```javascript
expiryTime: storedExpiry ? new Date(parseInt(storedExpiry)).toISOString() : null
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 3680**: `tokenValidation`
```javascript
const expiryTime = parseInt(storedExpiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 3663**: `legacyTokenKeys`
```javascript
const storedToken = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 1540**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 1570**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 1607**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 3664**: `legacyTokenKeys`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 3677**: `legacyTokenKeys`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `public/js/bundle-1754341289.js`

**Line 14706**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 14707**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 18827**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 18828**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19665**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19666**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19721**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19722**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20050**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20051**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 24375**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 24946**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25517**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25518**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 28893**: `directLocalStorage`
```javascript
const storedToken = localStorage.getItem('pingone_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 28894**: `directLocalStorage`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19919**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 19921**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 24265**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_cache', JSON.stringify(tokenInfo));
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 24402**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 24810**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 24909**: `directLocalStorage`
```javascript
localStorage.removeItem('tokenManagerHistory');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 24972**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 12006**: `tokenManagers`
```javascript
await this.subsystems.tokenManager.init();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12110**: `tokenManagers`
```javascript
if (this.tokenManager && typeof this.tokenManager.getToken === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12111**: `tokenManagers`
```javascript
const token = await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12397**: `tokenManagers`
```javascript
return await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 18811**: `tokenManagers`
```javascript
const status = window.app.tokenManager.getTokenStatus();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 19171**: `tokenManagers`
```javascript
await window.app.tokenManager.refreshToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 21977**: `tokenManagers`
```javascript
if (this.app?.subsystems?.tokenManager && typeof this.app.subsystems.tokenManager.initialize === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 21978**: `tokenManagers`
```javascript
await this.app.subsystems.tokenManager.initialize();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 28877**: `tokenManagers`
```javascript
const appTokenInfo = window.app.tokenManager.getTokenInfo();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 17554**: `tokenValidation`
```javascript
if (this.tokenInfo.expiresAt && Date.now() >= this.tokenInfo.expiresAt) {
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 17812**: `tokenValidation`
```javascript
return this.tokenInfo.isValid && this.tokenInfo.token && this.tokenInfo.expiresAt && Date.now() < this.tokenInfo.expiresAt;
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 14711**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 18830**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19674**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19730**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 20059**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 25525**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 28896**: `tokenValidation`
```javascript
const expiryTime = parseInt(storedExpiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 14706**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 18827**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19665**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19721**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19919**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20050**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 25517**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 14707**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 18828**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19666**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19722**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19921**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20051**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 25518**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 28894**: `legacyTokenKeys`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `public/js/bundle-1754424897.js`

**Line 14803**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 14804**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19046**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19047**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19884**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19885**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19940**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19941**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20269**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20270**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 24594**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25165**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25736**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25737**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 29112**: `directLocalStorage`
```javascript
const storedToken = localStorage.getItem('pingone_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 29113**: `directLocalStorage`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20138**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 20140**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 24484**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_cache', JSON.stringify(tokenInfo));
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 24621**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25029**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25128**: `directLocalStorage`
```javascript
localStorage.removeItem('tokenManagerHistory');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25191**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 12047**: `tokenManagers`
```javascript
await this.subsystems.tokenManager.init();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12151**: `tokenManagers`
```javascript
if (this.tokenManager && typeof this.tokenManager.getToken === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12152**: `tokenManagers`
```javascript
const token = await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12438**: `tokenManagers`
```javascript
return await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 19030**: `tokenManagers`
```javascript
const status = window.app.tokenManager.getTokenStatus();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 19390**: `tokenManagers`
```javascript
await window.app.tokenManager.refreshToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 22196**: `tokenManagers`
```javascript
if (this.app?.subsystems?.tokenManager && typeof this.app.subsystems.tokenManager.initialize === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 22197**: `tokenManagers`
```javascript
await this.app.subsystems.tokenManager.initialize();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 29096**: `tokenManagers`
```javascript
const appTokenInfo = window.app.tokenManager.getTokenInfo();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 17773**: `tokenValidation`
```javascript
if (this.tokenInfo.expiresAt && Date.now() >= this.tokenInfo.expiresAt) {
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 18031**: `tokenValidation`
```javascript
return this.tokenInfo.isValid && this.tokenInfo.token && this.tokenInfo.expiresAt && Date.now() < this.tokenInfo.expiresAt;
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 14808**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19049**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19893**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19949**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 20278**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 25744**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 29115**: `tokenValidation`
```javascript
const expiryTime = parseInt(storedExpiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 14803**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19046**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19884**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19940**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20138**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20269**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 25736**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 14804**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19047**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19885**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19941**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20140**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20270**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 25737**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 29113**: `legacyTokenKeys`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `public/js/bundle-1754425681.js`

**Line 14803**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 14804**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19046**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19047**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19884**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19885**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19940**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19941**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20269**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20270**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 24594**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25165**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25736**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25737**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 29112**: `directLocalStorage`
```javascript
const storedToken = localStorage.getItem('pingone_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 29113**: `directLocalStorage`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20138**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 20140**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 24484**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_cache', JSON.stringify(tokenInfo));
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 24621**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25029**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25128**: `directLocalStorage`
```javascript
localStorage.removeItem('tokenManagerHistory');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25191**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 12047**: `tokenManagers`
```javascript
await this.subsystems.tokenManager.init();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12151**: `tokenManagers`
```javascript
if (this.tokenManager && typeof this.tokenManager.getToken === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12152**: `tokenManagers`
```javascript
const token = await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12438**: `tokenManagers`
```javascript
return await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 19030**: `tokenManagers`
```javascript
const status = window.app.tokenManager.getTokenStatus();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 19390**: `tokenManagers`
```javascript
await window.app.tokenManager.refreshToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 22196**: `tokenManagers`
```javascript
if (this.app?.subsystems?.tokenManager && typeof this.app.subsystems.tokenManager.initialize === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 22197**: `tokenManagers`
```javascript
await this.app.subsystems.tokenManager.initialize();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 29096**: `tokenManagers`
```javascript
const appTokenInfo = window.app.tokenManager.getTokenInfo();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 17773**: `tokenValidation`
```javascript
if (this.tokenInfo.expiresAt && Date.now() >= this.tokenInfo.expiresAt) {
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 18031**: `tokenValidation`
```javascript
return this.tokenInfo.isValid && this.tokenInfo.token && this.tokenInfo.expiresAt && Date.now() < this.tokenInfo.expiresAt;
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 14808**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19049**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19893**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19949**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 20278**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 25744**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 29115**: `tokenValidation`
```javascript
const expiryTime = parseInt(storedExpiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 14803**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19046**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19884**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19940**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20138**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20269**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 25736**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 14804**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19047**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19885**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19941**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20140**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20270**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 25737**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 29113**: `legacyTokenKeys`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `public/js/bundle-1754427028.js`

**Line 14803**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 14804**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19046**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19047**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19884**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19885**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19940**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19941**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20269**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20270**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 24594**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25165**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25736**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25737**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 29112**: `directLocalStorage`
```javascript
const storedToken = localStorage.getItem('pingone_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 29113**: `directLocalStorage`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20138**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 20140**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 24484**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_cache', JSON.stringify(tokenInfo));
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 24621**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25029**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25128**: `directLocalStorage`
```javascript
localStorage.removeItem('tokenManagerHistory');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25191**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 12047**: `tokenManagers`
```javascript
await this.subsystems.tokenManager.init();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12151**: `tokenManagers`
```javascript
if (this.tokenManager && typeof this.tokenManager.getToken === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12152**: `tokenManagers`
```javascript
const token = await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12438**: `tokenManagers`
```javascript
return await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 19030**: `tokenManagers`
```javascript
const status = window.app.tokenManager.getTokenStatus();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 19390**: `tokenManagers`
```javascript
await window.app.tokenManager.refreshToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 22196**: `tokenManagers`
```javascript
if (this.app?.subsystems?.tokenManager && typeof this.app.subsystems.tokenManager.initialize === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 22197**: `tokenManagers`
```javascript
await this.app.subsystems.tokenManager.initialize();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 29096**: `tokenManagers`
```javascript
const appTokenInfo = window.app.tokenManager.getTokenInfo();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 17773**: `tokenValidation`
```javascript
if (this.tokenInfo.expiresAt && Date.now() >= this.tokenInfo.expiresAt) {
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 18031**: `tokenValidation`
```javascript
return this.tokenInfo.isValid && this.tokenInfo.token && this.tokenInfo.expiresAt && Date.now() < this.tokenInfo.expiresAt;
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 14808**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19049**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19893**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19949**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 20278**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 25744**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 29115**: `tokenValidation`
```javascript
const expiryTime = parseInt(storedExpiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 14803**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19046**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19884**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19940**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20138**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20269**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 25736**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 14804**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19047**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19885**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19941**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20140**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20270**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 25737**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 29113**: `legacyTokenKeys`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `public/js/bundle-1754429656.js`

**Line 14803**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 14804**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19046**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19047**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19884**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19885**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19940**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19941**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20269**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20270**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 24594**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25165**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25736**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25737**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 29112**: `directLocalStorage`
```javascript
const storedToken = localStorage.getItem('pingone_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 29113**: `directLocalStorage`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20138**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 20140**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 24484**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_cache', JSON.stringify(tokenInfo));
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 24621**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25029**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25128**: `directLocalStorage`
```javascript
localStorage.removeItem('tokenManagerHistory');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25191**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 12047**: `tokenManagers`
```javascript
await this.subsystems.tokenManager.init();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12151**: `tokenManagers`
```javascript
if (this.tokenManager && typeof this.tokenManager.getToken === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12152**: `tokenManagers`
```javascript
const token = await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12438**: `tokenManagers`
```javascript
return await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 19030**: `tokenManagers`
```javascript
const status = window.app.tokenManager.getTokenStatus();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 19390**: `tokenManagers`
```javascript
await window.app.tokenManager.refreshToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 22196**: `tokenManagers`
```javascript
if (this.app?.subsystems?.tokenManager && typeof this.app.subsystems.tokenManager.initialize === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 22197**: `tokenManagers`
```javascript
await this.app.subsystems.tokenManager.initialize();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 29096**: `tokenManagers`
```javascript
const appTokenInfo = window.app.tokenManager.getTokenInfo();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 17773**: `tokenValidation`
```javascript
if (this.tokenInfo.expiresAt && Date.now() >= this.tokenInfo.expiresAt) {
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 18031**: `tokenValidation`
```javascript
return this.tokenInfo.isValid && this.tokenInfo.token && this.tokenInfo.expiresAt && Date.now() < this.tokenInfo.expiresAt;
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 14808**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19049**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19893**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19949**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 20278**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 25744**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 29115**: `tokenValidation`
```javascript
const expiryTime = parseInt(storedExpiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 14803**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19046**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19884**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19940**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20138**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20269**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 25736**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 14804**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19047**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19885**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19941**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20140**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20270**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 25737**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 29113**: `legacyTokenKeys`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `public/js/bundle-1754429866.js`

**Line 14803**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 14804**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19046**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19047**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19884**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19885**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19940**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 19941**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20269**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20270**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 24594**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25165**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25736**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 25737**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 29112**: `directLocalStorage`
```javascript
const storedToken = localStorage.getItem('pingone_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 29113**: `directLocalStorage`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 20138**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 20140**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 24484**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_cache', JSON.stringify(tokenInfo));
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 24621**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25029**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25128**: `directLocalStorage`
```javascript
localStorage.removeItem('tokenManagerHistory');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 25191**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 12047**: `tokenManagers`
```javascript
await this.subsystems.tokenManager.init();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12151**: `tokenManagers`
```javascript
if (this.tokenManager && typeof this.tokenManager.getToken === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12152**: `tokenManagers`
```javascript
const token = await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 12438**: `tokenManagers`
```javascript
return await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 19030**: `tokenManagers`
```javascript
const status = window.app.tokenManager.getTokenStatus();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 19390**: `tokenManagers`
```javascript
await window.app.tokenManager.refreshToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 22196**: `tokenManagers`
```javascript
if (this.app?.subsystems?.tokenManager && typeof this.app.subsystems.tokenManager.initialize === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 22197**: `tokenManagers`
```javascript
await this.app.subsystems.tokenManager.initialize();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 29096**: `tokenManagers`
```javascript
const appTokenInfo = window.app.tokenManager.getTokenInfo();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 17773**: `tokenValidation`
```javascript
if (this.tokenInfo.expiresAt && Date.now() >= this.tokenInfo.expiresAt) {
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 18031**: `tokenValidation`
```javascript
return this.tokenInfo.isValid && this.tokenInfo.token && this.tokenInfo.expiresAt && Date.now() < this.tokenInfo.expiresAt;
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 14808**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19049**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19893**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 19949**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 20278**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 25744**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 29115**: `tokenValidation`
```javascript
const expiryTime = parseInt(storedExpiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 14803**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19046**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19884**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19940**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20138**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20269**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 25736**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 14804**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19047**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19885**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 19941**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20140**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 20270**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 25737**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 29113**: `legacyTokenKeys`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `public/js/modules/credentials-modal.js`

**Line 1079**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 1080**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 564**: `tokenManagers`
```javascript
const token = await window.app.pingOneClient.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 801**: `tokenManagers`
```javascript
window.app.pingOneClient.getAccessToken().then(token => {
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 1006**: `tokenManagers`
```javascript
const token = await window.app.pingOneClient.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 1086**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 1079**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 1080**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `public/js/modules/export-manager.js`

**Line 264**: `directLocalStorage`
```javascript
localStorage.setItem('exportToken', token);
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 265**: `directLocalStorage`
```javascript
localStorage.setItem('exportTokenExpires', expiresAt);
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 285**: `directLocalStorage`
```javascript
localStorage.removeItem('exportToken');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 286**: `directLocalStorage`
```javascript
localStorage.removeItem('exportTokenExpires');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 264**: `legacyTokenKeys`
```javascript
localStorage.setItem('exportToken', token);
```
💡 **Suggestion**: Replace with unified token access

**Line 285**: `legacyTokenKeys`
```javascript
localStorage.removeItem('exportToken');
```
💡 **Suggestion**: Replace with unified token access

**Line 265**: `legacyTokenKeys`
```javascript
localStorage.setItem('exportTokenExpires', expiresAt);
```
💡 **Suggestion**: Replace with unified token access

**Line 286**: `legacyTokenKeys`
```javascript
localStorage.removeItem('exportTokenExpires');
```
💡 **Suggestion**: Replace with unified token access

#### `public/js/modules/pingone-client.js`

**Line 71**: `directLocalStorage`
```javascript
const storedToken = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 72**: `directLocalStorage`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 108**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_worker_token', token);
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 109**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 137**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 138**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 382**: `tokenManagers`
```javascript
const token = await this.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 75**: `tokenValidation`
```javascript
const expiryTime = parseInt(storedExpiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 71**: `legacyTokenKeys`
```javascript
const storedToken = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 108**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_worker_token', token);
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 137**: `legacyTokenKeys`
```javascript
localStorage.removeItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 72**: `legacyTokenKeys`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 109**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 138**: `legacyTokenKeys`
```javascript
localStorage.removeItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `public/js/modules/token-status-indicator.js`

**Line 235**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 236**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 259**: `directLocalStorage`
```javascript
const tokenCache = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 594**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_worker_token', data.access_token);
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 595**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 239**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 235**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 594**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_worker_token', data.access_token);
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 236**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 595**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `src/client/components/global-token-manager.js`

**Line 114**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 115**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 121**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 114**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 115**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `src/client/components/ui-manager.js`

**Line 914**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 915**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 921**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 914**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 915**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `src/client/subsystems/enhanced-token-status-subsystem.js`

**Line 304**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 305**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 288**: `tokenManagers`
```javascript
const status = window.app.tokenManager.getTokenStatus();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 666**: `tokenManagers`
```javascript
await window.app.tokenManager.refreshToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 308**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 304**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 305**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `src/client/subsystems/global-token-manager-subsystem.js`

**Line 447**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 448**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 498**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 499**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 830**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 831**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 696**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 698**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 454**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 505**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 837**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 447**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 498**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 696**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_worker_token', tokenResult.access_token);
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 830**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 448**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 499**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 698**: `legacyTokenKeys`
```javascript
localStorage.setItem('pingone_token_expiry', expiryTime.toString());
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 831**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `src/client/subsystems/token-manager-subsystem-hardened.js`

**Line 106**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 648**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 92**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_cache', JSON.stringify(tokenInfo));
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 130**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 511**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 611**: `directLocalStorage`
```javascript
localStorage.removeItem('tokenManagerHistory');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 675**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

#### `src/client/subsystems/token-manager-subsystem.js`

**Line 208**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 790**: `directLocalStorage`
```javascript
const stored = localStorage.getItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 102**: `directLocalStorage`
```javascript
localStorage.setItem('pingone_token_cache', JSON.stringify(tokenInfo));
```
💡 **Suggestion**: Replace with: await TokenAccess.setToken(token, expiresAt)

**Line 234**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 651**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 753**: `directLocalStorage`
```javascript
localStorage.removeItem('tokenManagerHistory');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 817**: `directLocalStorage`
```javascript
localStorage.removeItem('pingone_token_cache');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

#### `src/client/subsystems/token-notification-subsystem.js`

**Line 211**: `directLocalStorage`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 212**: `directLocalStorage`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 218**: `tokenValidation`
```javascript
const expiryTime = parseInt(expiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 211**: `legacyTokenKeys`
```javascript
const token = localStorage.getItem('pingone_worker_token');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 212**: `legacyTokenKeys`
```javascript
const expiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `src/client/utils/bulletproof-token-manager.js`

**Line 317**: `directLocalStorage`
```javascript
const storedToken = localStorage.getItem('pingone_token');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 318**: `directLocalStorage`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 301**: `tokenManagers`
```javascript
const appTokenInfo = window.app.tokenManager.getTokenInfo();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 321**: `tokenValidation`
```javascript
const expiryTime = parseInt(storedExpiry);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 318**: `legacyTokenKeys`
```javascript
const storedExpiry = localStorage.getItem('pingone_token_expiry');
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

#### `src/shared/token-integration-helper.js`

**Line 51**: `directLocalStorage`
```javascript
* Get current token (replaces localStorage.getItem('*token*'))
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 67**: `directLocalStorage`
```javascript
* Clear token (replaces localStorage.removeItem('*token*'))
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 285**: `tokenManagers`
```javascript
token = await existingManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 167**: `legacyTokenKeys`
```javascript
'pingone_worker_token',
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 168**: `legacyTokenKeys`
```javascript
'pingone_token_expiry',
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 169**: `legacyTokenKeys`
```javascript
'exportToken',
```
💡 **Suggestion**: Replace with unified token access

**Line 170**: `legacyTokenKeys`
```javascript
'exportTokenExpires'
```
💡 **Suggestion**: Replace with unified token access

#### `src/shared/unified-token-manager.js`

**Line 458**: `directLocalStorage`
```javascript
localStorage.removeItem('exportToken');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 459**: `directLocalStorage`
```javascript
localStorage.removeItem('exportTokenExpires');
```
💡 **Suggestion**: Replace with: await TokenAccess.clearToken()

**Line 182**: `tokenValidation`
```javascript
return this._tokenCache.expiresAt <= Date.now();
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 430**: `tokenValidation`
```javascript
const expiresAt = parseInt(legacyExpiry, 10);
```
💡 **Suggestion**: Use unified validation instead of manual parsing

**Line 12**: `legacyTokenKeys`
```javascript
LEGACY_TOKEN: 'pingone_worker_token',
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 13**: `legacyTokenKeys`
```javascript
LEGACY_EXPIRY: 'pingone_token_expiry',
```
💡 **Suggestion**: Migrated automatically to pingone_token_cache

**Line 458**: `legacyTokenKeys`
```javascript
localStorage.removeItem('exportToken');
```
💡 **Suggestion**: Replace with unified token access

**Line 459**: `legacyTokenKeys`
```javascript
localStorage.removeItem('exportTokenExpires');
```
💡 **Suggestion**: Replace with unified token access

### 🟡 MEDIUM Priority Files (32)

#### `public/js/modules/api-factory.js`

**Line 24**: `tokenManagers`
```javascript
const tokenManager = new TokenManager(logger, settings);
```
💡 **Suggestion**: Use unified TokenAccess instead of creating new instances

#### `public/js/modules/connection-manager-subsystem.js`

**Line 260**: `tokenValidation`
```javascript
if (this.tokenInfo.expiresAt && Date.now() >= this.tokenInfo.expiresAt) {
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 524**: `tokenValidation`
```javascript
Date.now() < this.tokenInfo.expiresAt;
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

#### `public/js/modules/global-token-manager.js`

**Line 341**: `tokenManagers`
```javascript
await window.app.pingOneClient.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `public/js/modules/pingone-api.js`

**Line 7**: `tokenManagers`
```javascript
this.tokenManager = new TokenManager(logger, this.getCurrentSettings());
```
💡 **Suggestion**: Use unified TokenAccess instead of creating new instances

**Line 49**: `tokenManagers`
```javascript
this.tokenManager.updateSettings(this.getCurrentSettings());
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 50**: `tokenManagers`
```javascript
return await this.tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 61**: `tokenManagers`
```javascript
this.tokenManager.clearToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 117**: `tokenManagers`
```javascript
this.tokenManager.updateSettings(this.getCurrentSettings());
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 50**: `tokenManagers`
```javascript
return await this.tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 147**: `tokenManagers`
```javascript
requestHeaders['Authorization'] = `Bearer ${await this.getAccessToken()}`;
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 166**: `tokenManagers`
```javascript
'Authorization': `Bearer ${await this.getAccessToken()}`,
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `public/js/modules/token-management/token-manager.js`

**Line 309**: `tokenManagers`
```javascript
return new TokenManager(tokenService, tokenStatusProvider, logger, options);
```
💡 **Suggestion**: Use unified TokenAccess instead of creating new instances

#### `public/js/modules/token-manager.js`

**Line 135**: `tokenManagers`
```javascript
const newToken = await this.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 174**: `tokenManagers`
```javascript
const token = await this.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `public/js/modules/token-refresh-handler.js`

**Line 28**: `tokenManagers`
```javascript
const currentToken = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 47**: `tokenManagers`
```javascript
return tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 79**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `public/js/token-logging-enhancement.js`

**Line 333**: `tokenManagers`
```javascript
const tokenStatus = window.app.tokenManager.getTokenStatus();
```
💡 **Suggestion**: Replace with TokenAccess methods

#### `routes/api/credential-management.js`

**Line 402**: `tokenManagers`
```javascript
const token = await enhancedAuth.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `routes/api/index.js`

**Line 274**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 1497**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 1742**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 2279**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 2335**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 2671**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 2735**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `routes/pingone-proxy-fixed.js`

**Line 424**: `tokenManagers`
```javascript
token = await workerTokenManager.getAccessToken({
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `routes/pingone-proxy-new.js`

**Line 120**: `tokenManagers`
```javascript
const token = await workerTokenManager.getAccessToken({
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `routes/pingone-proxy.js`

**Line 123**: `tokenManagers`
```javascript
token = await workerTokenManager.getAccessToken({
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 207**: `tokenManagers`
```javascript
token = await workerTokenManager.getAccessToken({
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `server/services/token-service.js`

**Line 33**: `tokenValidation`
```javascript
if (this.tokenCache.accessToken && Date.now() < this.tokenCache.expiresAt - 30000) {
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

#### `server/token-manager.js`

**Line 353**: `tokenManagers`
```javascript
const newToken = await this.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 388**: `tokenManagers`
```javascript
const token = await this.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `auth-subsystem/client/index.js`

**Line 24**: `tokenManagers`
```javascript
* const token = await pingOneAuth.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 49**: `tokenManagers`
```javascript
* const token = await pingOneAuth.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 104**: `tokenManagers`
```javascript
return await this.authClient.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 173**: `tokenManagers`
```javascript
const token = await this.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `auth-subsystem/server/enhanced-server-auth.js`

**Line 64**: `tokenManagers`
```javascript
const token = await this.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 272**: `tokenManagers`
```javascript
const token = await this.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 255**: `tokenValidation`
```javascript
hasValidToken: this.token && this.tokenExpiry > Date.now(),
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

#### `auth-subsystem/server/index.js`

**Line 64**: `tokenManagers`
```javascript
* const token = await pingOneAuth.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 72**: `tokenManagers`
```javascript
*     const token = await pingOneAuth.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 86**: `tokenManagers`
```javascript
*     const token = await pingOneAuth.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 128**: `tokenManagers`
```javascript
* const token = await pingOneAuth.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 273**: `tokenManagers`
```javascript
const token = await pingOneAuth.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `auth-subsystem/server/pingone-auth.js`

**Line 415**: `tokenManagers`
```javascript
await this.getAccessToken(customSettings);
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `src/auth/pingone-auth.js`

**Line 113**: `tokenValidation`
```javascript
if (this.tokenData && this.tokenExpiry > Date.now() / 1000) {
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

#### `src/client/app.js`

**Line 747**: `tokenManagers`
```javascript
await this.subsystems.tokenManager.init();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 853**: `tokenManagers`
```javascript
if (this.tokenManager && typeof this.tokenManager.getToken === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 854**: `tokenManagers`
```javascript
const token = await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 1144**: `tokenManagers`
```javascript
return await this.tokenManager.getToken();
```
💡 **Suggestion**: Replace with TokenAccess methods

#### `src/client/components/token-manager.js`

**Line 135**: `tokenManagers`
```javascript
const newToken = await this.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 174**: `tokenManagers`
```javascript
const token = await this.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `src/client/subsystems/connection-manager-subsystem.js`

**Line 260**: `tokenValidation`
```javascript
if (this.tokenInfo.expiresAt && Date.now() >= this.tokenInfo.expiresAt) {
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

**Line 525**: `tokenValidation`
```javascript
Date.now() < this.tokenInfo.expiresAt;
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

#### `src/client/subsystems/navigation-subsystem.js`

**Line 537**: `tokenManagers`
```javascript
if (this.app?.subsystems?.tokenManager && typeof this.app.subsystems.tokenManager.initialize === 'function') {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 538**: `tokenManagers`
```javascript
await this.app.subsystems.tokenManager.initialize();
```
💡 **Suggestion**: Replace with TokenAccess methods

#### `src/client/token-manager-init.js`

**Line 352**: `tokenManagers`
```javascript
if (app.tokenManager && app.tokenManager.destroy) {
```
💡 **Suggestion**: Replace with TokenAccess methods

**Line 353**: `tokenManagers`
```javascript
app.tokenManager.destroy();
```
💡 **Suggestion**: Replace with TokenAccess methods

#### `src/health/health-check.js`

**Line 179**: `tokenManagers`
```javascript
const token = await this.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `src/server/api/api/index.js`

**Line 254**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 1469**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 1707**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 2244**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 2300**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 2636**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 2700**: `tokenManagers`
```javascript
const token = await tokenManager.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `src/server/api/pingone-proxy-fixed.js`

**Line 415**: `tokenManagers`
```javascript
token = await workerTokenManager.getAccessToken({
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `src/server/api/pingone-proxy-new.js`

**Line 197**: `tokenManagers`
```javascript
const token = await workerTokenManager.getAccessToken({
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `src/server/api/pingone-proxy.js`

**Line 123**: `tokenManagers`
```javascript
token = await workerTokenManager.getAccessToken({
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

#### `src/server/services/startup-optimizer.js`

**Line 577**: `tokenValidation`
```javascript
Date.now() < this.cache.tokenExpiry;
```
💡 **Suggestion**: Replace with: TokenAccess.validateTokenExpiry(component)

#### `src/server/services/token-manager.js`

**Line 343**: `tokenManagers`
```javascript
const newToken = await this.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

**Line 378**: `tokenManagers`
```javascript
const token = await this.getAccessToken();
```
💡 **Suggestion**: Replace with: await TokenAccess.getToken()

## 🛠️ Migration Steps

### Step 1: Initialize Unified Token Manager
```javascript
import { initializeUnifiedTokenManager } from './src/client/token-manager-init.js';

// In your main application initialization
await initializeUnifiedTokenManager(app);
```

### Step 2: Replace Direct localStorage Access
```javascript
// Before (❌)
const token = localStorage.getItem('pingone_worker_token');

// After (✅)
const token = await TokenAccess.getToken();
```

### Step 3: Replace Token Manager Instances
```javascript
// Before (❌)
const token = await this.tokenManager.getAccessToken();

// After (✅)
const token = await TokenAccess.getToken();
```

### Step 4: Replace Token Validation
```javascript
// Before (❌)
const isExpired = Date.now() > parseInt(localStorage.getItem("pingone_token_expiry"));

// After (✅)
const validation = TokenAccess.validateTokenExpiry("my-component");
const isExpired = validation.status === "expired";
```

## 🧪 Testing

Run the comprehensive test suite after migration:
```bash
npm test -- unified-token-manager.test.js
```
