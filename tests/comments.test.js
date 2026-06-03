const request = require('supertest');

jest.mock('../src/models/Comment', () => {
  const mockSave = jest.fn();
  const mockToJSON = jest.fn().mockReturnValue({});

  const Comment = jest.fn().mockImplementation((data) => ({
    _id: 'generated-comment-id',
    post: data && data.post,
    author: (data && data.author) || 'test-user-id',
    content: data && data.content,
    save: mockSave,
    toJSON: mockToJSON,
  }));

  Comment.find = jest.fn();
  Comment.findById = jest.fn();
  Comment.findOne = jest.fn();
  Comment.__mockSave = mockSave;
  Comment.__mockToJSON = mockToJSON;

  return Comment;
});

jest.mock('../src/models/Post', () => {
  const Post = {
    findById: jest.fn(),
  };
  return Post;
});

jest.mock('../src/middlewares/auth', () => jest.fn((req, res, next) => {
  req.user = { id: 'test-user-id', role: 'writer' };
  next();
}));

const app = require('../src/app');

describe('GET /api/posts/:postId/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return list of comments for a post', async () => {
    const Comment = require('../src/models/Comment');
    const comments = [
      {
        _id: 'c1',
        content: 'First!',
        author: { name: 'User', email: 'user@test.com' },
        toJSON() { return this; },
      },
    ];
    Comment.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(comments),
    });

    const response = await request(app)
      .get('/api/posts/post-id-123/comments')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].content).toBe('First!');
    expect(Comment.find).toHaveBeenCalledWith({ post: 'post-id-123' });
  });

  test('should return empty array when no comments', async () => {
    const Comment = require('../src/models/Comment');
    Comment.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    });

    const response = await request(app)
      .get('/api/posts/post-id-123/comments')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  test('should return 500 on error', async () => {
    const Comment = require('../src/models/Comment');
    Comment.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockRejectedValue(new Error('DB error')),
    });

    const response = await request(app)
      .get('/api/posts/post-id-123/comments')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/posts/:postId/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create comment and return 201', async () => {
    const Post = require('../src/models/Post');
    const Comment = require('../src/models/Comment');
    Post.findById.mockResolvedValue({ _id: 'post-id-123' });
    Comment.__mockSave.mockResolvedValue();
    Comment.__mockToJSON.mockReturnValue({
      _id: 'new-comment-id',
      content: 'Nice post!',
      author: { name: 'Writer', email: 'writer@test.com' },
    });
    Comment.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 'new-comment-id',
        content: 'Nice post!',
        author: { name: 'Writer', email: 'writer@test.com' },
        toJSON() { return this; },
      }),
    });

    const response = await request(app)
      .post('/api/posts/post-id-123/comments')
      .set('Authorization', 'Bearer valid-token')
      .send({ content: 'Nice post!' })
      .expect(201);

    expect(response.body.content).toBe('Nice post!');
    expect(Post.findById).toHaveBeenCalledWith('post-id-123');
  });

  test('should return 400 when content is missing', async () => {
    const response = await request(app)
      .post('/api/posts/post-id-123/comments')
      .set('Authorization', 'Bearer valid-token')
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 404 when post does not exist', async () => {
    const Post = require('../src/models/Post');
    Post.findById.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/posts/post-id-123/comments')
      .set('Authorization', 'Bearer valid-token')
      .send({ content: 'Nice!' })
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 500 on save error', async () => {
    const Post = require('../src/models/Post');
    const Comment = require('../src/models/Comment');
    Post.findById.mockResolvedValue({ _id: 'post-id-123' });
    Comment.__mockSave.mockRejectedValue(new Error('Save error'));

    const response = await request(app)
      .post('/api/posts/post-id-123/comments')
      .set('Authorization', 'Bearer valid-token')
      .send({ content: 'Nice!' })
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/posts/:postId/comments/:commentId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should delete comment and return 204', async () => {
    const Comment = require('../src/models/Comment');
    Comment.findOne.mockResolvedValue({
      _id: 'comment-id',
      post: 'post-id-123',
      author: 'test-user-id',
      deleteOne: jest.fn().mockResolvedValue(),
    });

    const response = await request(app)
      .delete('/api/posts/post-id-123/comments/comment-id')
      .set('Authorization', 'Bearer valid-token')
      .expect(204);

    expect(response.body).toEqual({});
    expect(Comment.findOne).toHaveBeenCalledWith({
      _id: 'comment-id',
      post: 'post-id-123',
      author: 'test-user-id',
    });
  });

  test('should return 404 when comment not found', async () => {
    const Comment = require('../src/models/Comment');
    Comment.findOne.mockResolvedValue(null);

    const response = await request(app)
      .delete('/api/posts/post-id-123/comments/nonexistent')
      .set('Authorization', 'Bearer valid-token')
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 500 on error', async () => {
    const Comment = require('../src/models/Comment');
    Comment.findOne.mockRejectedValue(new Error('DB error'));

    const response = await request(app)
      .delete('/api/posts/post-id-123/comments/comment-id')
      .set('Authorization', 'Bearer valid-token')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});
