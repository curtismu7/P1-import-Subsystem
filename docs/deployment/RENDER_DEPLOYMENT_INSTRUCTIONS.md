# Render Deployment & Verification Instructions

## 1. Git Push

Open your terminal and run:

```sh
git add .
git commit -m "Deploy latest version with Swagger fixes and token health check"
git push origin master   # or replace 'master' with the branch Render is watching (e.g., 'main' or 'production')
```

---

## 2. Update Render Build Settings

Go to your [Render dashboard](https://dashboard.render.com/) and select your service. In the settings:

- **Build Command:**  
  - `npm run build` (or leave blank if not needed)
- **Start Command:**  
  - `npm start`  
  - or `node server.js` (whichever starts your app)
- **Environment Variables:**  
  - `PING_CLIENT_ID` (or `PINGONE_CLIENT_ID`)
  - `PING_CLIENT_SECRET` (or `PINGONE_CLIENT_SECRET`)
  - `PING_ENV_ID` (or `PINGONE_ENVIRONMENT_ID`)
  - `TOKEN_URL`
  - `FRONTEND_URL`
  - `NODE_ENV=production`
- **Health Check Path:**  
  - `/api/health`  
  - Expect HTTP 200 OK

Make sure all variables match your code’s expectations (e.g., check for `PINGONE_` vs `PING_` prefixes).

---

## 3. Post-Deployment Endpoint Tests

After Render finishes building and deploying:

### Manually (or via script), check:

- `https://<your-render-app>.onrender.com/api/health`  
  - Should return HTTP 200 and JSON with `"status": "ok"` and a valid `"pingOneTokenStatus"`
- `https://<your-render-app>.onrender.com/swagger.html`  
  - Should load the Swagger UI and show your live API endpoints
- `https://<your-render-app>.onrender.com/import`  
  - Should render the import dashboard with no errors

#### Optional: Automated Check Script

```js
// test-endpoints.js
const fetch = require('node-fetch');
const endpoints = [
  '/api/health',
  '/swagger.html',
  '/import'
];
const base = 'https://<your-render-app>.onrender.com';

(async () => {
  for (const ep of endpoints) {
    try {
      const res = await fetch(base + ep);
      const text = await res.text();
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      if (ep === '/api/health' && !text.includes('"status":"ok"')) throw new Error('Health check failed');
      console.log(`${ep}: OK`);
    } catch (e) {
      console.error(`${ep}: FAIL - ${e.message}`);
      process.exit(1);
    }
  }
})();
```

---

## 4. Log Results and Raise Errors

- If any endpoint fails or returns invalid JSON, log the error and investigate.
- Render’s dashboard will also show build and runtime logs for troubleshooting.

---

## Summary

After these steps, your latest build will be live on Render, with Swagger UI, token health, and public views all verified and working.

If you want a fully automated CI/CD pipeline (e.g., with GitHub Actions), let me know and I can provide a workflow file! 