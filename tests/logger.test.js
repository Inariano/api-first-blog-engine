describe('Logger', () => {
  const OLD_ENV = process.env;

  afterEach(() => {
    process.env = OLD_ENV;
    jest.resetModules();
  });

  test('should have info, warn, error, debug methods', () => {
    const logger = require('../src/utils/logger');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  test('should log messages without throwing', () => {
    const logger = require('../src/utils/logger');
    expect(() => {
      logger.info('test info message');
      logger.warn('test warn message');
      logger.error('test error message');
      logger.debug('test debug message');
    }).not.toThrow();
  });

  test('should use debug level in development environment', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const devLogger = require('../src/utils/logger');
    expect(devLogger.level).toBe('debug');
  });

  test('should use info level in production environment', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const prodLogger = require('../src/utils/logger');
    expect(prodLogger.level).toBe('info');
  });
});
