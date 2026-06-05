const requireRole = require('../../src/middlewares/rbac');

describe('requireRole', () => {
  test('should call next() when role is allowed', () => {
    const req = { user: { role: 'admin' } };
    const res = {};
    const next = jest.fn();

    requireRole('admin', 'writer')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('should return 403 when role is not allowed', () => {
    const req = { user: { role: 'subscriber' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireRole('admin', 'writer')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
  });

  test('should return 403 when user is not authenticated', () => {
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireRole('admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('should accept multiple roles', () => {
    const req = { user: { role: 'writer' } };
    const res = {};
    const next = jest.fn();

    requireRole('admin', 'writer', 'subscriber')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('should return 403 for empty roles list', () => {
    const req = { user: { role: 'admin' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireRole()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
