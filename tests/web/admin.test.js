const request = require('supertest');

jest.mock('../../src/middlewares/webAuth', () => jest.fn((req, res, next) => {
  req.user = { id: 'admin-id', role: 'admin' };
  req.tokenPayload = { id: 'admin-id', role: 'admin' };
  next();
}));

jest.mock('../../src/models/User', () => ({
  findOne: jest.fn(),
}));

const mockPostFind = jest.fn();
const mockPostFindById = jest.fn();
const mockPostFindByIdAndUpdate = jest.fn();
const mockPostFindByIdAndDelete = jest.fn();
const mockPostSave = jest.fn();

const MockPost = jest.fn((data) => ({
  ...data,
  save: mockPostSave,
}));
MockPost.find = mockPostFind;
MockPost.findById = mockPostFindById;
MockPost.findByIdAndUpdate = mockPostFindByIdAndUpdate;
MockPost.findByIdAndDelete = mockPostFindByIdAndDelete;

jest.mock('../../src/models/Post', () => MockPost);

jest.mock('../../src/models/Comment', () => ({
  deleteMany: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'test-jwt-token'),
}));

const app = require('../../src/app');

describe('Admin Web Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /web/admin/login', () => {
    test('should render login page', async () => {
      const response = await request(app)
        .get('/web/admin/login')
        .expect(200);

      expect(response.text).toContain('Admin Login');
      expect(response.text).toContain('Sign In');
    });
  });

  describe('POST /web/admin/login', () => {
    test('should login successfully and redirect', async () => {
const User = require('../../src/models/User');
      User.findOne.mockResolvedValue({
        _id: 'user-id',
        email: 'admin@test.com',
        role: 'admin',
        comparePassword: jest.fn().mockResolvedValue(true),
      });

      const response = await request(app)
        .post('/web/admin/login')
        .send({ email: 'admin@test.com', password: 'correct-password' })
        .expect(302);

      expect(response.headers.location).toBe('/web/admin');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('should render login with error when credentials invalid', async () => {
      const User = require('../../src/models/User');
      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/web/admin/login')
        .send({ email: 'wrong@test.com', password: 'wrong' })
        .expect(200);

      expect(response.text).toContain('Invalid credentials');
    });

    test('should render login with error when password does not match', async () => {
      const User = require('../../src/models/User');
      User.findOne.mockResolvedValue({
        _id: 'user-id',
        comparePassword: jest.fn().mockResolvedValue(false),
      });

      const response = await request(app)
        .post('/web/admin/login')
        .send({ email: 'admin@test.com', password: 'wrong-password' })
        .expect(200);

      expect(response.text).toContain('Invalid credentials');
    });

    test('should render login with error when email/password missing', async () => {
      const response = await request(app)
        .post('/web/admin/login')
        .send({})
        .expect(200);

      expect(response.text).toContain('Email and password are required');
    });

    test('should return 500 on database error during login', async () => {
      const User = require('../../src/models/User');
      User.findOne.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/admin/login')
        .send({ email: 'admin@test.com', password: 'test' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /web/admin/logout', () => {
    test('should clear cookie and redirect to login', async () => {
      const response = await request(app)
        .get('/web/admin/logout')
        .expect(302);

      expect(response.headers.location).toBe('/web/admin/login');
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('GET /web/admin (dashboard)', () => {
    test('should render dashboard with posts and stats', async () => {
      const Post = require('../../src/models/Post');
      Post.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'post-1',
            title: 'Published Post',
            status: 'published',
            author: { name: 'Admin' },
            updatedAt: '2026-01-01',
          },
          {
            _id: 'post-2',
            title: 'Draft Post',
            status: 'draft',
            author: { name: 'Admin' },
            updatedAt: '2026-01-02',
          },
        ]),
      });

      const response = await request(app)
        .get('/web/admin')
        .expect(200);

      expect(response.text).toContain('Dashboard');
      expect(response.text).toContain('Published Post');
      expect(response.text).toContain('Draft Post');
      expect(response.text).toContain('2');
      expect(response.text).toContain('1'); // one published
    });

    test('should render empty dashboard state', async () => {
      const Post = require('../../src/models/Post');
      Post.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .get('/web/admin')
        .expect(200);

      expect(response.text).toContain('No posts yet');
    });

    test('should return 500 on database error', async () => {
      const Post = require('../../src/models/Post');
      Post.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const response = await request(app)
        .get('/web/admin')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /web/admin/posts/new', () => {
    test('should render new post form', async () => {
      const response = await request(app)
        .get('/web/admin/posts/new')
        .expect(200);

      expect(response.text).toContain('New Post');
      expect(response.text).toContain('Create Post');
    });
  });

  describe('POST /web/admin/posts (create)', () => {
    beforeEach(() => {
      mockPostSave.mockResolvedValue();
    });

    test('should create post and redirect to dashboard', async () => {
      const response = await request(app)
        .post('/web/admin/posts')
        .send({ title: 'New Post', content: 'Post content', status: 'published' })
        .expect(302);

      expect(response.headers.location).toBe('/web/admin');
      expect(MockPost).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Post', author: 'admin-id' }),
      );
    });

    test('should render form with errors on validation failure', async () => {
      const response = await request(app)
        .post('/web/admin/posts')
        .send({ title: '', content: '' })
        .expect(200);

      expect(response.text).toContain('New Post');
      expect(response.text).toContain('Title is required');
    });

    test('should handle tags as comma-separated string', async () => {
      await request(app)
        .post('/web/admin/posts')
        .send({
          title: 'Tagged Post',
          content: 'Content',
          tags: 'javascript, nodejs,  express ',
          status: 'published',
        })
        .expect(302);

      expect(MockPost).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['javascript', 'nodejs', 'express'],
        }),
      );
    });

    test('should return 500 on database error during create', async () => {
      mockPostSave.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/admin/posts')
        .send({ title: 'Failing Post', content: 'Content' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /web/admin/posts/:id/edit', () => {
    test('should render edit form with post data', async () => {
      const Post = require('../../src/models/Post');
      Post.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'post-1',
          title: 'Editable Post',
          content: 'Content to edit',
          status: 'draft',
        }),
      });

      const response = await request(app)
        .get('/web/admin/posts/post-1/edit')
        .expect(200);

      expect(response.text).toContain('Edit Post');
      expect(response.text).toContain('Editable Post');
    });

    test('should redirect when post not found', async () => {
      const Post = require('../../src/models/Post');
      Post.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const response = await request(app)
        .get('/web/admin/posts/nonexistent/edit')
        .expect(302);

      expect(response.headers.location).toBe('/web/admin');
    });

    test('should return 500 on database error', async () => {
      const Post = require('../../src/models/Post');
      Post.findById.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const response = await request(app)
        .get('/web/admin/posts/post-1/edit')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /web/admin/posts/:id/edit (update)', () => {
    test('should update post and redirect', async () => {
      const Post = require('../../src/models/Post');
      Post.findByIdAndUpdate.mockResolvedValue({ _id: 'post-1' });

      const response = await request(app)
        .post('/web/admin/posts/post-1/edit')
        .send({ title: 'Updated Title', content: 'Updated content' })
        .expect(302);

      expect(response.headers.location).toBe('/web/admin');
    });

    test('should render form with errors on validation failure', async () => {
      const Post = require('../../src/models/Post');
      Post.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'post-1',
          title: 'Original',
          content: 'Content',
        }),
      });

      const response = await request(app)
        .post('/web/admin/posts/post-1/edit')
        .send({ title: '', content: '' })
        .expect(200);

      expect(response.text).toContain('Edit Post');
      expect(response.text).toContain('Title cannot be empty');
    });

    test('should redirect when post not found after update', async () => {
      const Post = require('../../src/models/Post');
      Post.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .post('/web/admin/posts/nonexistent/edit')
        .send({ title: 'Title' })
        .expect(302);

      expect(response.headers.location).toBe('/web/admin');
    });

    test('should handle tags as comma-separated string on update', async () => {
      const Post = require('../../src/models/Post');
      Post.findByIdAndUpdate.mockResolvedValue({ _id: 'post-1' });

      await request(app)
        .post('/web/admin/posts/post-1/edit')
        .send({
          title: 'Updated',
          content: 'Content',
          tags: 'tag1, tag2',
        })
        .expect(302);

      expect(Post.findByIdAndUpdate).toHaveBeenCalledWith(
        'post-1',
        expect.objectContaining({ tags: ['tag1', 'tag2'] }),
        expect.any(Object),
      );
    });

    test('should return 500 on database error during update', async () => {
      const Post = require('../../src/models/Post');
      Post.findByIdAndUpdate.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/admin/posts/post-1/edit')
        .send({ title: 'Title', content: 'Content' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /web/admin/posts/:id/delete', () => {
    test('should delete post and its comments, then redirect', async () => {
      const Post = require('../../src/models/Post');
      const Comment = require('../../src/models/Comment');
      Post.findByIdAndDelete.mockResolvedValue({ _id: 'post-1' });
      Comment.deleteMany.mockResolvedValue({ deletedCount: 2 });

      const response = await request(app)
        .post('/web/admin/posts/post-1/delete')
        .expect(302);

      expect(response.headers.location).toBe('/web/admin');
      expect(Comment.deleteMany).toHaveBeenCalledWith({ post: 'post-1' });
    });

    test('should return 500 on database error', async () => {
      const Comment = require('../../src/models/Comment');
      Comment.deleteMany.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/admin/posts/post-1/delete')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /web/admin/posts/:id/toggle-status', () => {
    test('should toggle published to draft', async () => {
      const Post = require('../../src/models/Post');
      const mockSave = jest.fn().mockResolvedValue();
      Post.findById.mockResolvedValue({
        _id: 'post-1',
        status: 'published',
        save: mockSave,
      });

      const response = await request(app)
        .post('/web/admin/posts/post-1/toggle-status')
        .expect(302);

      expect(Post.findById).toHaveBeenCalledWith('post-1');
    });

    test('should toggle draft to published', async () => {
      const Post = require('../../src/models/Post');
      const mockSave = jest.fn().mockResolvedValue();
      Post.findById.mockResolvedValue({
        _id: 'post-1',
        status: 'draft',
        save: mockSave,
      });

      const response = await request(app)
        .post('/web/admin/posts/post-1/toggle-status')
        .expect(302);

      expect(Post.findById).toHaveBeenCalledWith('post-1');
    });

    test('should redirect when post not found', async () => {
      const Post = require('../../src/models/Post');
      Post.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/web/admin/posts/nonexistent/toggle-status')
        .expect(302);

      expect(response.headers.location).toBe('/web/admin');
    });

    test('should return 500 on database error', async () => {
      const Post = require('../../src/models/Post');
      Post.findById.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/admin/posts/post-1/toggle-status')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});
