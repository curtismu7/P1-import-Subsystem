---
description: restart server and rebuild
---

# Restart Server and Rebuild

This workflow restarts the PingOne Import Tool server and rebuilds the client bundle.

## Steps:

1. Stop any running server processes
// turbo
2. Build the client bundle
// turbo  
3. Start the server

## Commands:

### 1. Stop Server
```bash
npm run stop
```

### 2. Build Bundle
```bash
npm run build:bundle
```

### 3. Start Server
```bash
npm start
```

## Notes:
- The server runs on port 4000 by default
- Bundle is rebuilt to include any client-side changes
- Server will automatically handle port conflicts if needed
