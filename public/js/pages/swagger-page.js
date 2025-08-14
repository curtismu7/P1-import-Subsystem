// Swagger Page Module

export class SwaggerPage {
  constructor(app) {
    this.app = app;
    this.isLoaded = false;
  }

  async load() {
    if (this.isLoaded) return;
    const container = document.getElementById('swagger-page');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header">
        <h1><i class="icon-code"></i> API Documentation</h1>
        <p>Interactive Swagger UI for the server API</p>
      </div>
      <section class="swagger-section">
        <div class="swagger-actions" style="margin-bottom: 12px; display:flex; gap:12px; align-items:center;">
                          <a class="btn btn-danger" href="/swagger.html" target="_blank" rel="noopener">Open in New Tab</a>
          <a class="btn btn-outline-info" href="/swagger.json" target="_blank" rel="noopener">View OpenAPI JSON</a>
        </div>
        <iframe id="swagger-iframe" title="Swagger UI" src="/swagger.html" style="width:100%; height: calc(100vh - 220px); border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; background: white;"></iframe>
      </section>
    `;

    this.isLoaded = true;
  }

  unload() {}
}


