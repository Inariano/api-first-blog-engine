const request = require('supertest');

jest.mock('../src/models/Post', () => {
  const mockSave = jest.fn();
  const mockToJSON = jest.fn().mockReturnValue({});

  const Post = jest.fn().mockImplementation((data) => ({
    _id: 'generated-post-id',
    title: data && data.title,
    slug: (data && data.slug) || (data && data.title ? data.title.toLowerCase().replace(/\s+/g, '-') : undefined),
    content: data && data.content,
    category: data && data.category,
    author: (data && data.author) || 'test-user-id',
    tags: (data && data.tags) || [],
    status: (data && data.status) || 'draft',
    save: mockSave,
    toJSON: mockToJSON,
  }));

  Post.find = jest.fn();
  Post.findById = jest.fn();
  Post.findOne = jest.fn();
  Post.findOneAndDelete = jest.fn();
  Post.__mockSave = mockSave;
  Post.__mockToJSON = mockToJSON;
  return Post;
});

jest.mock('../src/middlewares/auth', () => jest.fn((req, res, next) => {
  req.user = { id: 'test-user-id', role: 'writer' };
  next();
}));

const auth = require('../src/middlewares/auth');
const app = require('../src/app');

function mockPost() {
  const Post = require('../src/models/Post');
  return Post;
}

