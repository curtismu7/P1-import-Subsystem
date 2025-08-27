## Comprehensive Test & Diagnostics Playbook

### Quick Test Commands

- Route availability (fast, clear pass/fail):
```bash
npm run test:routes | tee test-results/test-routes.out
```

- Unit, Integration, E2E (capture output):
```bash
npm run test:unit | tee test-results/unit.out
npm run test:integration | tee test-results/integration.out
npm run test:e2e | tee test-results/e2e.out
```

### Live Error Visibility

- Foreground server with trace warnings:
```bash
NODE_OPTIONS=--trace-warnings npm run start:foreground
```

- Tail logs with error highlights:
```bash
tail -f logs/server-error.log logs/api.log logs/server.log | \
egrep --line-buffered -i 'error|warn|500|503|uncaught|unhandled|MaxListeners'
```

### Current Issues Observed (8/26)

- res.notFound is not a function in error handler (404 paths hit error handler without helper attached).
- 503 on /api/auth/status, /api/auth/current-credentials, /api/auth/refresh-token (credential subsystem not initialized/credentials missing).
- 404 on legacy endpoints (/api/pingone/environments, /api/pingone/token, /api/token) – callers should use current endpoints.
- MaxListenersExceededWarning (duplicate process/logger listeners across restarts).
- 500 on /api/export-users when tokenManager missing from app context.

### Targeted Fixes

- Error handler: stop calling `res.notFound` or ensure response-standardization mounts it first. Safe fallback:
  - `res.status(404).json({ success:false, error:'Not Found', path:req.originalUrl })`.
- Auth 503s: validate `data/settings.json` has `environmentId`, `clientId`, `clientSecret`, `region`:
```bash
npm run validate:settings
```
  - Provide test-safe creds or stub auth in tests as needed.
- Update callers of legacy endpoints to current:
  - `/api/token/status`, `/api/token/refresh`, `/api/pingone/test-connection`.
- Avoid duplicate server starts; prefer:
```bash
npm run restart:safe
```
- Ensure `tokenManager` is set on app during startup for `/api/export-users`.

### Useful Mappings

- Token status: `/api/token/status`
- Refresh token: `/api/token/refresh`
- Test connection: `/api/pingone/test-connection`
- Export users: `POST /api/export-users` (requires `populationId`, optional `format=json|csv`, `fields=all|basic|custom`)

### Log Triage Snippets

- Last 150 server errors:
```bash
tail -n 150 logs/server-error.log
```
- Recent API entries:
```bash
tail -n 120 logs/api.log
```
- Recent server info/warnings:
```bash
tail -n 120 logs/server.log
```

### CI-Friendly Run

```bash
npm run test:ci | tee test-results/ci.out
```

### Notes

- Keep UI/tests aligned to active API surface to prevent 404 churn.
- Watch for MaxListeners warnings; avoid adding global listeners on every restart.

