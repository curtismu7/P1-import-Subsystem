---
description: Manage Import Maps Migration
---

# Import Maps Migration Workflow

This workflow helps manage the phased migration from Browserify bundling to ES Import Maps.

## Steps

1. Build the hybrid deployment (creates bundle and updates import maps)
// turbo
```bash
npm run import-maps:build
```

2. Convert selected modules to ES modules format
```bash
npm run import-maps:convert -- --dir=public/js/modules --verbose
```

3. Update the import maps configuration with new module paths
// turbo
```bash
npm run import-maps:update
```

4. Generate a deployment summary
// turbo
```bash
npm run import-maps:summary
```

5. Test the application with import maps
```bash
npm run restart:safe
```

6. Open the application in a browser that supports import maps
```bash
open http://localhost:4000
```

7. Check for any errors in the browser console

8. Update version number and commit changes
```bash
npm run version:update
git add .
git commit -m "Import Maps Migration: Phase progress"
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
