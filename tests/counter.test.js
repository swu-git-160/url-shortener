const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/index');

jest.mock('../src/redis', () => ({
  set: jest.fn().mockResolvedValue(true),
  get: jest.fn().mockResolvedValue('https://example.com'),
  list: jest.fn().mockResolvedValue([
    { code: 'abc123', url: 'https://example.com', createdAt: new Date().toISOString(), enabled: true, clicks: 42 },
  ]),
  del: jest.fn().mockResolvedValue(1),
  incrementClick: jest.fn().mockResolvedValue(undefined),
  toggle: jest.fn().mockResolvedValue(true),
}));

const redis = require('../src/redis');

describe('Click Counter Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue('https://example.com');
  });

  test('GET /:code calls incrementClick with the correct code', async () => {
    await request(app).get('/abc123');

    expect(redis.incrementClick).toHaveBeenCalledWith('abc123');
  });

  test('GET /:code does not call incrementClick when code not found', async () => {
    redis.get.mockResolvedValueOnce(null);

    await request(app).get('/notfound');

    expect(redis.incrementClick).not.toHaveBeenCalled();
  });

  test('GET /api/urls returns entries with a clicks field', async () => {
    const res = await request(app).get('/api/urls');

    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('clicks');
    expect(typeof res.body[0].clicks).toBe('number');
  });

  test('GET /api/urls returns correct clicks value', async () => {
    const res = await request(app).get('/api/urls');

    expect(res.body[0].clicks).toBe(42);
  });

  test('www/index.html has a Clicks column in the table', () => {
    const html = fs.readFileSync(path.join(__dirname, '../www/index.html'), 'utf8');

    expect(html).toContain('>Clicks<');
  });
});
