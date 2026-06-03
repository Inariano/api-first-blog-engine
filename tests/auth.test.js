const request = require('supertest');

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
      return {
        _id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
      };
    },
  };

  const User = jest.fn().mockImplementation((data) => {
    Object.assign(mockUserInstance, data);
    return mockUserInstance;
  });

  User.findOne = jest.fn();

  return User;
});

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mocked-jwt-token'),
  verify: jest.fn(),
}));

const mockBlacklistedTokenSave = jest.fn().mockResolvedValue();
jest.mock('../src/models/BlacklistedToken', () => {
  const BlacklistedToken = jest.fn().mockImplementation((data) => ({
    ...data,
    save: mockBlacklistedTokenSave,
  }));
  BlacklistedToken.findOne = jest.fn();
  return BlacklistedToken;
});

const app = require('../src/app');

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should register a new user and return 201 with token', async () => {
    const User = require('../src/models/User');
    User.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New User', email: 'new@example.com', password: 'password123' })
      .expect(201);

    expect(response.body).toHaveProperty('token', 'mocked-jwt-token');
    expect(response.body.user).toHaveProperty('name', 'New User');
    expect(response.body.user).toHaveProperty('email', 'new@example.com');
    expect(response.body.user).not.toHaveProperty('password');
  });

  test('should return 409 when email already exists', async () => {
    const User = require('../src/models/User');
    User.findOne.mockResolvedValue({ email: 'existing@example.com' });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Existing', email: 'existing@example.com', password: 'password123' })
      .expect(409);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 400 when name is missing', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 400 when email is invalid', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'password123' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 400 when password is too short', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@example.com', password: '123' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should login successfully and return token', async () => {
    const User = require('../src/models/User');
    const mockUser = {
      _id: 'user-id',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed',
      role: 'subscriber',
      comparePassword: jest.fn().mockResolvedValue(true),
      toJSON() {
        return { _id: this._id, name: this.name, email: this.email, role: this.role };
      },
    };
    User.findOne.mockResolvedValue(mockUser);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    expect(response.body).toHaveProperty('token', 'mocked-jwt-token');
    expect(response.body.user).toHaveProperty('email', 'test@example.com');
    expect(response.body.user).not.toHaveProperty('password');
  });

  test('should return 401 when email does not exist', async () => {
    const User = require('../src/models/User');
    User.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'password123' })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 401 when password is incorrect', async () => {
    const User = require('../src/models/User');
    User.findOne.mockResolvedValue({
      email: 'test@example.com',
      comparePassword: jest.fn().mockResolvedValue(false),
      toJSON() { return { email: this.email }; },
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 400 when email is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('Auth error paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 500 when register User.findOne throws', async () => {
    const User = require('../src/models/User');
    User.findOne.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@example.com', password: 'password123' })
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 500 when register user.save throws', async () => {
    const User = require('../src/models/User');
    User.findOne.mockResolvedValue(null);

    const mockUserInstance = {
      name: 'Test',
      email: 'test@example.com',
      password: 'password123',
      save: jest.fn().mockRejectedValue(new Error('Save error')),
      toJSON() { return { name: this.name, email: this.email }; },
    };
    User.mockImplementation(() => mockUserInstance);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@example.com', password: 'password123' })
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 500 when login User.findOne throws', async () => {
    const User = require('../src/models/User');
    User.findOne.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 500 when login comparePassword throws', async () => {
    const User = require('../src/models/User');
    User.findOne.mockResolvedValue({
      email: 'test@example.com',
      comparePassword: jest.fn().mockRejectedValue(new Error('Compare error')),
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should logout and return 204', async () => {
    const jwt = require('jsonwebtoken');
    const BlacklistedToken = require('../src/models/BlacklistedToken');
    jwt.verify.mockReturnValue({
      id: 'user-id',
      role: 'subscriber',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    BlacklistedToken.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer valid-token')
      .expect(204);

    expect(response.body).toEqual({});
    expect(BlacklistedToken).toHaveBeenCalledWith({
      token: 'valid-token',
      expiresAt: expect.any(Date),
    });
    expect(mockBlacklistedTokenSave).toHaveBeenCalled();
  });

  test('should return 401 when no token provided', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 500 when save fails', async () => {
    const jwt = require('jsonwebtoken');
    const BlacklistedToken = require('../src/models/BlacklistedToken');
    jwt.verify.mockReturnValue({
      id: 'user-id',
      role: 'subscriber',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    BlacklistedToken.findOne.mockResolvedValue(null);
    mockBlacklistedTokenSave.mockRejectedValue(new Error('Save error'));

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer valid-token')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should refresh token and return 200 with new token', async () => {
    const jwt = require('jsonwebtoken');
    const BlacklistedToken = require('../src/models/BlacklistedToken');
    jwt.verify.mockReturnValue({
      id: 'user-id',
      role: 'subscriber',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    BlacklistedToken.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body).toHaveProperty('token', 'mocked-jwt-token');
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 'user-id', role: 'subscriber' },
      expect.any(String),
      { expiresIn: expect.any(String) },
    );
  });

  test('should return 401 when no token provided', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 500 when sign fails', async () => {
    const jwt = require('jsonwebtoken');
    const BlacklistedToken = require('../src/models/BlacklistedToken');
    jwt.verify.mockReturnValue({
      id: 'user-id',
      role: 'subscriber',
    });
    BlacklistedToken.findOne.mockResolvedValue(null);
    jwt.sign.mockImplementation(() => { throw new Error('Sign error'); });

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', 'Bearer valid-token')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});
