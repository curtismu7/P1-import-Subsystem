---
description: Rebuild bundle and restart server with import maps
---

# TestIt - Quick Rebuild and Restart

This workflow quickly rebuilds the JavaScript bundle with import maps prioritization and restarts the server.

## Steps

1. Check import maps summary
// turbo
```bash
npm run import-maps:summary
```

2. Update import maps if available
// turbo
```bash
npm run import-maps:update
```

3. Rebuild the bundle with import maps prioritization
// turbo
```bash
npm run build:bundle:import-maps || npm run build:bundle
```

4. Clean up old bundles
// turbo
```bash
npm run cleanup:bundles
```

5. Show the current bundle information
// turbo
```bash
cat public/js/bundle-manifest.json
```

6. Restart the server
// turbo
```bash
npm run restart
```

7. Check server status
// turbo
```bash
curl -s http://localhost:4000/api/health | jq || echo "Server not responding yet"
```

8. Display current version
// turbo
```bash
node -e "console.log('🚀 PingOne Import Tool v' + require('./package.json').version + ' is running')"
```
