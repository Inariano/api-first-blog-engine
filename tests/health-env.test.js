describe('Health endpoint with different environments', () => {
  const OLD_ENV = process.env;

  afterEach(() => {
    process.env = OLD_ENV;
    jest.resetModules();
  });

  test('should fallback to development when NODE_ENV is not set', async () => {
    delete process.env.NODE_ENV;
    jest.resetModules();

    const request = require('supertest');
    const app = require('../src/app');

    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.environment).toBe('development');
  });

  test('should use production environment when set', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://example.com';
    jest.resetModules();

    const request = require('supertest');
    const app = require('../src/app');

    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.environment).toBe('production');
  });
});
