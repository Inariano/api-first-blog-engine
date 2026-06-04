const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

describe('GET /health', () => {
  test('should return 200 OK and status up', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'up',
      environment: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  test('should respond with test environment', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.environment).toBe('test');
  });

  test('should respond with a valid ISO timestamp', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    const timestamp = new Date(response.body.timestamp);
    expect(timestamp.toISOString()).toBe(response.body.timestamp);
  });

  test('should accept requests with a valid token cookie', async () => {
    const token = jwt.sign({ id: 'test-id', role: 'admin', name: 'Test' }, 'dev-jwt-secret');

    const response = await request(app)
      .get('/health')
      .set('Cookie', `token=${token}`)
      .expect(200);

    expect(response.body.status).toBe('up');
  });

  test('should accept requests with an invalid token cookie', async () => {
    const response = await request(app)
      .get('/health')
      .set('Cookie', 'token=invalid-token')
      .expect(200);

    expect(response.body.status).toBe('up');
  });

  test('should include Content-Security-Policy header', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['content-security-policy']).toContain("'nonce-");
  });
});

describe('404 handler', () => {
  test('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/nonexistent-route')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toEqual({ error: 'Not found' });
  });

  test('should return 404 for /api/unknown', async () => {
    const response = await request(app)
      .get('/api/unknown')
      .expect(404);

    expect(response.body).toEqual({ error: 'Not found' });
  });
});

describe('Error handler', () => {
  test('should return 500 for unhandled errors', async () => {
    const response = await request(app)
      .get('/trigger-error')
      .expect(500);

    expect(response.body).toEqual({ error: 'Internal server error' });
  });
});
