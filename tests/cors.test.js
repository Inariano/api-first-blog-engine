const request = require('supertest');
const app = require('../src/app');

describe('CORS headers', () => {
  test('should include Access-Control-Allow-Origin in non-production', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe('*');
  });

  test('should include Access-Control-Allow-Credentials', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  test('should respond to preflight OPTIONS request', async () => {
    const response = await request(app)
      .options('/health')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['access-control-allow-methods']).toBeDefined();
  });
});
