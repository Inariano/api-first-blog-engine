describe('Config in development environment', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, NODE_ENV: 'development' };
    delete process.env.MONGODB_URI;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('should have null mongodb uri in development without MONGODB_URI', () => {
    const devConfig = require('../src/config');
    expect(devConfig.mongodb.uri).toBeNull();
  });

  test('should use MONGODB_URI when provided in development', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    const devConfig = require('../src/config');
    expect(devConfig.mongodb.uri).toBe('mongodb://localhost:27017/test');
  });
});
