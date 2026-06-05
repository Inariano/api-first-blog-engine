const Category = require('../src/models/Category');

describe('Category Model', () => {
  describe('Schema validation', () => {
    test('should require name', () => {
      const category = new Category({});
      const error = category.validateSync();
      expect(error.errors.name).toBeDefined();
    });

    test('should accept valid category data', () => {
      const category = new Category({ name: 'JavaScript' });
      const error = category.validateSync();
      expect(error).toBeUndefined();
    });

    test('should default description to empty string', () => {
      const category = new Category({ name: 'Node.js' });
      expect(category.description).toBe('');
    });

    test('should accept category with description', () => {
      const category = new Category({ name: 'Node.js', description: 'All about Node.js' });
      const error = category.validateSync();
      expect(error).toBeUndefined();
    });
  });

  describe('Slug generation', () => {
    test('should auto-generate slug from name before validate', async () => {
      const category = new Category({ name: 'JavaScript Tips' });
      await category.validate();
      expect(category.slug).toBe('javascript-tips');
    });

    test('should handle special characters in slug', async () => {
      const category = new Category({ name: 'C++ & Go!' });
      await category.validate();
      expect(category.slug).toBe('c-go');
    });

    test('should not overwrite existing slug', async () => {
      const category = new Category({ name: 'Original', slug: 'custom-slug' });
      await category.validate();
      expect(category.slug).toBe('custom-slug');
    });
  });

  describe('toJSON transform', () => {
    test('should remove __v from JSON output', () => {
      const category = new Category({ name: 'Test' });
      category._id = 'mock-id';

      const json = category.toJSON();
      expect(json.__v).toBeUndefined();
      expect(json.name).toBe('Test');
    });
  });
});
