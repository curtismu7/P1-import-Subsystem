---
description: Automatic bundle testing on server restarts with auto-fix
---

# Automatic Bundle Testing and Auto-Fix Workflow

This workflow has been implemented to automatically test bundles on every server restart and fix any issues automatically.

## How It Works

1. **On Server Startup**: The bulletproof startup script now includes bundle verification as Step 3
2. **Auto-Fix**: If bundle verification fails, it automatically rebuilds the bundle
3. **Auto-Restart**: If auto-fix fails, the server retries startup up to 3 times
4. **Runtime Monitoring**: Every 5 minutes, the server checks bundle integrity
5. **Runtime Auto-Restart**: If bundle issues are detected during runtime, the server automatically restarts

## Implementation Details

The following changes were made to `scripts/bulletproof-startup.js`:

- Added `verifyBundleWithAutoFix()` function
- Integrated bundle verification into startup sequence
- Added retry logic with maximum 3 attempts
- Added periodic bundle verification every 5 minutes
- Added automatic restart on bundle failures during runtime
- Added proper cleanup of monitoring intervals on shutdown

## Manual Testing

To test the automated bundle verification:

```bash
# Start the server (will automatically run bundle tests)
npm start

# Manually verify bundle (same test that runs automatically)
npm run verify:build

# Force a bundle rebuild (what auto-fix does)
npm run build:bundle
```

## Monitoring

The server will log:
- ✅ Bundle verification passed
- ⚠️ Bundle verification failed, attempting auto-fix
- 🔧 Rebuilding bundle
- 🔄 Restarting server after bundle fix
- 🔍 Performing periodic bundle verification

## Benefits

- **Zero Downtime**: Automatic detection and fixing of bundle issues
- **Proactive Monitoring**: Catches bundle corruption before users encounter errors
- **Self-Healing**: Server automatically recovers from bundle-related failures
- **Reliability**: Ensures consistent bundle integrity across all server restarts
