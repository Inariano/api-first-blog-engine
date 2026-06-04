const request = require('supertest');

jest.mock('../../src/middlewares/webAuth', () => jest.fn((req, res, next) => {
  req.user = { id: 'admin-id', role: 'admin' };
  req.tokenPayload = { id: 'admin-id', role: 'admin' };
  next();
}));

jest.mock('../../src/middlewares/csrf', () => ({
  csrfProtection: (req, res, next) => {
    res.locals.csrfToken = 'test-csrf-token';
    next();
  },
  csrfValidate: (req, res, next) => next(),
}));

const mockUserSave = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserFind = jest.fn();
const mockUserFindById = jest.fn();
const mockUserFindByIdAndDelete = jest.fn();

const MockUser = jest.fn((data) => ({
  ...data,
  save: mockUserSave,
}));
MockUser.findOne = mockUserFindOne;
MockUser.find = mockUserFind;
MockUser.findById = mockUserFindById;
MockUser.findByIdAndDelete = mockUserFindByIdAndDelete;

jest.mock('../../src/models/User', () => MockUser);

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

const mockCategoryFind = jest.fn();
const mockCategoryFindById = jest.fn();
const mockCategoryFindByIdAndUpdate = jest.fn();
const mockCategoryFindByIdAndDelete = jest.fn();
const mockCategorySave = jest.fn();

const MockCategory = jest.fn((data) => ({
  ...data,
  save: mockCategorySave,
}));
MockCategory.find = mockCategoryFind;
MockCategory.findById = mockCategoryFindById;
MockCategory.findByIdAndUpdate = mockCategoryFindByIdAndUpdate;
MockCategory.findByIdAndDelete = mockCategoryFindByIdAndDelete;

