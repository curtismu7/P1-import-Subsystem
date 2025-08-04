---
description: Manage Import Maps Migration
---

# Import Maps Migration Workflow

This workflow helps manage the phased migration from Browserify bundling to ES Import Maps.

## Phase 1: Setup & Configuration (Completed)

- ✅ Create import-maps.json configuration
- ✅ Create import-maps-loader.js for progressive enhancement
- ✅ Create app-module.js ES module entry point
- ✅ Configure HTML to use import maps with bundle fallback

## Phase 2: Module Conversion & Testing (Current)

1. Clean up old bundles to ensure we're using the latest code
// turbo
```bash
npm run cleanup:bundles
```

2. Convert selected modules to ES modules format
```bash
npm run import-maps:convert -- --module=logger
```

3. Update the import maps configuration with new module paths
// turbo
```bash
npm run import-maps:update
```

4. Build a new bundle for fallback support
// turbo
```bash
npm run build:bundle
```

5. Restart the server to apply changes
```bash
npm run restart:safe
```

6. Test in browsers with import maps support
```bash
open http://localhost:4000?mode=modules
```

7. Test in browsers without import maps support
```bash
open http://localhost:4000?mode=bundle
```

8. Check for any errors in the browser console

9. Update version number and commit changes
// turbo
```bash
/commit-to-github
```

## Phase 3: Full Migration (Future)

1. Convert all remaining modules to ES format
```bash
npm run import-maps:convert-all
```

2. Update all import statements to use import maps paths
```bash
npm run import-maps:update-imports
```

3. Remove bundle generation from build process
```bash
npm run import-maps:finalize
```

4. Update HTML to remove bundle fallback
```bash
npm run import-maps:clean-html
```

5. Final testing and deployment
```bash
npm run test:all
npm run deploy
```
git push origin main
```

## Additional Commands

### Create only the bundle
```bash
npm run import-maps:bundle
```

### Convert a specific module to ES format
```bash
npm run module:convert -- --file=public/js/modules/your-module.js --backup
```

### Test browser compatibility
```bash
npm run import-maps:summary -- --browser-support
```
