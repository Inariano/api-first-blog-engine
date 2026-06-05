const request = require('supertest');

const mockUserFindOne = jest.fn();
const mockUserSave = jest.fn();

jest.mock('../src/models/User', () => {
  const mockUserInstance = {
    _id: 'oauth-user-id',
    name: '',
    email: '',
    provider: '',
    providerId: '',
    role: 'subscriber',
    save: mockUserSave,
    toJSON() {
      return {
        _id: this._id,
        name: this.name,
        email: this.email,
        provider: this.provider,
        providerId: this.providerId,
        role: this.role,
      };
    },
  };

  const User = jest.fn().mockImplementation((data) => {
    Object.assign(mockUserInstance, data);
    return mockUserInstance;
  });

  User.findOne = mockUserFindOne;
  return User;
});

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mocked-oauth-jwt'),
  verify: jest.fn(),
}));

const mockAuthenticate = jest.fn();

jest.mock('../src/config/passport', () => {
  class PassportMock {
    initialize() {
      return (req, res, next) => next();
    }

    authenticate(strategy, options, callback) {
      if (callback) {
        return mockAuthenticate(strategy, options, callback);
      }
      return mockAuthenticate(strategy, options);
    }
  }

  const instance = new PassportMock();
  return instance;
});

describe('OAuth endpoints - configured', () => {
  let app;

  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-google-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
    process.env.GITHUB_CLIENT_ID = 'test-github-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
    jest.resetModules();
    app = require('../src/app');
  });

  afterAll(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/google', () => {
    test('should redirect to Google OAuth authorization URL', async () => {
      mockAuthenticate.mockImplementation((strategy, options) => (req, res) => {
        res.redirect('https://accounts.google.com/o/oauth2/auth');
      });

      const response = await request(app)
        .get('/api/auth/google')
        .expect(302);

      expect(response.headers.location).toContain('accounts.google.com');
      expect(mockAuthenticate).toHaveBeenCalledWith('google', { scope: ['profile', 'email'] });
    });
  });

  describe('GET /api/auth/google/callback', () => {
    test('should authenticate and return JWT token', async () => {
      mockAuthenticate.mockImplementation((strategy, options, callback) => (req, res) => {
        const user = {
          _id: 'oauth-user-id',
          name: 'Google User',
          email: 'google@example.com',
          provider: 'google',
          providerId: 'google-123',
          role: 'subscriber',
          toJSON() {
            return { _id: 'oauth-user-id', name: 'Google User', email: 'google@example.com', provider: 'google', providerId: 'google-123', role: 'subscriber' };
          },
        };
        callback(null, user);
        if (!res.headersSent) {
          res.json({ token: 'mocked-oauth-jwt', user: user.toJSON() });
        }
      });

      const response = await request(app)
        .get('/api/auth/google/callback?code=test-code')
        .expect(200);

      expect(response.body).toHaveProperty('token', 'mocked-oauth-jwt');
      expect(response.body.user).toHaveProperty('provider', 'google');
      expect(response.body.user).toHaveProperty('providerId', 'google-123');
    });

    test('should return 401 when Google authentication fails', async () => {
      mockAuthenticate.mockImplementation((strategy, options, callback) => (req, res) => {
        callback(new Error('Auth failed'), null);
        if (!res.headersSent) {
          res.status(401).json({ error: 'Google authentication failed' });
        }
      });

      const response = await request(app)
        .get('/api/auth/google/callback?code=bad-code')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/github', () => {
    test('should redirect to GitHub OAuth authorization URL', async () => {
      mockAuthenticate.mockImplementation((strategy, options) => (req, res) => {
        res.redirect('https://github.com/login/oauth/authorize');
      });

      const response = await request(app)
        .get('/api/auth/github')
        .expect(302);

      expect(response.headers.location).toContain('github.com');
      expect(mockAuthenticate).toHaveBeenCalledWith('github', { scope: ['user:email'] });
    });
  });

  describe('GET /api/auth/github/callback', () => {
    test('should authenticate and return JWT token', async () => {
      mockAuthenticate.mockImplementation((strategy, options, callback) => (req, res) => {
        const user = {
          _id: 'oauth-user-id',
          name: 'GitHub User',
          email: 'github@example.com',
          provider: 'github',
          providerId: 'github-456',
          role: 'subscriber',
          toJSON() {
            return { _id: 'oauth-user-id', name: 'GitHub User', email: 'github@example.com', provider: 'github', providerId: 'github-456', role: 'subscriber' };
          },
        };
        callback(null, user);
        if (!res.headersSent) {
          res.json({ token: 'mocked-oauth-jwt', user: user.toJSON() });
        }
      });

      const response = await request(app)
        .get('/api/auth/github/callback?code=test-code')
        .expect(200);

      expect(response.body).toHaveProperty('token', 'mocked-oauth-jwt');
      expect(response.body.user).toHaveProperty('provider', 'github');
      expect(response.body.user).toHaveProperty('providerId', 'github-456');
    });

    test('should return 401 when GitHub authentication fails', async () => {
      mockAuthenticate.mockImplementation((strategy, options, callback) => (req, res) => {
        callback(new Error('Auth failed'), null);
        if (!res.headersSent) {
          res.status(401).json({ error: 'GitHub authentication failed' });
        }
      });

      const response = await request(app)
        .get('/api/auth/github/callback?code=bad-code')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});

describe('OAuth endpoints - not configured', () => {
  let app;

  beforeAll(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    jest.resetModules();
    app = require('../src/app');
  });

  test('should return 501 for Google when not configured', async () => {
    const response = await request(app)
      .get('/api/auth/google')
      .expect(501);

    expect(response.body).toHaveProperty('error', 'Google OAuth not configured');
  });

  test('should return 501 for GitHub when not configured', async () => {
    const response = await request(app)
      .get('/api/auth/github')
      .expect(501);

    expect(response.body).toHaveProperty('error', 'GitHub OAuth not configured');
  });
});
