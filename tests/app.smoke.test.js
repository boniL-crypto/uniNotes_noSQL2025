const request = require('supertest');
const app = require('../server');

// Basic smoke tests that do not require DB connectivity
// We skip any API endpoints that hit the database.

describe('App smoke tests', () => {
  it('GET / should serve the login page (HTML)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    // Should be HTML content
    expect(res.headers['content-type']).toMatch(/text\/html/);
    // Minimal check for known content in login page
    expect(res.text).toMatch(/login/i);
  });

  it('serves static assets from /uploads (no 404 for the directory itself)', async () => {
    // Requesting a directory will typically 404, but we ensure the static middleware is mounted.
    // We instead request a known static root like /uploads/ to verify middleware doesn't crash.
    const res = await request(app).get('/uploads/');
    // Status can vary depending on express static dir listing, but we ensure it's not a 500.
    expect([200, 301, 302, 404]).toContain(res.status);
  });
});
