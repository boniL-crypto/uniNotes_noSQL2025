const request = require('supertest');
const app = require('../server');

// Merged routes smoke tests: we only assert routing/middleware wiring.
// Expectations: 401/403 for protected endpoints without auth, not 404.

describe('Merged routes (admin subpaths under feature routers)', () => {
  test('GET /api/notes/admin -> protected (not 404)', async () => {
    const res = await request(app).get('/api/notes/admin');
    expect([401,403]).toContain(res.status);
  });

  test('GET /api/notes/admin/kpis/summary -> protected', async () => {
    const res = await request(app).get('/api/notes/admin/kpis/summary');
    expect([401,403]).toContain(res.status);
  });

  test('GET /api/notes/abc -> protected', async () => {
    const res = await request(app).get('/api/notes/abc');
    expect([401,403]).toContain(res.status);
  });

  test('GET /api/subjects/admin -> protected', async () => {
    const res = await request(app).get('/api/subjects/admin');
    expect([401,403]).toContain(res.status);
  });

  test('GET /api/colleges/admin -> protected', async () => {
    const res = await request(app).get('/api/colleges/admin');
    expect([401,403]).toContain(res.status);
  });

  test('GET /api/notifications/admin/outgoing -> protected', async () => {
    const res = await request(app).get('/api/notifications/admin/outgoing');
    expect([401,403]).toContain(res.status);
  });

  test('GET /api/reports/admin -> protected', async () => {
    const res = await request(app).get('/api/reports/admin');
    expect([401,403]).toContain(res.status);
  });

  test('GET /api/users -> protected', async () => {
    const res = await request(app).get('/api/users');
    expect([401,403]).toContain(res.status);
  });

  test('GET /api/dashboard/stats -> protected', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect([401,403]).toContain(res.status);
  });
});