describe('GET /api/posts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return list of published posts', async () => {
    const Post = mockPost();
    const posts = [
      { _id: '1', title: 'Post 1', toJSON: () => ({ _id: '1', title: 'Post 1' }) },
      { _id: '2', title: 'Post 2', toJSON: () => ({ _id: '2', title: 'Post 2' }) },
    ];
    Post.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(posts),
    });

    const response = await request(app)
      .get('/api/posts')
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].title).toBe('Post 1');
    expect(Post.find).toHaveBeenCalledWith({ status: 'published' });
  });

  test('should return empty array when no posts', async () => {
    const Post = mockPost();
    Post.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });

    const response = await request(app)
      .get('/api/posts')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  test('should return 500 on error', async () => {
    const Post = mockPost();
    Post.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockRejectedValue(new Error('Database error')),
    });

    const response = await request(app)
      .get('/api/posts')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/posts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create a post and return 201', async () => {
    const Post = mockPost();
    Post.__mockSave.mockResolvedValue();
    Post.__mockToJSON.mockReturnValue({
      _id: 'generated-post-id',
      title: 'New Post',
      content: 'Post content',
      category: 'category-id',
      author: 'test-user-id',
      tags: [],
      status: 'draft',
    });

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'New Post', content: 'Post content', category: 'category-id' })
      .expect(201);

    expect(response.body).toHaveProperty('_id');
    expect(response.body.title).toBe('New Post');
  });

  test('should return 400 when title is missing', async () => {
    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ content: 'Post content', category: 'category-id' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 400 when content is missing', async () => {
    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'New Post', category: 'category-id' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 400 when category is missing', async () => {
    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'New Post', content: 'Post content' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 500 on save error', async () => {
    const Post = mockPost();
    Post.__mockSave.mockRejectedValue(new Error('Save error'));

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'New Post', content: 'Post content', category: 'category-id' })
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });

  test('should sanitize HTML content on create', async () => {
    const Post = mockPost();
    Post.__mockSave.mockResolvedValue();
    Post.__mockToJSON.mockReturnValue({ _id: 'p1', title: 'Test', content: 'sanitized' });

    await request(app)
      .post('/api/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Test', content: '<script>alert("xss")</script><p>Hello</p>', category: 'cat-id' })
      .expect(201);

    expect(Post).toHaveBeenCalledWith(expect.objectContaining({
      content: '&lt;script&gt;alert("xss")&lt;/script&gt;<p>Hello</p>',
    }));
  });

  test('should return 403 when user is not writer or admin', async () => {
    auth.mockImplementationOnce((req, res, next) => {
      req.user = { id: 'test-user-id', role: 'subscriber' };
      next();
    });

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Test', content: 'Content', category: 'cat-id' })
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/posts/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return a single post', async () => {
    const Post = mockPost();
    const post = { _id: 'post-id', title: 'My Post', toJSON: () => ({ _id: 'post-id', title: 'My Post' }) };
    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      then: (resolve) => resolve(post),
    };
    Post.findById.mockReturnValue(mockQuery);

    const response = await request(app)
      .get('/api/posts/post-id')
      .expect(200);

    expect(response.body.title).toBe('My Post');
  });

  test('should return 404 when post not found', async () => {
    const Post = mockPost();
    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      then: (resolve) => resolve(null),
    };
    Post.findById.mockReturnValue(mockQuery);

    const response = await request(app)
      .get('/api/posts/nonexistent-id')
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 500 on error', async () => {
    const Post = mockPost();
    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      then: (_resolve, reject) => reject(new Error('Database error')),
    };
    Post.findById.mockReturnValue(mockQuery);

    const response = await request(app)
      .get('/api/posts/post-id')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PUT /api/posts/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should update a post and return 200', async () => {
    const Post = mockPost();
    Post.__mockSave.mockResolvedValue();
    Post.__mockToJSON.mockReturnValue({
      _id: 'post-id',
      title: 'Updated Title',
      content: 'Updated content',
      category: 'cat-id',
    });

    Post.findOne.mockResolvedValue({
      _id: 'post-id',
      title: 'Original',
      content: 'Original content',
      category: 'cat-id',
      tags: [],
      status: 'draft',
      save: Post.__mockSave,
      toJSON: Post.__mockToJSON,
    });

    const response = await request(app)
      .put('/api/posts/post-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated Title', content: 'Updated content', status: 'published' })
      .expect(200);

    expect(response.body.title).toBe('Updated Title');
    expect(Post.findOne).toHaveBeenCalledWith({ _id: 'post-id', author: 'test-user-id' });
  });

  test('should return 404 when post not found', async () => {
    const Post = mockPost();
    Post.findOne.mockResolvedValue(null);

    const response = await request(app)
      .put('/api/posts/nonexistent-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated' })
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  test('should partially update with only status change', async () => {
    const Post = mockPost();
    Post.__mockSave.mockResolvedValue();
    Post.__mockToJSON.mockReturnValue({
      _id: 'post-id',
      title: 'Original',
      content: 'Original content',
      status: 'published',
    });

    Post.findOne.mockResolvedValue({
      _id: 'post-id',
      title: 'Original',
      content: 'Original content',
      category: 'cat-id',
      tags: [],
      status: 'draft',
      save: Post.__mockSave,
      toJSON: Post.__mockToJSON,
    });

    await request(app)
      .put('/api/posts/post-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ status: 'published' })
      .expect(200);
  });

  test('should update category when provided', async () => {
    const Post = mockPost();
    Post.__mockSave.mockResolvedValue();
    Post.__mockToJSON.mockReturnValue({
      _id: 'post-id',
      title: 'Original',
      content: 'Content',
      category: 'new-cat-id',
    });

    Post.findOne.mockResolvedValue({
      _id: 'post-id',
      title: 'Original',
      content: 'Content',
      category: 'old-cat-id',
      tags: [],
      status: 'draft',
      save: Post.__mockSave,
      toJSON: Post.__mockToJSON,
    });

    await request(app)
      .put('/api/posts/post-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ category: 'new-cat-id' })
      .expect(200);
  });

  test('should update tags when provided', async () => {
    const Post = mockPost();
    Post.__mockSave.mockResolvedValue();
    Post.__mockToJSON.mockReturnValue({
      _id: 'post-id',
      title: 'Original',
      tags: ['new-tag'],
    });

    Post.findOne.mockResolvedValue({
      _id: 'post-id',
      title: 'Original',
      content: 'Content',
      category: 'cat-id',
      tags: [],
      status: 'draft',
      save: Post.__mockSave,
      toJSON: Post.__mockToJSON,
    });

    await request(app)
      .put('/api/posts/post-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ tags: ['new-tag'] })
      .expect(200);
  });

  test('should return 500 on save error', async () => {
    const Post = mockPost();
    Post.findOne.mockResolvedValue({
      _id: 'post-id',
      title: 'Original',
      content: 'Original content',
      category: 'cat-id',
      tags: [],
      status: 'draft',
      save: jest.fn().mockRejectedValue(new Error('Save error')),
      toJSON: jest.fn(),
    });

    const response = await request(app)
      .put('/api/posts/post-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated' })
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });

  test('should sanitize HTML content on update', async () => {
    const Post = mockPost();
    const mockSave = jest.fn().mockResolvedValue();
    const mockToJSON = jest.fn().mockReturnValue({ _id: 'post-id', title: 'Updated', content: 'sanitized' });

    const postDoc = {
      _id: 'post-id',
      title: 'Original',
      content: 'Original content',
      category: 'cat-id',
      tags: [],
      status: 'draft',
      save: mockSave,
      toJSON: mockToJSON,
    };
    Post.findOne.mockResolvedValue(postDoc);

    await request(app)
      .put('/api/posts/post-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ content: '<script>alert("xss")</script><p>Updated</p>' })
      .expect(200);

    expect(postDoc.content).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;<p>Updated</p>');
  });

  test('should return 403 when user is not writer or admin on update', async () => {
    auth.mockImplementationOnce((req, res, next) => {
      req.user = { id: 'test-user-id', role: 'subscriber' };
      next();
    });

    const response = await request(app)
      .put('/api/posts/post-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated' })
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/posts/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should delete a post and return 204', async () => {
    const Post = mockPost();
    Post.findOneAndDelete.mockResolvedValue({ _id: 'post-id' });

    const response = await request(app)
      .delete('/api/posts/post-id')
      .set('Authorization', 'Bearer valid-token')
      .expect(204);

    expect(response.body).toEqual({});
    expect(Post.findOneAndDelete).toHaveBeenCalledWith({ _id: 'post-id', author: 'test-user-id' });
  });

  test('should return 404 when post not found', async () => {
    const Post = mockPost();
    Post.findOneAndDelete.mockResolvedValue(null);

    const response = await request(app)
      .delete('/api/posts/nonexistent-id')
      .set('Authorization', 'Bearer valid-token')
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 500 on error', async () => {
    const Post = mockPost();
    Post.findOneAndDelete.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .delete('/api/posts/post-id')
      .set('Authorization', 'Bearer valid-token')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 403 when user is not writer or admin on delete', async () => {
    auth.mockImplementationOnce((req, res, next) => {
      req.user = { id: 'test-user-id', role: 'subscriber' };
      next();
    });

    const response = await request(app)
      .delete('/api/posts/post-id')
      .set('Authorization', 'Bearer valid-token')
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});
