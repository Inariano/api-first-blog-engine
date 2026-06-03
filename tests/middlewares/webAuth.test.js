const mockFindOne = jest.fn();
jest.mock('../../src/models/BlacklistedToken', () => ({
  findOne: mockFindOne,
}));

const mockVerify = jest.fn();
jest.mock('jsonwebtoken', () => ({
  verify: mockVerify,
}));

const webAuth = require('../../src/middlewares/webAuth');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.statusCode = 200;
  return res;
};

describe('webAuth middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { cookies: {}, headers: {} };
    res = mockResponse();
    next = jest.fn();
  });

  test('should redirect to login when no token is present', async () => {
    await webAuth(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/web/admin/login');
    expect(next).not.toHaveBeenCalled();
  });

  test('should redirect to login when token is invalid', async () => {
    req.cookies = { token: 'invalid-token' };
    mockVerify.mockImplementation(() => { throw new Error('Invalid token'); });

    await webAuth(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/web/admin/login');
    expect(next).not.toHaveBeenCalled();
  });

  test('should redirect to login when token is blacklisted', async () => {
    req.cookies = { token: 'blacklisted-token' };
    mockVerify.mockReturnValue({ id: 'user-id', role: 'admin' });
    mockFindOne.mockResolvedValue({ token: 'blacklisted-token' });

    await webAuth(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/web/admin/login');
    expect(next).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith('token');
  });

  test('should return 403 when user is not admin', async () => {
    req.cookies = { token: 'subscriber-token' };
    mockVerify.mockReturnValue({ id: 'user-id', role: 'subscriber' });
    mockFindOne.mockResolvedValue(null);

    await webAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith('admin/error', {
      layout: 'admin',
      title: 'Forbidden',
      message: 'Admin access required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('should call next when token is valid and user is admin', async () => {
    req.cookies = { token: 'valid-admin-token' };
    mockVerify.mockReturnValue({ id: 'admin-id', role: 'admin', exp: 9999999999 });
    mockFindOne.mockResolvedValue(null);

    await webAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'admin-id', role: 'admin' });
    expect(req.tokenPayload).toEqual({ id: 'admin-id', role: 'admin', exp: 9999999999 });
  });

  test('should read token from Authorization header when no cookie', async () => {
    req.headers = { authorization: 'Bearer header-token' };
    mockVerify.mockReturnValue({ id: 'admin-id', role: 'admin' });
    mockFindOne.mockResolvedValue(null);

    await webAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'admin-id', role: 'admin' });
  });
});
