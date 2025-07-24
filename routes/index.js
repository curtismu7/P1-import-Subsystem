import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Example route
router.get("/test", (req, res) => {
    res.json({ message: "API is working!" });
});

// Settings route - redirect to main app which handles settings view
router.get('/settings', (req, res) => {
    res.redirect('/');
});

// SECTION: Test UI Routes
// Serve the worker token manager test UI
router.get('/test-token-manager', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'test-token-manager.html'));
});

router.get('/', (req, res) => {
  const manifestPath = path.join(process.cwd(), 'public/js/bundle-manifest.json');
  let bundleFile = 'js/bundle.js'; // fallback
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    bundleFile = 'js/' + manifest.bundleFile;
  } catch (e) {
    console.error('Could not read bundle manifest:', e);
  }
  // Read the static HTML
  let html = fs.readFileSync(path.join(process.cwd(), 'public/index.html'), 'utf8');
  // Replace the placeholder with the correct bundle
  html = html.replace('<!-- BUNDLE_PLACEHOLDER -->', `<script src="${bundleFile}" id="main-bundle"></script>`);
  // Inject a frontend check
  html = html.replace('</body>', `  <script>\n    (function() {\n      var script = document.getElementById('main-bundle');\n      if (!script || !script.src.includes('${bundleFile.split('/').pop()}')) {\n        document.body.insertAdjacentHTML('afterbegin', '<div style=\\"background:red;color:white;padding:10px;\\">ERROR: Bundle not loaded correctly!</div>');\n      }\n    })();\n  </script>\n</body>`);
  res.send(html);
});

export default router;
