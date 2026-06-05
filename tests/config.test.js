const config = require('../src/config');

describe('Config', () => {
  test('should have default values', () => {
    expect(config).toHaveProperty('env', 'test');
    expect(config).toHaveProperty('port', 3000);
    expect(config).toHaveProperty('host', '0.0.0.0');
  });

  test('should have session and jwt configs', () => {
    expect(config.session).toHaveProperty('secret');
    expect(config.jwt).toHaveProperty('secret');
    expect(config.jwt).toHaveProperty('expiresIn', '7d');
  });

  test('should have corsOrigin with default value', () => {
    expect(config).toHaveProperty('corsOrigin', 'http://localhost:3000');
  });

  test('should have mongodb config', () => {
    expect(config.mongodb).toBeDefined();
    expect(Object.keys(config.mongodb)).toContain('uri');
  });
});
