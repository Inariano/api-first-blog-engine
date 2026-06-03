const request = require('supertest');

jest.mock('../../src/models/Post', () => {
  const Post = {
    find: jest.fn(),
  };
  return Post;
});

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
        limit: jest.fn().mockResolvedValue(posts),
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
        limit: jest.fn().mockResolvedValue([]),
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
        limit: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const response = await request(app)
        .get('/web/posts')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});
