import axios from 'axios';

const BASE_URL = process.env.P1IMPORT_BASE_URL || 'http://localhost:4000';

describe('API Endpoints (client perspective)', () => {
  it('should return health status', async () => {
    const res = await axios.get(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('success');
    expect(res.data).toHaveProperty('status');
  });

  it('should return system status', async () => {
    const res = await axios.get(`${BASE_URL}/api/status`);
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('server');
    expect(res.data).toHaveProperty('memory');
    expect(res.data).toHaveProperty('environment');
  });

  it('should return version info', async () => {
    const res = await axios.get(`${BASE_URL}/api/version`);
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('version');
    expect(res.data).toHaveProperty('buildTime');
  });
});
