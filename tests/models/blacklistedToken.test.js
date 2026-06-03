const mongoose = require('mongoose');

const BlacklistedToken = require('../../src/models/BlacklistedToken');

describe('BlacklistedToken Model', () => {
  describe('Schema validation', () => {
    test('should require token', () => {
      const doc = new BlacklistedToken({ expiresAt: new Date() });
      const error = doc.validateSync();
      expect(error.errors.token).toBeDefined();
    });

    test('should require expiresAt', () => {
      const doc = new BlacklistedToken({ token: 'some-token' });
      const error = doc.validateSync();
      expect(error.errors.expiresAt).toBeDefined();
    });

    test('should accept valid data', () => {
      const doc = new BlacklistedToken({ token: 'some-token', expiresAt: new Date() });
      const error = doc.validateSync();
      expect(error).toBeUndefined();
    });
  });
});
