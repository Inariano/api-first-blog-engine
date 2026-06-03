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

  test('should have mongodb uri as undefined in test env', () => {
    expect(config.mongodb.uri).toBeUndefined();
  });
});
