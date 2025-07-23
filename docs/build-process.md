# Build Process Documentation

## Overview

The PingOne Import Tool uses a robust build system based on Browserify to bundle JavaScript modules into a single file for browser consumption. This document explains the build process, available commands, and best practices.

## Build Commands

### Standard Build Commands

- `npm run build` - Unified build process (recommended)
- `npm run build:prod` - Production build with optimizations
- `npm run build:bundle` - Basic bundle build
- `npm run build:optimized` - Build and minify bundle
- `npm run minify:bundle` - Minify an existing bundle
- `npm run analyze:bundle` - Analyze bundle size and composition
- `npm run verify:build` - Verify build consistency

### Advanced Build Commands

- `npm run build:production` - Full production build with analysis
- `npm run build:production:quick` - Quick production build
- `npm run build:bundle:direct` - Direct bundle build with HTML update
- `npm run build:bundle:legacy` - Legacy bundle build (for compatibility)

## Build Process Details

1. **Bundle Creation**:
   - Entry point: `src/client/app.js`
   - Output: `public/js/bundle-{version}.js` or `public/js/bundle-{timestamp}.js`
   - Uses Browserify with Babel for transpilation

2. **Bundle Reference Update**:
   - Updates `index.html` to reference the new bundle
   - Creates/updates `bundle-manifest.json` with bundle information

3. **Minification** (Production builds):
   - Uses Terser to minify and compress the bundle
   - Removes comments and whitespace
   - Preserves class and function names for debugging

4. **Verification**:
   - Runs automatically after builds via post-build hooks
   - Checks bundle existence, HTML references, and integrity hashes
   - Verifies bundle content and size

## Bundle Manifest

The `public/js/bundle-manifest.json` file tracks information about the current bundle:

```json
{
  "version": "6.5.1.1",
  "bundleFile": "bundle-v6.5.1.1.js",
  "hash": "913e82e7e1667d513d2bf0635178c3fe990f0dc31fc27545b2052a1988cd2737",
  "size": 663337,
  "timestamp": "2025-07-22T12:37:01.814Z",
  "integrity": "sha256-913e82e7e1667d513d2bf0635178c3fe990f0dc31fc27545b2052a1988cd2737",
  "cacheControl": "public, max-age=31536000, immutable"
}
```

## Best Practices

1. **Always use npm scripts** for building, not direct commands
2. **Use the unified build command** (`npm run build`) for most cases
3. **Verify builds** after making changes to ensure consistency
4. **Check the bundle manifest** to confirm the correct bundle is being used
5. **Run the verification script** if you suspect build inconsistencies
6. **Keep package.json version** in sync with application version

## Troubleshooting

### Bundle Not Updated in Browser

1. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
2. Verify HTML references the correct bundle (`public/index.html`)
3. Check bundle manifest for correct information

### Build Verification Failures

1. Check error messages from the verification script
2. Ensure all required files exist (bundle, manifest, index.html)
3. Verify HTML contains the correct bundle reference
4. Check file permissions if files can't be read or written

### Bundle Size Issues

1. Run `npm run analyze:bundle` to identify large dependencies
2. Consider code splitting for large modules
3. Check for duplicate dependencies

## Build System Files

- `scripts/unified-build.js` - Unified build process
- `scripts/update-bundle-reference.js` - Updates HTML references
- `scripts/verify-build.js` - Verifies build consistency
- `scripts/analyze-bundle.js` - Analyzes bundle composition
- `scripts/minify-bundle.js` - Minifies bundle for production
- `scripts/production-bundle-optimizer.js` - Production build optimization