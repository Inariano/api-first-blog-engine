const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn(),
}));

jest.mock('../../src/models/BlacklistedToken', () => ({
  findOne: jest.fn(),
}));

const auth = require('../../src/middlewares/auth');

describe('Auth Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  test('should return 401 when no Authorization header', () => {
    auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when Authorization header does not start with Bearer', () => {
    req.headers.authorization = 'Basic some-token';

    auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
  });

  test('should return 401 when token is invalid', () => {
    jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });
    req.headers.authorization = 'Bearer invalid-token';

    auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  test('should return 401 when token is blacklisted', async () => {
    const BlacklistedToken = require('../../src/models/BlacklistedToken');
    jwt.verify.mockReturnValue({ id: 'user-id', role: 'writer' });
    BlacklistedToken.findOne.mockResolvedValue({ token: 'blacklisted-token' });
    req.headers.authorization = 'Bearer blacklisted-token';

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token has been revoked' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should set req.user and call next when token is valid and not blacklisted', async () => {
    const BlacklistedToken = require('../../src/models/BlacklistedToken');
    jwt.verify.mockReturnValue({ id: 'user-id', role: 'writer' });
    BlacklistedToken.findOne.mockResolvedValue(null);
    req.headers.authorization = 'Bearer valid-token';

    await auth(req, res, next);

    expect(req.user).toEqual({ id: 'user-id', role: 'writer' });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
