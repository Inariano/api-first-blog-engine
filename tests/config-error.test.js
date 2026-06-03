describe('Config validation error', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('should exit and log error when PORT is invalid', () => {
    const exitMock = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Config validation failed');
    });
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

    process.env.PORT = 'not-a-number';
    delete process.env.NODE_ENV;

    expect(() => {
      require('../src/config');
    }).toThrow('Config validation failed');

    expect(exitMock).toHaveBeenCalledWith(1);
    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Invalid environment variables:',
      expect.any(Object),
    );

    exitMock.mockRestore();
    consoleErrorMock.mockRestore();
  });
});
