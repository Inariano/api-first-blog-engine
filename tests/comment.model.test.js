const mongoose = require('mongoose');

const Comment = require('../src/models/Comment');

describe('Comment Model', () => {
  describe('Schema validation', () => {
    test('should require post', () => {
      const comment = new Comment({
        author: new mongoose.Types.ObjectId(),
        content: 'Great post!',
      });
      const error = comment.validateSync();
      expect(error.errors.post).toBeDefined();
    });

    test('should require author', () => {
      const comment = new Comment({
        post: new mongoose.Types.ObjectId(),
        content: 'Great post!',
      });
      const error = comment.validateSync();
      expect(error.errors.author).toBeDefined();
    });

    test('should require content', () => {
      const comment = new Comment({
        post: new mongoose.Types.ObjectId(),
        author: new mongoose.Types.ObjectId(),
      });
      const error = comment.validateSync();
      expect(error.errors.content).toBeDefined();
    });

    test('should accept valid comment data', () => {
      const comment = new Comment({
        post: new mongoose.Types.ObjectId(),
        author: new mongoose.Types.ObjectId(),
        content: 'Great post!',
      });
      const error = comment.validateSync();
      expect(error).toBeUndefined();
    });
  });

  describe('toJSON transform', () => {
    test('should remove __v from JSON output', () => {
      const comment = new Comment({
        post: new mongoose.Types.ObjectId(),
        author: new mongoose.Types.ObjectId(),
        content: 'Nice!',
      });
      const json = comment.toJSON();
      expect(json.__v).toBeUndefined();
      expect(json.content).toBe('Nice!');
    });
  });
});
