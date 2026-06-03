const request = require('supertest');

jest.mock('../../src/models/Post', () => {
  const Post = {
    find: jest.fn(),
    findById: jest.fn(),
  };
  return Post;
});

jest.mock('../../src/models/Comment', () => {
  const mockSave = jest.fn();
  const Comment = jest.fn().mockImplementation((data) => ({
    ...data,
    save: mockSave,
  }));
  Comment.find = jest.fn();
  Comment.__mockSave = mockSave;
  return Comment;
});

jest.mock('../../src/middlewares/auth', () => jest.fn((req, res, next) => {
  req.user = { id: 'test-user-id', role: 'subscriber' };
  next();
}));

const app = require('../../src/app');

describe('Web Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /web', () => {
    test('should render home page with 200', async () => {
      const response = await request(app)
        .get('/web')
        .expect(200);

      expect(response.text).toContain('Blog Engine');
      expect(response.text).toContain('Published Posts');
    });
  });

  describe('GET /', () => {
    test('should redirect to /web', async () => {
      const response = await request(app)
        .get('/')
        .expect(302);

      expect(response.headers.location).toBe('/web');
    });
  });

  describe('GET /web/posts', () => {
    test('should render posts partial with published posts', async () => {
      const Post = require('../../src/models/Post');
      const posts = [
        {
          _id: 'id1',
          title: 'First Post',
          content: 'Content here',
          author: { name: 'Author', email: 'author@test.com' },
          createdAt: '2026-01-01',
          toJSON() { return this; },
        },
      ];
      Post.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(posts),
      });

      const response = await request(app)
        .get('/web/posts')
        .expect(200);

      expect(response.text).toContain('First Post');
      expect(response.text).toContain('Content here');
      expect(response.text).toContain('Author');
    });

    test('should render empty state when no posts', async () => {
      const Post = require('../../src/models/Post');
      Post.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .get('/web/posts')
        .expect(200);

      expect(response.text).toContain('No published posts yet');
    });

    test('should return 500 on error', async () => {
      const Post = require('../../src/models/Post');
      Post.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const response = await request(app)
        .get('/web/posts')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /web/posts/:id', () => {
    test('should render post page', async () => {
      const Post = require('../../src/models/Post');
      Post.findById.mockResolvedValue({ _id: 'post-1', title: 'My Post' });

      const response = await request(app)
        .get('/web/posts/post-1')
        .expect(200);

      expect(response.text).toContain('My Post');
      expect(response.text).toContain('Comments');
    });

    test('should return 404 when post not found', async () => {
      const Post = require('../../src/models/Post');
      Post.findById.mockResolvedValue(null);

      await request(app)
        .get('/web/posts/nonexistent')
        .expect(404);
    });

    test('should return 500 on database error', async () => {
      const Post = require('../../src/models/Post');
      Post.findById.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/web/posts/error-id')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /web/posts/:id/content', () => {
    test('should render post content partial', async () => {
      const Post = require('../../src/models/Post');
      Post.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          _id: 'post-1',
          title: 'Full Post',
          content: 'Post body content',
          author: { name: 'Author' },
          tags: ['js', 'node'],
          createdAt: '2026-01-01',
        }),
      });

      const response = await request(app)
        .get('/web/posts/post-1/content')
        .expect(200);

      expect(response.text).toContain('Full Post');
      expect(response.text).toContain('Post body content');
      expect(response.text).toContain('Author');
      expect(response.text).toContain('js');
    });

    test('should return 404 when post not found', async () => {
      const Post = require('../../src/models/Post');
      Post.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      const response = await request(app)
        .get('/web/posts/nonexistent/content')
        .expect(404);

      expect(response.text).toContain('Post not found');
    });

    test('should return 500 on database error', async () => {
      const Post = require('../../src/models/Post');
      Post.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const response = await request(app)
        .get('/web/posts/error-id/content')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /web/posts/:id/comments', () => {
    test('should render comments partial', async () => {
      const Comment = require('../../src/models/Comment');
      Comment.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'c1',
            content: 'Great post!',
            author: { name: 'Reader' },
            createdAt: '2026-01-02',
          },
        ]),
      });

      const response = await request(app)
        .get('/web/posts/post-1/comments')
        .expect(200);

      expect(response.text).toContain('Great post!');
      expect(response.text).toContain('Reader');
    });

    test('should render empty comments state', async () => {
      const Comment = require('../../src/models/Comment');
      Comment.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .get('/web/posts/post-1/comments')
        .expect(200);

      expect(response.text).toContain('No comments yet');
    });

    test('should return 500 on database error', async () => {
      const Comment = require('../../src/models/Comment');
      Comment.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const response = await request(app)
        .get('/web/posts/error-id/comments')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /web/posts/:id/comments', () => {
    test('should create comment and render updated comments', async () => {
      const Comment = require('../../src/models/Comment');
      Comment.__mockSave.mockResolvedValue();
      Comment.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'c1',
            content: 'New comment',
            author: { name: 'Test User' },
            createdAt: '2026-01-02',
          },
        ]),
      });

      const response = await request(app)
        .post('/web/posts/post-1/comments')
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 'New comment' })
        .expect(200);

      expect(Comment).toHaveBeenCalledWith({
        post: 'post-1',
        author: 'test-user-id',
        content: 'New comment',
      });
      expect(response.text).toContain('New comment');
    });

    test('should return 400 when content is missing', async () => {
      const response = await request(app)
        .post('/web/posts/post-1/comments')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.text).toContain('Content is required');
    });

    test('should return 500 on database error', async () => {
      const Comment = require('../../src/models/Comment');
      Comment.__mockSave.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/posts/post-1/comments')
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 'This will fail' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});