jest.mock('../../src/models/Category', () => MockCategory);

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

    test('should render login with error when user is blocked', async () => {
      const User = require('../../src/models/User');
      User.findOne.mockResolvedValue({
        status: 'blocked',
        comparePassword: jest.fn(),
      });

      const response = await request(app)
        .post('/web/admin/login')
        .send({ email: 'blocked@test.com', password: 'any' })
        .expect(200);

      expect(response.text).toContain('Your account has been blocked');
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
      expect(response.text).toContain('User List');
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
    test('should render new post form with categories', async () => {
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: 'cat-1', name: 'Category 1' },
          { _id: 'cat-2', name: 'Category 2' },
        ]),
      });

      const response = await request(app)
        .get('/web/admin/posts/new')
        .expect(200);

      expect(response.text).toContain('New Post');
      expect(response.text).toContain('Create Post');
      expect(response.text).toContain('Category 1');
      expect(response.text).toContain('Category 2');
    });

    test('should return 500 on database error', async () => {
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const response = await request(app)
        .get('/web/admin/posts/new')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /web/admin/posts (create)', () => {
    beforeEach(() => {
      mockPostSave.mockResolvedValue();
    });

    test('should create post and redirect to dashboard', async () => {
      const response = await request(app)
        .post('/web/admin/posts')
        .send({ title: 'New Post', content: 'Post content', category: 'cat-1', status: 'published' })
        .expect(302);

      expect(response.headers.location).toBe('/web/admin');
      expect(MockPost).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Post', author: 'admin-id', category: 'cat-1' }),
      );
    });

    test('should render form with errors on validation failure', async () => {
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .post('/web/admin/posts')
        .send({ title: '', content: '' })
        .expect(200);

      expect(response.text).toContain('New Post');
      expect(response.text).toContain('Title is required');
    });

    test('should render form with error when category is missing', async () => {
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .post('/web/admin/posts')
        .send({ title: 'No Category', content: 'Content' })
        .expect(200);

      expect(response.text).toContain('New Post');
      expect(response.text).toContain('Category is required');
    });

    test('should handle tags as comma-separated string', async () => {
      await request(app)
        .post('/web/admin/posts')
        .send({
          title: 'Tagged Post',
          content: 'Content',
          category: 'cat-1',
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
        .send({ title: 'Failing Post', content: 'Content', category: 'cat-1' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /web/admin/posts/:id/edit', () => {
    test('should render edit form with post data and categories', async () => {
      const Post = require('../../src/models/Post');
      Post.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'post-1',
          title: 'Editable Post',
          content: 'Content to edit',
          category: 'cat-1',
          status: 'draft',
        }),
      });
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: 'cat-1', name: 'Tech' },
        ]),
      });

      const response = await request(app)
        .get('/web/admin/posts/post-1/edit')
        .expect(200);

      expect(response.text).toContain('Edit Post');
      expect(response.text).toContain('Editable Post');
      expect(response.text).toContain('Tech');
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
        .send({ title: 'Updated Title', content: 'Updated content', category: 'cat-1' })
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
          category: 'cat-1',
        }),
      });
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
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
          category: 'cat-1',
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
        .send({ title: 'Title', content: 'Content', category: 'cat-1' })
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
        category: 'cat-1',
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
        category: 'cat-1',
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

  describe('GET /web/admin/categories', () => {
    test('should render categories list', async () => {
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: 'cat-1', name: 'CSS', slug: 'css', description: 'Styling' },
          { _id: 'cat-2', name: 'HTML', slug: 'html', description: '' },
        ]),
      });

      const response = await request(app)
        .get('/web/admin/categories')
        .expect(200);

      expect(response.text).toContain('Categories');
      expect(response.text).toContain('CSS');
      expect(response.text).toContain('HTML');
    });

    test('should render empty categories state', async () => {
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .get('/web/admin/categories')
        .expect(200);

      expect(response.text).toContain('No categories yet');
    });

    test('should return 500 on database error', async () => {
      const Category = require('../../src/models/Category');
      Category.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const response = await request(app)
        .get('/web/admin/categories')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /web/admin/categories/new', () => {
    test('should render new category form', async () => {
      const response = await request(app)
        .get('/web/admin/categories/new')
        .expect(200);

      expect(response.text).toContain('New Category');
      expect(response.text).toContain('Create Category');
    });
  });

  describe('POST /web/admin/categories (create)', () => {
    beforeEach(() => {
      mockCategorySave.mockResolvedValue();
    });

    test('should create category and redirect', async () => {
      const response = await request(app)
        .post('/web/admin/categories')
        .send({ name: 'JavaScript' })
        .expect(302);

      expect(response.headers.location).toBe('/web/admin/categories');
    });

    test('should render form with errors on validation failure', async () => {
      const response = await request(app)
        .post('/web/admin/categories')
        .send({ name: '' })
        .expect(200);

      expect(response.text).toContain('New Category');
      expect(response.text).toContain('Name is required');
    });

    test('should render form with error on duplicate name', async () => {
      const dupError = new Error('Duplicate');
      dupError.code = 11000;
      mockCategorySave.mockRejectedValue(dupError);

      const response = await request(app)
        .post('/web/admin/categories')
        .send({ name: 'JavaScript' })
        .expect(200);

      expect(response.text).toContain('Category already exists');
    });

    test('should return 500 on database error during create', async () => {
      mockCategorySave.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/admin/categories')
        .send({ name: 'Failing' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /web/admin/categories/:id/edit', () => {
    test('should render edit form with category data', async () => {
      const Category = require('../../src/models/Category');
      Category.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'cat-1',
          name: 'Node.js',
          description: 'Runtime',
        }),
      });

      const response = await request(app)
        .get('/web/admin/categories/cat-1/edit')
        .expect(200);

      expect(response.text).toContain('Edit Category');
      expect(response.text).toContain('Node.js');
    });

    test('should redirect when category not found', async () => {
      const Category = require('../../src/models/Category');
      Category.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const response = await request(app)
        .get('/web/admin/categories/nonexistent/edit')
        .expect(302);

      expect(response.headers.location).toBe('/web/admin/categories');
    });

    test('should return 500 on database error', async () => {
      const Category = require('../../src/models/Category');
      Category.findById.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const response = await request(app)
        .get('/web/admin/categories/cat-1/edit')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /web/admin/categories/:id/edit (update)', () => {
    test('should update category and redirect', async () => {
      const Category = require('../../src/models/Category');
      Category.findByIdAndUpdate.mockResolvedValue({ _id: 'cat-1' });

      const response = await request(app)
        .post('/web/admin/categories/cat-1/edit')
        .send({ name: 'Updated' })
        .expect(302);

      expect(response.headers.location).toBe('/web/admin/categories');
    });

    test('should render form with errors on validation failure', async () => {
      const Category = require('../../src/models/Category');
      Category.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'cat-1',
          name: 'Original',
        }),
      });

      const response = await request(app)
        .post('/web/admin/categories/cat-1/edit')
        .send({ name: '' })
        .expect(200);

      expect(response.text).toContain('Edit Category');
      expect(response.text).toContain('Name cannot be empty');
    });

    test('should redirect when category not found after update', async () => {
      const Category = require('../../src/models/Category');
      Category.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .post('/web/admin/categories/nonexistent/edit')
        .send({ name: 'Title' })
        .expect(302);

      expect(response.headers.location).toBe('/web/admin/categories');
    });

    test('should render form with error on duplicate name during update', async () => {
      const Category = require('../../src/models/Category');
      const dupError = new Error('Duplicate');
      dupError.code = 11000;
      Category.findByIdAndUpdate.mockRejectedValue(dupError);
      Category.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'cat-1',
          name: 'Original',
        }),
      });

      const response = await request(app)
        .post('/web/admin/categories/cat-1/edit')
        .send({ name: 'Duplicate' })
        .expect(200);

      expect(response.text).toContain('Category already exists');
    });

    test('should return 500 on database error during update', async () => {
      const Category = require('../../src/models/Category');
      Category.findByIdAndUpdate.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/admin/categories/cat-1/edit')
        .send({ name: 'Title' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /web/admin/categories/:id/delete', () => {
    test('should delete category and redirect', async () => {
      const Category = require('../../src/models/Category');
      Category.findByIdAndDelete.mockResolvedValue({ _id: 'cat-1' });

      const response = await request(app)
        .post('/web/admin/categories/cat-1/delete')
        .expect(302);

      expect(response.headers.location).toBe('/web/admin/categories');
      expect(Category.findByIdAndDelete).toHaveBeenCalledWith('cat-1');
    });

    test('should return 500 on database error', async () => {
      const Category = require('../../src/models/Category');
      Category.findByIdAndDelete.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/admin/categories/cat-1/delete')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /web/admin/users', () => {
    test('should render users list and hide actions for current admin', async () => {
      const User = require('../../src/models/User');
      User.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: 'admin-id', name: 'You', email: 'you@test.com', role: 'admin', createdAt: '2026-01-01' },
          { _id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'subscriber', createdAt: '2026-02-01' },
        ]),
      });

      const response = await request(app)
        .get('/web/admin/users')
        .expect(200);

      const youRow = response.text.split('Bob')[0];
      expect(youRow).toContain('You</td>');
      expect(youRow).toMatch(/you/i);
      expect(youRow).not.toContain('action="/web/admin/users/admin-id/block"');
      expect(youRow).not.toContain('action="/web/admin/users/admin-id/make-author"');
      expect(youRow).not.toContain('action="/web/admin/users/admin-id/delete"');
    });

    test('should render empty users state', async () => {
      const User = require('../../src/models/User');
      User.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .get('/web/admin/users')
        .expect(200);

      expect(response.text).toContain('No users found');
    });

    test('should return 500 on database error', async () => {
      const User = require('../../src/models/User');
      User.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const response = await request(app)
        .get('/web/admin/users')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /web/admin/users/:id/block', () => {
    test('should block an active user', async () => {
      const User = require('../../src/models/User');
      const userDoc = { _id: 'u1', status: 'active', save: jest.fn().mockResolvedValue() };
      User.findById.mockResolvedValue(userDoc);

      const response = await request(app)
        .post('/web/admin/users/u1/block')
        .expect(302);

      expect(response.headers.location).toBe('/web/admin/users');
      expect(userDoc.status).toBe('blocked');
      expect(userDoc.save).toHaveBeenCalled();
    });

    test('should unblock a blocked user', async () => {
      const User = require('../../src/models/User');
      const userDoc = { _id: 'u1', status: 'blocked', save: jest.fn().mockResolvedValue() };
      User.findById.mockResolvedValue(userDoc);

      const response = await request(app)
        .post('/web/admin/users/u1/block')
        .expect(302);

      expect(userDoc.status).toBe('active');
      expect(userDoc.save).toHaveBeenCalled();
    });

    test('should return 404 when user not found', async () => {
      const User = require('../../src/models/User');
      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/web/admin/users/nonexistent/block')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 500 on database error', async () => {
      const User = require('../../src/models/User');
      User.findById.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/admin/users/u1/block')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /web/admin/users/:id/make-author', () => {
    test('should change role to writer', async () => {
      const User = require('../../src/models/User');
      const userDoc = { _id: 'u1', role: 'subscriber', save: jest.fn().mockResolvedValue() };
      User.findById.mockResolvedValue(userDoc);

      const response = await request(app)
        .post('/web/admin/users/u1/make-author')
        .expect(302);

      expect(response.headers.location).toBe('/web/admin/users');
      expect(userDoc.role).toBe('writer');
      expect(userDoc.save).toHaveBeenCalled();
    });

    test('should return 404 when user not found', async () => {
      const User = require('../../src/models/User');
      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/web/admin/users/nonexistent/make-author')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 500 on database error', async () => {
      const User = require('../../src/models/User');
      User.findById.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/admin/users/u1/make-author')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /web/admin/users/:id/delete', () => {
    test('should delete user and redirect', async () => {
      const User = require('../../src/models/User');
      User.findByIdAndDelete.mockResolvedValue({ _id: 'u1' });

      const response = await request(app)
        .post('/web/admin/users/u1/delete')
        .expect(302);

      expect(response.headers.location).toBe('/web/admin/users');
      expect(User.findByIdAndDelete).toHaveBeenCalledWith('u1');
    });

    test('should return 404 when user not found', async () => {
      const User = require('../../src/models/User');
      User.findByIdAndDelete.mockResolvedValue(null);

      const response = await request(app)
        .post('/web/admin/users/nonexistent/delete')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 500 on database error', async () => {
      const User = require('../../src/models/User');
      User.findByIdAndDelete.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/web/admin/users/u1/delete')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});
