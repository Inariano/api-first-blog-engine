const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const User = require('../src/models/User');

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema validation', () => {
    test('should require name', () => {
      const user = new User({ email: 'test@example.com', password: 'password123' });
      const error = user.validateSync();
      expect(error.errors.name).toBeDefined();
    });

    test('should require email', () => {
      const user = new User({ name: 'Test', password: 'password123' });
      const error = user.validateSync();
      expect(error.errors.email).toBeDefined();
    });

    test('should require password with minlength', () => {
      const user = new User({ name: 'Test', email: 'test@example.com', password: '123' });
      const error = user.validateSync();
      expect(error.errors.password).toBeDefined();
    });

    test('should accept valid user data', () => {
      const user = new User({ name: 'Test', email: 'test@example.com', password: 'password123' });
      const error = user.validateSync();
      expect(error).toBeUndefined();
    });

    test('should lowercase email', () => {
      const user = new User({ name: 'Test', email: 'TEST@Example.com', password: 'password123' });
      expect(user.email).toBe('test@example.com');
    });

    test('should default role to subscriber', () => {
      const user = new User({ name: 'Test', email: 'test@example.com', password: 'password123' });
      expect(user.role).toBe('subscriber');
    });

    test('should default status to active', () => {
      const user = new User({ name: 'Test', email: 'test@example.com', password: 'password123' });
      expect(user.status).toBe('active');
    });
  });

  describe('toJSON transform', () => {
    test('should remove password and __v from JSON output', () => {
      const user = new User({ name: 'Test', email: 'test@example.com', password: 'password123' });
      user._id = 'mock-id';

      const json = user.toJSON();
      expect(json.password).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json.name).toBe('Test');
      expect(json.email).toBe('test@example.com');
    });
  });

  describe('pre-save hook (hashPassword)', () => {
    const { hashPassword } = User;

    function createMockUser(data, isPasswordModified) {
      return {
        ...data,
        isModified: jest.fn((field) => field === 'password' && isPasswordModified),
        password: data.password,
      };
    }

    test('should hash password when modified', async () => {
      bcrypt.hash.mockResolvedValue('hashed_password_rounds');
      const mockUser = createMockUser(
        { name: 'Test', email: 'test@example.com', password: 'plain_password' },
        true,
      );
      const next = jest.fn();

      await hashPassword.call(mockUser, next);

      expect(bcrypt.hash).toHaveBeenCalledWith('plain_password', 12);
      expect(mockUser.password).toBe('hashed_password_rounds');
      expect(next).toHaveBeenCalledWith();
    });

    test('should skip hashing when password is not modified', async () => {
      const mockUser = createMockUser(
        { name: 'Test', email: 'test@example.com', password: 'already_hashed' },
        false,
      );
      const next = jest.fn();

      await hashPassword.call(mockUser, next);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    test('should call next with error when bcrypt.hash fails', async () => {
      bcrypt.hash.mockRejectedValue(new Error('Hash error'));
      const mockUser = createMockUser(
        { name: 'Test', email: 'test@example.com', password: 'plain_password' },
        true,
      );
      const next = jest.fn();

      await hashPassword.call(mockUser, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('comparePassword method', () => {
    test('should return true when password matches', async () => {
      bcrypt.compare.mockResolvedValue(true);
      const user = new User({ name: 'Test', email: 'test@example.com', password: 'hashed_password' });

      const result = await user.comparePassword('password123');
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
    });

    test('should return false when password does not match', async () => {
      bcrypt.compare.mockResolvedValue(false);
      const user = new User({ name: 'Test', email: 'test@example.com', password: 'hashed_password' });

      const result = await user.comparePassword('wrongpassword');
      expect(result).toBe(false);
    });
  });
});
