const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/index');

jest.mock('../src/redis', () => ({
  set: jest.fn().mockResolvedValue(true),
  get: jest.fn().mockResolvedValue('https://example.com'),
  list: jest.fn().mockResolvedValue([
    { code: 'abc123', url: 'https://example.com', createdAt: new Date().toISOString(), enabled: true, clicks: 0 },
  ]),
  del: jest.fn().mockResolvedValue(1),
  incrementClick: jest.fn().mockResolvedValue(undefined),
  toggle: jest.fn().mockResolvedValue(false),
}));

const redis = require('../src/redis');

describe('Enable/Disable Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue('https://example.com');
    redis.toggle.mockResolvedValue(false);
  });

  test('PATCH /api/:code/toggle returns 200 with code and enabled fields', async () => {
    const res = await request(app).patch('/api/abc123/toggle');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('code', 'abc123');
    expect(res.body).toHaveProperty('enabled');
  });

  test('PATCH /api/:code/toggle returns enabled: false when toggled off', async () => {
    redis.toggle.mockResolvedValue(false);

    const res = await request(app).patch('/api/abc123/toggle');

    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);
  });

  test('PATCH /api/:code/toggle returns enabled: true when toggled on', async () => {
    redis.toggle.mockResolvedValue(true);

    const res = await request(app).patch('/api/abc123/toggle');

    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
  });

  test('PATCH /api/:code/toggle returns 404 when code not found', async () => {
    redis.toggle.mockResolvedValue(null);

    const res = await request(app).patch('/api/notfound/toggle');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  test('GET /:code returns 404 when URL is disabled (redis.get returns null)', async () => {
    redis.get.mockResolvedValueOnce(null);

    const res = await request(app).get('/abc123');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  test('GET /api/urls returns entries with an enabled field', async () => {
    const res = await request(app).get('/api/urls');

    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('enabled');
    expect(typeof res.body[0].enabled).toBe('boolean');
  });

  test('www/app.js renders a toggle button with toggle-btn class', () => {
    const js = fs.readFileSync(path.join(__dirname, '../www/app.js'), 'utf8');

    expect(js).toContain('toggle-btn');
  });

  test('www/icons.svg contains icon-toggle-on and icon-toggle-off symbols', () => {
    const svg = fs.readFileSync(path.join(__dirname, '../www/icons.svg'), 'utf8');

    expect(svg).toContain('id="icon-toggle-on"');
    expect(svg).toContain('id="icon-toggle-off"');
  });
});
