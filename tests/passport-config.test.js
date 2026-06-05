describe('Passport configuration', () => {
  const OLD_ENV = process.env;

  afterEach(() => {
    process.env = OLD_ENV;
    jest.resetModules();
    jest.unmock('../src/models/User');
  });

  describe('without OAuth credentials', () => {
    beforeAll(() => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;
    });

    test('should load passport module without OAuth strategies', () => {
      const passport = require('../src/config/passport');
      expect(passport).toBeDefined();
      const strategyKeys = Object.keys(passport._strategies || {}).filter(
        (k) => k !== 'session',
      );
      expect(strategyKeys).toHaveLength(0);
    });
  });

  describe('with Google OAuth credentials', () => {
    beforeAll(() => {
      process.env.GOOGLE_CLIENT_ID = 'test-google-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;
    });

    test('should register Google strategy', () => {
      const passport = require('../src/config/passport');
      expect(passport._strategies.google).toBeDefined();
      expect(passport._strategies.github).toBeUndefined();
    });
  });

  describe('with GitHub OAuth credentials', () => {
    beforeAll(() => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      process.env.GITHUB_CLIENT_ID = 'test-github-id';
      process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
    });

    test('should register GitHub strategy', () => {
      const passport = require('../src/config/passport');
      expect(passport._strategies.github).toBeDefined();
      expect(passport._strategies.google).toBeUndefined();
    });
  });

  describe('strategy callbacks', () => {
    function buildMockUser() {
      const mockUserInstance = {
        _id: 'new-user-id',
        name: '',
        email: '',
        provider: '',
        providerId: '',
        role: 'subscriber',
        save: jest.fn().mockResolvedValue(),
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

      const MockUser = jest.fn().mockImplementation((ctorData) => {
        if (ctorData) Object.assign(mockUserInstance, ctorData);
        return mockUserInstance;
      });
      MockUser.findOne = jest.fn();

      return { mockUserInstance, MockUser };
    }

    function setupEnv() {
      process.env.GOOGLE_CLIENT_ID = 'test-google-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
      process.env.GITHUB_CLIENT_ID = 'test-github-id';
      process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
    }

    test('should register both strategies', () => {
      setupEnv();
      jest.resetModules();

      const { MockUser } = buildMockUser();
      jest.doMock('../src/models/User', () => MockUser);

      const passport = require('../src/config/passport');
      expect(passport._strategies.google).toBeDefined();
      expect(passport._strategies.github).toBeDefined();
    });

    test('should have correct callback URLs', () => {
      setupEnv();
      jest.resetModules();

      const { MockUser } = buildMockUser();
      jest.doMock('../src/models/User', () => MockUser);

      const passport = require('../src/config/passport');
      expect(passport._strategies.google._callbackURL).toBe('/api/auth/google/callback');
      expect(passport._strategies.github._callbackURL).toBe('/api/auth/github/callback');
    });

    test('should create new Google user', async () => {
      setupEnv();
      jest.resetModules();

      const { MockUser } = buildMockUser();
      MockUser.findOne.mockResolvedValue(null);
      jest.doMock('../src/models/User', () => MockUser);

      const passport = require('../src/config/passport');

      const user = await new Promise((resolve, reject) => {
        passport._strategies.google._verify(
          'access-token',
          'refresh-token',
          {
            id: '12345',
            displayName: 'Test Google User',
            emails: [{ value: 'test@gmail.com' }],
          },
          (err, u) => {
            if (err) reject(err);
            else resolve(u);
          },
        );
      });

      expect(user).toBeDefined();
      expect(user.name).toBe('Test Google User');
      expect(user.email).toBe('test@gmail.com');
      expect(user.provider).toBe('google');
      expect(user.providerId).toBe('12345');
    });

    test('should find existing Google user', async () => {
      setupEnv();
      jest.resetModules();

      const existingUser = { _id: 'existing-google-user', name: 'Existing User' };
      const { MockUser } = buildMockUser();
      MockUser.findOne.mockResolvedValue(existingUser);
      jest.doMock('../src/models/User', () => MockUser);

      const passport = require('../src/config/passport');

      const user = await new Promise((resolve, reject) => {
        passport._strategies.google._verify(
          'access-token',
          'refresh-token',
          {
            id: '12345',
            displayName: 'Test Google User',
            emails: [{ value: 'test@gmail.com' }],
          },
          (err, u) => {
            if (err) reject(err);
            else resolve(u);
          },
        );
      });

      expect(user).toBe(existingUser);
    });

    test('should handle Google OAuth error', async () => {
      setupEnv();
      jest.resetModules();

      const { MockUser } = buildMockUser();
      MockUser.findOne.mockRejectedValue(new Error('DB error'));
      jest.doMock('../src/models/User', () => MockUser);

      const passport = require('../src/config/passport');

      const err = await new Promise((resolve) => {
        passport._strategies.google._verify(
          'access-token',
          'refresh-token',
          {
            id: '12345',
            displayName: 'Test Google User',
            emails: [{ value: 'test@gmail.com' }],
          },
          (e) => resolve(e),
        );
      });

      expect(err).toBeDefined();
      expect(err.message).toBe('DB error');
    });

    test('should create new GitHub user', async () => {
      setupEnv();
      jest.resetModules();

      const { MockUser } = buildMockUser();
      MockUser.findOne.mockResolvedValue(null);
      jest.doMock('../src/models/User', () => MockUser);

      const passport = require('../src/config/passport');

      const user = await new Promise((resolve, reject) => {
        passport._strategies.github._verify(
          'access-token',
          'refresh-token',
          {
            id: '67890',
            displayName: 'Test GitHub User',
            username: 'testuser',
            emails: [{ value: 'test@github.com' }],
          },
          (err, u) => {
            if (err) reject(err);
            else resolve(u);
          },
        );
      });

      expect(user).toBeDefined();
      expect(user.name).toBe('Test GitHub User');
      expect(user.email).toBe('test@github.com');
      expect(user.provider).toBe('github');
      expect(user.providerId).toBe('67890');
    });

    test('should handle GitHub OAuth error', async () => {
      setupEnv();
      jest.resetModules();

      const { MockUser } = buildMockUser();
      MockUser.findOne.mockRejectedValue(new Error('DB error'));
      jest.doMock('../src/models/User', () => MockUser);

      const passport = require('../src/config/passport');

      const err = await new Promise((resolve) => {
        passport._strategies.github._verify(
          'access-token',
          'refresh-token',
          {
            id: '67890',
            displayName: 'Test GitHub User',
            username: 'testuser',
          },
          (e) => resolve(e),
        );
      });

      expect(err).toBeDefined();
      expect(err.message).toBe('DB error');
    });

    test('should handle missing Google profile fields with fallback email', async () => {
      setupEnv();
      jest.resetModules();

      const { MockUser } = buildMockUser();
      MockUser.findOne.mockResolvedValue(null);
      jest.doMock('../src/models/User', () => MockUser);

      const passport = require('../src/config/passport');

      const user = await new Promise((resolve, reject) => {
        passport._strategies.google._verify(
          'access-token',
          'refresh-token',
          { id: 'no-email' },
          (err, u) => {
            if (err) reject(err);
            else resolve(u);
          },
        );
      });

      expect(user).toBeDefined();
      expect(user.email).toBe('google-no-email@placeholder.local');
      expect(user.name).toBe('Google User');
    });

    test('should handle missing GitHub profile fields with fallback email', async () => {
      setupEnv();
      jest.resetModules();

      const { MockUser } = buildMockUser();
      MockUser.findOne.mockResolvedValue(null);
      jest.doMock('../src/models/User', () => MockUser);

      const passport = require('../src/config/passport');

      const user = await new Promise((resolve, reject) => {
        passport._strategies.github._verify(
          'access-token',
          'refresh-token',
          { id: 'no-email', username: 'someuser' },
          (err, u) => {
            if (err) reject(err);
            else resolve(u);
          },
        );
      });

      expect(user).toBeDefined();
      expect(user.email).toBe('github-no-email@placeholder.local');
      expect(user.name).toBe('someuser');
    });

    test('should find existing GitHub user', async () => {
      setupEnv();
      jest.resetModules();

      const existingUser = { _id: 'existing-github-user', name: 'Existing GitHub User' };
      const { MockUser } = buildMockUser();
      MockUser.findOne.mockResolvedValue(existingUser);
      jest.doMock('../src/models/User', () => MockUser);

      const passport = require('../src/config/passport');

      const user = await new Promise((resolve, reject) => {
        passport._strategies.github._verify(
          'access-token',
          'refresh-token',
          {
            id: '67890',
            displayName: 'Test GitHub User',
            username: 'testuser',
          },
          (err, u) => {
            if (err) reject(err);
            else resolve(u);
          },
        );
      });

      expect(user).toBe(existingUser);
    });

    test('should handle getName fallback for GitHub with no fields', async () => {
      setupEnv();
      jest.resetModules();

      const { MockUser } = buildMockUser();
      MockUser.findOne.mockResolvedValue(null);
      jest.doMock('../src/models/User', () => MockUser);

      const passport = require('../src/config/passport');

      const user = await new Promise((resolve, reject) => {
        passport._strategies.github._verify(
          'access-token',
          'refresh-token',
          { id: 'no-fields' },
          (err, u) => {
            if (err) reject(err);
            else resolve(u);
          },
        );
      });

      expect(user).toBeDefined();
      expect(user.name).toBe('GitHub User');
    });

    test('should handle getName fallback for GitHub with emails but no displayName', async () => {
      setupEnv();
      jest.resetModules();

      const { MockUser } = buildMockUser();
      MockUser.findOne.mockResolvedValue(null);
      jest.doMock('../src/models/User', () => MockUser);

      const passport = require('../src/config/passport');

      const user = await new Promise((resolve, reject) => {
        passport._strategies.github._verify(
          'access-token',
          'refresh-token',
          {
            id: 'has-email',
            username: 'someuser',
            emails: [{ value: 'user@example.com' }],
          },
          (err, u) => {
            if (err) reject(err);
            else resolve(u);
          },
        );
      });

      expect(user).toBeDefined();
      expect(user.name).toBe('someuser');
    });

    test('should handle getName for Google with emails but no displayName', async () => {
      setupEnv();
      jest.resetModules();

      const { MockUser } = buildMockUser();
      MockUser.findOne.mockResolvedValue(null);
      jest.doMock('../src/models/User', () => MockUser);

      const passport = require('../src/config/passport');

      const user = await new Promise((resolve, reject) => {
        passport._strategies.google._verify(
          'access-token',
          'refresh-token',
          {
            id: 'has-email',
            emails: [{ value: 'user@example.com' }],
          },
          (err, u) => {
            if (err) reject(err);
            else resolve(u);
          },
        );
      });

      expect(user).toBeDefined();
      expect(user.name).toBe('user@example.com');
    });
  });
});
