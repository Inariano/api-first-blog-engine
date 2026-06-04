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

jest.mock('../../src/models/Category', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
}));

const mockUserSave = jest.fn();

jest.mock('../../src/models/User', () => {
  const User = jest.fn().mockImplementation((data) => ({
    ...data,
    save: mockUserSave,
    toJSON: () => ({ ...data, _id: 'new-user-id' }),
  }));
  User.findOne = jest.fn();
  User.__mockSave = mockUserSave;
  return User;
});

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'user-jwt-token'),
}));

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
    test('should render home page with categories', async () => {
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: 'c1', name: 'Tech', slug: 'tech' },
          { _id: 'c2', name: 'Design', slug: 'design' },
        ]),
      });

      const response = await request(app)
        .get('/web')
        .expect(200);

      expect(response.text).toContain('Blog Engine');
      expect(response.text).toContain('Published Posts');
      expect(response.text).toContain('Tech');
      expect(response.text).toContain('Design');
    });

    test('should return 500 on database error', async () => {
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const response = await request(app)
        .get('/web')
        .expect(500);

      expect(response.body).toHaveProperty('error');
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

  describe('GET /web/login', () => {
    test('should render login page with name field', async () => {
      const response = await request(app)
        .get('/web/login')
        .expect(200);

      expect(response.text).toContain('Blog Engine');
      expect(response.text).toContain('Sign In');
      expect(response.text).toContain('Email');
    });
  });

  describe('POST /web/login', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should login user and redirect to home', async () => {
      const User = require('../../src/models/User');
      User.findOne.mockResolvedValue({
        _id: 'user-id',
        name: 'John',
        email: 'user@test.com',
        role: 'subscriber',
        comparePassword: jest.fn().mockResolvedValue(true),
      });

      const response = await request(app)
        .post('/web/login')
        .send({ email: 'user@test.com', password: 'password123' })
        .expect(302);

      expect(response.headers.location).toBe('/web');
      expect(response.headers['set-cookie']).toBeDefined();
      expect(User.findOne).toHaveBeenCalledWith({ email: 'user@test.com' });
    });

    test('should login admin and redirect to admin dashboard', async () => {
      const User = require('../../src/models/User');
      User.findOne.mockResolvedValue({
        _id: 'admin-id',
        name: 'Admin',
        email: 'admin@test.com',
        role: 'admin',
        comparePassword: jest.fn().mockResolvedValue(true),
      });

      const response = await request(app)
        .post('/web/login')
        .send({ email: 'admin@test.com', password: 'admin123' })
        .expect(302);

      expect(response.headers.location).toBe('/web/admin');
    });

    test('should render login with error when credentials invalid', async () => {
      const User = require('../../src/models/User');
      User.findOne.mockResolvedValue(null);

      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .post('/web/login')
        .send({ email: 'wrong@test.com', password: 'wrong' })
        .expect(200);

      expect(response.text).toContain('Invalid credentials');
    });

    test('should render login with error when password does not match', async () => {
      const User = require('../../src/models/User');
      User.findOne.mockResolvedValue({
        _id: 'user-id',
        name: 'John',
        comparePassword: jest.fn().mockResolvedValue(false),
      });

      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .post('/web/login')
        .send({ email: 'user@test.com', password: 'wrong-password' })
        .expect(200);

      expect(response.text).toContain('Invalid credentials');
    });

    test('should render login with error when fields missing', async () => {
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .post('/web/login')
        .send({})
        .expect(200);

      expect(response.text).toContain('Email and password are required');
    });

    test('should return 500 on database error', async () => {
      const User = require('../../src/models/User');
      User.findOne.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/login')
        .send({ email: 'user@test.com', password: 'password123' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /web/register', () => {
    test('should render register page', async () => {
      const response = await request(app)
        .get('/web/register')
        .expect(200);

      expect(response.text).toContain('Blog Engine');
      expect(response.text).toContain('Sign Up');
      expect(response.text).toContain('Name');
      expect(response.text).toContain('Email');
      expect(response.text).toContain('Password');
    });
  });

  describe('POST /web/register', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should register user and redirect to home', async () => {
      const User = require('../../src/models/User');
      User.findOne.mockResolvedValue(null);
      User.__mockSave.mockResolvedValue();

      const response = await request(app)
        .post('/web/register')
        .send({ name: 'New User', email: 'new@test.com', password: 'password123' })
        .expect(302);

      expect(response.headers.location).toBe('/web');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('should render register with error when email already in use', async () => {
      const User = require('../../src/models/User');
      User.findOne.mockResolvedValue({ _id: 'existing-id' });

      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .post('/web/register')
        .send({ name: 'Existing', email: 'existing@test.com', password: 'password123' })
        .expect(200);

      expect(response.text).toContain('Email already in use');
    });

    test('should render register with error when password too short', async () => {
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .post('/web/register')
        .send({ name: 'User', email: 'user@test.com', password: '12345' })
        .expect(200);

      expect(response.text).toContain('at least 6 characters');
    });

    test('should render register with error when fields missing', async () => {
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .post('/web/register')
        .send({})
        .expect(200);

      expect(response.text).toContain('All fields are required');
    });

    test('should return 500 on database error', async () => {
      const User = require('../../src/models/User');
      User.findOne.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/register')
        .send({ name: 'User', email: 'user@test.com', password: 'password123' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /web/categories/:slug', () => {
    test('should render category page with posts', async () => {
      const Category = require('../../src/models/Category');
      Category.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'cat-1', name: 'Tech', slug: 'tech' }),
      });
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const Post = require('../../src/models/Post');
      Post.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'p1',
            title: 'Tech Post',
            content: 'Content',
            author: { name: 'Author' },
            createdAt: '2026-01-01',
          },
        ]),
      });

      const response = await request(app)
        .get('/web/categories/tech')
        .expect(200);

      expect(response.text).toContain('Tech');
      expect(response.text).toContain('Tech Post');
      expect(response.text).toContain('All posts');
    });

    test('should return 404 when category not found', async () => {
      const Category = require('../../src/models/Category');
      Category.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const response = await request(app)
        .get('/web/categories/unknown')
        .expect(404);

      expect(response.text).toContain('Category Not Found');
    });

    test('should render empty state when no posts in category', async () => {
      const Category = require('../../src/models/Category');
      Category.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'cat-2', name: 'Empty Cat', slug: 'empty' }),
      });
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const Post = require('../../src/models/Post');
      Post.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .get('/web/categories/empty')
        .expect(200);

      expect(response.text).toContain('No posts in this category yet');
    });

    test('should return 500 on database error', async () => {
      const Category = require('../../src/models/Category');
      Category.findOne.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const response = await request(app)
        .get('/web/categories/error')
        .expect(500);

      expect(response.body).toHaveProperty('error');
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

  describe('GET /web/logout', () => {
    test('should clear cookie and redirect to home', async () => {
      const response = await request(app)
        .get('/web/logout')
        .expect(302);

      expect(response.headers.location).toBe('/web');
      expect(response.headers['set-cookie']).toBeDefined();
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
