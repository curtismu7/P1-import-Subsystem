# Architectural Analysis – Migrating from Bundles to Import Maps

## 1. Module Loading & Bundling
- **Current State:**
  - Frontend uses Browserify/Webpack for bundling, Babel for transpilation.
  - Mix of CommonJS (`require`, `module.exports`) and ES Modules (`import/export`).
  - Global dependencies: jQuery, Bootstrap, PingOne SDKs, socket.io-client, axios.
  - Aliased paths handled in compatibility layer.
  - Babel plugins for dynamic import, top-level await, CommonJS transforms.
  - Circular dependencies possible in legacy modules.
  - Dynamic imports present, with fallback logic.

- **Potential Blockers:**
  - Legacy CommonJS modules.
  - Aliased imports must be mapped in import map.
  - Reliance on globals injected by bundlers.
  - Circular dependencies may cause runtime errors.
  - Dynamic imports must be ES module compatible.
  - Some third-party libraries may not be available as ES modules or may have CORS issues from CDN.

- **Steps to Decouple:**
  1. Convert CommonJS to ES Modules (use migration scripts).
  2. Refactor aliased imports and update import map.
  3. Remove bundler-specific shims and globals.
  4. Refactor circular dependencies.
  5. Update entry points to use `<script type="module">` and `<script type="importmap">`.

---

## 2. Import Map Structure
- Create `public/import-maps.json` or inline in HTML.
- Use semantic versioning for CDN modules.
- Map all local modules and aliases.

---

## 3. Update Module References
- Replace all `require()` and `module.exports` with `import`/`export`.
- Update paths to match import map.
- Refactor entry points and subsystems to use ES module syntax.

---

## 4. Testing & Validation
- Test in modern browsers.
- Validate all modules load via import map.
- Check for CORS issues on CDN modules.
- Refactor/remove circular dependencies.
- Ensure no reliance on non-module globals.

---


## 5. Hardening
- Add fail-safe logging for failed imports (see error handler in `index-import-maps.html`).
- Maintain fallback to legacy bundle (hybrid loader) if import maps fail or browser is unsupported.
- Use semantic versioning for CDN imports in `public/import-maps.json`.
- **Rollback Plan:**
    1. If import maps fail or browser is unsupported, user is redirected to `/index.html` (legacy bundle).
    2. All ES module changes are tracked in git; revert to previous commit to restore bundle-based loading.
    3. Legacy bundle and entry points remain available for immediate rollback.
    4. Document any issues in this plan and update with solutions.

---

**Tracking:**
- Check off each step as completed.
- Document issues and solutions for each phase.
