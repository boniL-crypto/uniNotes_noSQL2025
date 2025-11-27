const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');

describe('Uploads memoryStorage behavior (no staging files)', () => {
  const avatarsFinalDir = path.join(process.cwd(), 'uploads', 'avatars');

  function listFiles(dir) {
    try { return fs.readdirSync(dir).map(f => path.join(dir, f)); } catch (_) { return []; }
  }

  test('avatar upload rejects fake jpg by magic check and writes nothing', async () => {
    const before = listFiles(avatarsFinalDir);

    const res = await request(app)
      .post('/api/auth/register')
      .field('name', 'Test User')
      .field('email', 'test@msugensan.edu.ph')
      .field('password', 'Aa1!aa')
      .field('confirmPassword', 'Aa1!aa')
      .field('studentId', '2024-1234')
      .field('college', 'CIT')
      .field('course', 'CS')
      .attach('avatar', Buffer.from('not an image'), 'fake.jpg');

    expect(res.status).toBe(400);
    expect(res.body && res.body.message).toBeDefined();

    const after = listFiles(avatarsFinalDir);
    // No files should be written to final dir on rejection
    expect(after.length).toBe(before.length);
  });

  test('registration with invalid inputs writes no avatar (inputs-first)', async () => {
    const before = listFiles(avatarsFinalDir);

    const res = await request(app)
      .post('/api/auth/register')
      .field('name', 'Test User')
      .field('email', 'invalid@example.com') // wrong domain
      .field('password', 'Aa1!aa')
      .field('confirmPassword', 'Aa1!aa')
      .field('studentId', '2024-1234')
      .field('college', 'CIT')
      .field('course', 'CS')
      .attach('avatar', Buffer.from('still not an image'), 'fake.jpg');

    expect(res.status).toBe(400);
    const after = listFiles(avatarsFinalDir);
    expect(after.length).toBe(before.length);
  });
});
