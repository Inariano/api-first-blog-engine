const { csrfProtection, csrfValidate } = require('../../src/middlewares/csrf');

describe('CSRF Middleware', () => {
  describe('csrfProtection', () => {
    test('should generate a CSRF token if none exists in session', () => {
      const req = { session: {} };
      const res = { locals: {} };
      const next = jest.fn();

      csrfProtection(req, res, next);

      expect(req.session.csrfToken).toBeDefined();
      expect(typeof req.session.csrfToken).toBe('string');
      expect(req.session.csrfToken.length).toBeGreaterThan(0);
      expect(res.locals.csrfToken).toBe(req.session.csrfToken);
      expect(next).toHaveBeenCalled();
    });

    test('should not overwrite existing CSRF token', () => {
      const req = { session: { csrfToken: 'existing-token' } };
      const res = { locals: {} };
      const next = jest.fn();

      csrfProtection(req, res, next);

      expect(req.session.csrfToken).toBe('existing-token');
      expect(res.locals.csrfToken).toBe('existing-token');
      expect(next).toHaveBeenCalled();
    });

    test('should expose token in res.locals', () => {
      const req = { session: {} };
      const res = { locals: {} };
      const next = jest.fn();

      csrfProtection(req, res, next);

      expect(res.locals.csrfToken).toBe(req.session.csrfToken);
    });
  });

  describe('csrfValidate', () => {
    test('should call next() for GET requests', () => {
      const req = { method: 'GET', headers: {} };
      const res = {};
      const next = jest.fn();

      csrfValidate(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should call next() when CSRF token is valid', () => {
      const req = {
        method: 'POST',
        session: { csrfToken: 'valid-token' },
        body: { _csrf: 'valid-token' },
        headers: {},
      };
      const res = {};
      const next = jest.fn();

      csrfValidate(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should redirect when CSRF token is missing', () => {
      const req = {
        method: 'POST',
        session: { csrfToken: 'valid-token' },
        body: {},
        headers: {},
        get: jest.fn().mockReturnValue(null),
      };
      const res = { redirect: jest.fn() };
      const next = jest.fn();

      csrfValidate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(req.session.error).toBeDefined();
      expect(res.redirect).toHaveBeenCalled();
    });

    test('should redirect when CSRF token does not match', () => {
      const req = {
        method: 'POST',
        session: { csrfToken: 'session-token' },
        body: { _csrf: 'wrong-token' },
        headers: {},
        get: jest.fn().mockReturnValue(null),
      };
      const res = { redirect: jest.fn() };
      const next = jest.fn();

      csrfValidate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(req.session.error).toBeDefined();
      expect(res.redirect).toHaveBeenCalled();
    });

    test('should redirect to Referrer header when available', () => {
      const req = {
        method: 'POST',
        session: { csrfToken: 'session-token' },
        body: { _csrf: 'wrong-token' },
        headers: {},
        get: jest.fn().mockReturnValue('/some-page'),
      };
      const res = { redirect: jest.fn() };
      const next = jest.fn();

      csrfValidate(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/some-page');
    });

    test('should return 403 for HTMX requests with invalid CSRF', () => {
      const req = {
        method: 'POST',
        session: { csrfToken: 'session-token' },
        body: { _csrf: 'wrong-token' },
        headers: { 'hx-request': 'true' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const next = jest.fn();

      csrfValidate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Invalid or expired CSRF token');
    });
  });
});
