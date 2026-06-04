const csp = require('../../src/middlewares/csp');

describe('CSP Nonce Middleware', () => {
  test('should generate a nonce and set it in res.locals and res', () => {
    const req = {};
    const res = { locals: {} };
    const next = jest.fn();

    csp(req, res, next);

    expect(res.locals.nonce).toBeDefined();
    expect(typeof res.locals.nonce).toBe('string');
    expect(res.locals.nonce.length).toBeGreaterThan(0);
    expect(res.nonce).toBe(res.locals.nonce);
    expect(next).toHaveBeenCalled();
  });

  test('should generate unique nonces across requests', () => {
    const nonces = new Set();

    for (let i = 0; i < 10; i++) {
      const req = {};
      const res = { locals: {} };
      const next = jest.fn();
      csp(req, res, next);
      nonces.add(res.locals.nonce);
    }

    expect(nonces.size).toBe(10);
  });
});
