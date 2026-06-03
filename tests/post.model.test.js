const Post = require('../src/models/Post');

describe('Post Model', () => {
  describe('Schema validation', () => {
    test('should require title', () => {
      const post = new Post({ content: 'Some content', author: '507f1f77bcf86cd799439011' });
      const error = post.validateSync();
      expect(error.errors.title).toBeDefined();
    });

    test('should require content', () => {
      const post = new Post({ title: 'Test Post', author: '507f1f77bcf86cd799439011' });
      const error = post.validateSync();
      expect(error.errors.content).toBeDefined();
    });

    test('should require author', () => {
      const post = new Post({ title: 'Test Post', content: 'Some content' });
      const error = post.validateSync();
      expect(error.errors.author).toBeDefined();
    });

    test('should accept valid post data', () => {
      const post = new Post({
        title: 'Test Post',
        content: 'Some content',
        author: '507f1f77bcf86cd799439011',
      });
      const error = post.validateSync();
      expect(error).toBeUndefined();
    });

    test('should default status to draft', () => {
      const post = new Post({
        title: 'Test Post',
        content: 'Some content',
        author: '507f1f77bcf86cd799439011',
      });
      expect(post.status).toBe('draft');
    });

    test('should reject invalid status', () => {
      const post = new Post({
        title: 'Test Post',
        content: 'Some content',
        author: '507f1f77bcf86cd799439011',
        status: 'archived',
      });
      const error = post.validateSync();
      expect(error.errors.status).toBeDefined();
    });
  });

  describe('Slug generation', () => {
    test('should auto-generate slug from title before validate', async () => {
      const post = new Post({
        title: 'My First Blog Post',
        content: 'Some content',
        author: '507f1f77bcf86cd799439011',
      });
      await post.validate();
      expect(post.slug).toBe('my-first-blog-post');
    });

    test('should handle special characters in slug', async () => {
      const post = new Post({
        title: 'Hello! How are you? #2',
        content: 'Some content',
        author: '507f1f77bcf86cd799439011',
      });
      await post.validate();
      expect(post.slug).toBe('hello-how-are-you-2');
    });

    test('should not overwrite existing slug when title changes', async () => {
      const post = new Post({
        title: 'Original Title',
        slug: 'custom-slug',
        content: 'Some content',
        author: '507f1f77bcf86cd799439011',
      });
      await post.validate();
      expect(post.slug).toBe('custom-slug');
    });
  });

  describe('toJSON transform', () => {
    test('should remove __v from JSON output', () => {
      const post = new Post({
        title: 'Test Post',
        content: 'Some content',
        author: '507f1f77bcf86cd799439011',
      });
      post._id = 'mock-id';

      const json = post.toJSON();
      expect(json.__v).toBeUndefined();
      expect(json.title).toBe('Test Post');
      expect(json.content).toBe('Some content');
    });
  });
});
