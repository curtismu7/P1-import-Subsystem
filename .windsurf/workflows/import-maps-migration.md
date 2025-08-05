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
- ✅ Update import-maps-loader.js to use centralized version
- ✅ Update app-module.js to use centralized version

## Phase 2: Module Conversion & Testing (Current)

1. Check the current migration status
// turbo
```bash
npm run import-maps:migration-status
```

2. Analyze the bundle to identify modules for migration
// turbo
```bash
npm run import-maps:analyze
```

3. Convert selected modules to ES modules format (replace PATH_TO_MODULE with actual path)
```bash
npm run import-maps:migrate PATH_TO_MODULE
```

4. Update the import maps configuration with new module paths
// turbo
```bash
npm run import-maps:update
```

5. Build a new bundle for fallback support
// turbo
```bash
npm run build:bundle
```

6. Restart the server to apply changes
```bash
npm run restart:safe
```

7. Test in browsers with import maps support
```bash
open http://localhost:4000?mode=import-maps
```

8. Test in browsers with bundle fallback
```bash
open http://localhost:4000?mode=bundle
```

## Phase 3: Production Optimization & Deployment

1. Update the centralized version to reflect import maps migration
// turbo
```bash
npm run version:update:centralized
```

2. Test the application with import maps in production mode
```bash
NODE_ENV=production npm run start:importmaps
```

3. Commit changes to GitHub with version update
```bash
/commit-to-github
```

4. Monitor performance and error rates after deployment
```bash
npm run monitor:performance
```
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
