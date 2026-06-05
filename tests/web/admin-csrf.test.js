const request = require('supertest');

jest.mock('../../src/middlewares/webAuth', () => jest.fn((req, res, next) => {
  req.user = { id: 'admin-id', role: 'admin' };
  req.tokenPayload = { id: 'admin-id', role: 'admin' };
  next();
}));

jest.mock('bcryptjs', () => ({ compare: jest.fn() }));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn(() => 'test-jwt-token') }));

let mockUserFindByIdAndDelete = jest.fn();
const mockUserFind = jest.fn();
const mockUserFindById = jest.fn();
const MockUser = jest.fn();
MockUser.find = mockUserFind;
MockUser.findById = mockUserFindById;
MockUser.findByIdAndDelete = mockUserFindByIdAndDelete;
jest.mock('../../src/models/User', () => MockUser);

const mockCategoryFind = jest.fn();
const MockCategory = jest.fn();
MockCategory.find = mockCategoryFind;
jest.mock('../../src/models/Category', () => MockCategory);

const app = require('../../src/app');

describe('Admin User Management CSRF', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockCategoryFind.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
  });

  describe('POST without CSRF token', () => {
    test('should reject block request with redirect', async () => {
      const response = await request(app)
        .post('/web/admin/users/u1/block')
        .expect(302);

      expect(response.headers.location).toBe('/web');
    });

    test('should reject make-author request with redirect', async () => {
      const response = await request(app)
        .post('/web/admin/users/u1/make-author')
        .expect(302);

      expect(response.headers.location).toBe('/web');
    });

    test('should reject delete request with redirect', async () => {
      const response = await request(app)
        .post('/web/admin/users/u1/delete')
        .expect(302);

      expect(response.headers.location).toBe('/web');
    });
  });

  describe('POST with valid CSRF token', () => {
    test('should block a user successfully', async () => {
      const agent = request.agent(app);

      mockUserFind.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: 'admin-id', name: 'Admin', email: 'admin@test.com', role: 'admin', status: 'active', createdAt: '2026-01-01' },
          { _id: 'u1', name: 'User', email: 'user@test.com', role: 'subscriber', status: 'active', createdAt: '2026-02-01' },
        ]),
      });

      const userDoc = { _id: 'u1', status: 'active', save: jest.fn().mockResolvedValue() };
      mockUserFindById.mockResolvedValue(userDoc);

      const getResponse = await agent
        .get('/web/admin/users')
        .expect(200);

      const csrfMatch = getResponse.text.match(/name="_csrf" value="([^"]+)"/);
      expect(csrfMatch).not.toBeNull();
      const csrfToken = csrfMatch[1];

      const postResponse = await agent
        .post('/web/admin/users/u1/block')
        .send({ _csrf: csrfToken })
        .expect(302);

      expect(postResponse.headers.location).toBe('/web/admin/users');
      expect(userDoc.status).toBe('blocked');
      expect(userDoc.save).toHaveBeenCalled();
    });

    test('should promote a user to author successfully', async () => {
      const agent = request.agent(app);

      mockUserFind.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: 'admin-id', name: 'Admin', email: 'admin@test.com', role: 'admin', status: 'active', createdAt: '2026-01-01' },
          { _id: 'u1', name: 'User', email: 'user@test.com', role: 'subscriber', status: 'active', createdAt: '2026-02-01' },
        ]),
      });

      const userDoc = { _id: 'u1', role: 'subscriber', save: jest.fn().mockResolvedValue() };
      mockUserFindById.mockResolvedValue(userDoc);

      const getResponse = await agent
        .get('/web/admin/users')
        .expect(200);

      const csrfMatch = getResponse.text.match(/name="_csrf" value="([^"]+)"/);
      expect(csrfMatch).not.toBeNull();
      const csrfToken = csrfMatch[1];

      const postResponse = await agent
        .post('/web/admin/users/u1/make-author')
        .send({ _csrf: csrfToken })
        .expect(302);

      expect(postResponse.headers.location).toBe('/web/admin/users');
      expect(userDoc.role).toBe('writer');
      expect(userDoc.save).toHaveBeenCalled();
    });

    test('should delete a user successfully', async () => {
      const agent = request.agent(app);

      mockUserFind.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: 'admin-id', name: 'Admin', email: 'admin@test.com', role: 'admin', status: 'active', createdAt: '2026-01-01' },
          { _id: 'u1', name: 'User', email: 'user@test.com', role: 'subscriber', status: 'active', createdAt: '2026-02-01' },
        ]),
      });

      mockUserFindByIdAndDelete.mockResolvedValue({ _id: 'u1' });

      const getResponse = await agent
        .get('/web/admin/users')
        .expect(200);

      const csrfMatch = getResponse.text.match(/name="_csrf" value="([^"]+)"/);
      expect(csrfMatch).not.toBeNull();
      const csrfToken = csrfMatch[1];

      const postResponse = await agent
        .post('/web/admin/users/u1/delete')
        .send({ _csrf: csrfToken })
        .expect(302);

      expect(postResponse.headers.location).toBe('/web/admin/users');
      expect(MockUser.findByIdAndDelete).toHaveBeenCalledWith('u1');
    });
  });
});
