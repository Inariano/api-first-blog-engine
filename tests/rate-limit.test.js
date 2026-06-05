const request = require('supertest');

jest.mock('../src/models/Post', () => {
  const Post = jest.fn();
  Post.find = jest.fn();
  Post.findById = jest.fn();
  Post.countDocuments = jest.fn();
  return Post;
});

jest.mock('../src/models/User', () => {
  const mockUserInstance = {
    _id: 'generated-user-id',
    name: '',
    email: '',
    password: '',
    role: 'subscriber',
    save: jest.fn(),
    comparePassword: jest.fn(),
    toJSON() {
      return { _id: this._id, name: this.name, email: this.email, role: this.role };
    },
  };

  const User = jest.fn().mockImplementation((data) => {
    Object.assign(mockUserInstance, data);
    return mockUserInstance;
  });

  User.findOne = jest.fn();
  return User;
});

jest.mock('../src/middlewares/auth', () => jest.fn((req, res, next) => {
  req.user = { id: 'test-user-id', role: 'writer' };
  next();
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mocked-jwt-token'),
  verify: jest.fn(),
}));

const app = require('../src/app');

describe('Rate limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const Post = require('../src/models/Post');
    Post.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });
  });

  test('should include RateLimit headers on API routes', async () => {
    const response = await request(app)
      .get('/api/posts')
      .expect(200);

    expect(response.headers['ratelimit-limit']).toBeDefined();
    expect(response.headers['ratelimit-remaining']).toBeDefined();
    expect(response.headers['ratelimit-reset']).toBeDefined();
  });

  test('should include RateLimit headers on auth routes', async () => {
    const User = require('../src/models/User');
    User.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@example.com', password: 'password123' })
      .expect(201);

    expect(response.headers['ratelimit-limit']).toBeDefined();
    expect(response.headers['ratelimit-remaining']).toBeDefined();
  });

  test('should have stricter limit on auth routes than API routes', async () => {
    const User = require('../src/models/User');
    User.findOne.mockResolvedValue(null);

    const authResp = await request(app)
      .post('/api/auth/register')
      .send({ name: 'T', email: 't@t.com', password: 'password123' })
      .expect(201);

    const apiResp = await request(app)
      .get('/api/posts')
      .expect(200);

    expect(Number(authResp.headers['ratelimit-limit'])).toBeLessThan(
      Number(apiResp.headers['ratelimit-limit']),
    );
  });

  test('should not include RateLimit headers on health endpoint', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.headers['ratelimit-limit']).toBeUndefined();
  });
});
