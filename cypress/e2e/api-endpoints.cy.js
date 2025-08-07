// Cypress API endpoint tests (client perspective)
const BASE_URL = Cypress.env('P1IMPORT_BASE_URL') || 'http://localhost:4000';

describe('API Endpoints (Client Perspective)', () => {
  it('GET /api/health returns health status', () => {
    cy.request(`${BASE_URL}/api/health`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('success');
      expect(response.body).to.have.property('status');
      expect(['healthy', 'ok']).to.include(response.body.status);
      expect(response.body).to.have.property('checks');
    });
  });

  it('GET /api/status returns system status', () => {
    cy.request(`${BASE_URL}/api/status`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('server');
      expect(response.body).to.have.property('memory');
      expect(response.body).to.have.property('environment');
    });
  });

  it('GET /api/version returns version info', () => {
    cy.request(`${BASE_URL}/api/version`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('version');
      expect(response.body).to.have.property('buildTime');
    });
  });
});
