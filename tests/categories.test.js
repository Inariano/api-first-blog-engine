const request = require('supertest');

jest.mock('../src/models/Category', () => {
  const mockSave = jest.fn();
  const mockToJSON = jest.fn().mockReturnValue({});

  const Category = jest.fn().mockImplementation((data) => ({
    _id: 'generated-category-id',
    name: data && data.name,
    slug: (data && data.slug) || (data && data.name ? data.name.toLowerCase().replace(/\s+/g, '-') : undefined),
    description: (data && data.description) || '',
    save: mockSave,
    toJSON: mockToJSON,
  }));

  Category.find = jest.fn();
  Category.findById = jest.fn();
  Category.findByIdAndDelete = jest.fn();
  Category.__mockSave = mockSave;
  Category.__mockToJSON = mockToJSON;
  return Category;
});

jest.mock('../src/middlewares/auth', () => jest.fn((req, res, next) => {
  req.user = { id: 'test-user-id', role: 'admin' };
  next();
}));

const app = require('../src/app');

function mockCategory() {
  return require('../src/models/Category');
}

describe('GET /api/categories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return list of categories', async () => {
    const Category = mockCategory();
    const categories = [
      { _id: '1', name: 'CSS', toJSON: () => ({ _id: '1', name: 'CSS' }) },
      { _id: '2', name: 'HTML', toJSON: () => ({ _id: '2', name: 'HTML' }) },
    ];
    Category.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(categories),
    });

    const response = await request(app)
      .get('/api/categories')
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].name).toBe('CSS');
  });

  test('should return empty array when no categories', async () => {
    const Category = mockCategory();
    Category.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });

    const response = await request(app)
      .get('/api/categories')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  test('should return 500 on error', async () => {
    const Category = mockCategory();
    Category.find.mockReturnValue({
      sort: jest.fn().mockRejectedValue(new Error('Database error')),
    });

    const response = await request(app)
      .get('/api/categories')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/categories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create a category and return 201', async () => {
    const Category = mockCategory();
    Category.__mockSave.mockResolvedValue();
    Category.__mockToJSON.mockReturnValue({
      _id: 'generated-category-id',
      name: 'JavaScript',
      description: '',
      slug: 'javascript',
    });

    const response = await request(app)
      .post('/api/categories')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'JavaScript' })
      .expect(201);

    expect(response.body).toHaveProperty('_id');
    expect(response.body.name).toBe('JavaScript');
  });

  test('should create a category with description', async () => {
    const Category = mockCategory();
    Category.__mockSave.mockResolvedValue();
    Category.__mockToJSON.mockReturnValue({
      _id: 'generated-category-id',
      name: 'Node.js',
      description: 'Runtime environment',
    });

    const response = await request(app)
      .post('/api/categories')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Node.js', description: 'Runtime environment' })
      .expect(201);

    expect(response.body.description).toBe('Runtime environment');
  });

  test('should return 400 when name is missing', async () => {
    const response = await request(app)
      .post('/api/categories')
      .set('Authorization', 'Bearer valid-token')
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 409 on duplicate name', async () => {
    const Category = mockCategory();
    const dupError = new Error('Duplicate key');
    dupError.code = 11000;
    Category.__mockSave.mockRejectedValue(dupError);

    const response = await request(app)
      .post('/api/categories')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'JavaScript' })
      .expect(409);

    expect(response.body.error).toBe('Category already exists');
  });

  test('should return 500 on save error', async () => {
    const Category = mockCategory();
    Category.__mockSave.mockRejectedValue(new Error('Save error'));

    const response = await request(app)
      .post('/api/categories')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'JavaScript' })
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/categories/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return a single category', async () => {
    const Category = mockCategory();
    Category.findById.mockResolvedValue({
      _id: 'cat-id',
      name: 'React',
      toJSON: () => ({ _id: 'cat-id', name: 'React' }),
    });

    const response = await request(app)
      .get('/api/categories/cat-id')
      .expect(200);

    expect(response.body.name).toBe('React');
  });

  test('should return 404 when category not found', async () => {
    const Category = mockCategory();
    Category.findById.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/categories/nonexistent-id')
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 500 on error', async () => {
    const Category = mockCategory();
    Category.findById.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .get('/api/categories/error-id')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PUT /api/categories/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should update a category and return 200', async () => {
    const Category = mockCategory();
    Category.__mockSave.mockResolvedValue();
    Category.__mockToJSON.mockReturnValue({
      _id: 'cat-id',
      name: 'Updated Name',
      description: 'Updated description',
    });

    Category.findById.mockResolvedValue({
      _id: 'cat-id',
      name: 'Original',
      description: 'Original description',
      save: Category.__mockSave,
      toJSON: Category.__mockToJSON,
    });

    const response = await request(app)
      .put('/api/categories/cat-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Updated Name', description: 'Updated description' })
      .expect(200);

    expect(response.body.name).toBe('Updated Name');
  });

  test('should return 404 when category not found', async () => {
    const Category = mockCategory();
    Category.findById.mockResolvedValue(null);

    const response = await request(app)
      .put('/api/categories/nonexistent-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Updated' })
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  test('should partially update only description', async () => {
    const Category = mockCategory();
    Category.__mockSave.mockResolvedValue();
    Category.__mockToJSON.mockReturnValue({
      _id: 'cat-id',
      name: 'Original Name',
      description: 'New description',
    });

    Category.findById.mockResolvedValue({
      _id: 'cat-id',
      name: 'Original Name',
      description: 'Original description',
      save: Category.__mockSave,
      toJSON: Category.__mockToJSON,
    });

    await request(app)
      .put('/api/categories/cat-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ description: 'New description' })
      .expect(200);
  });

  test('should partially update only name', async () => {
    const Category = mockCategory();
    Category.__mockSave.mockResolvedValue();
    Category.__mockToJSON.mockReturnValue({
      _id: 'cat-id',
      name: 'New Name',
      description: 'Original description',
    });

    Category.findById.mockResolvedValue({
      _id: 'cat-id',
      name: 'Old Name',
      description: 'Original description',
      save: Category.__mockSave,
      toJSON: Category.__mockToJSON,
    });

    await request(app)
      .put('/api/categories/cat-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'New Name' })
      .expect(200);
  });

  test('should return 409 on duplicate name during update', async () => {
    const Category = mockCategory();
    const dupError = new Error('Duplicate key');
    dupError.code = 11000;

    Category.findById.mockResolvedValue({
      _id: 'cat-id',
      name: 'Old Name',
      description: '',
      save: jest.fn().mockRejectedValue(dupError),
      toJSON: jest.fn(),
    });

    const response = await request(app)
      .put('/api/categories/cat-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Duplicate' })
      .expect(409);

    expect(response.body.error).toBe('Category already exists');
  });

  test('should return 500 on save error during update', async () => {
    const Category = mockCategory();
    Category.findById.mockResolvedValue({
      _id: 'cat-id',
      name: 'Original',
      description: '',
      save: jest.fn().mockRejectedValue(new Error('Save error')),
      toJSON: jest.fn(),
    });

    const response = await request(app)
      .put('/api/categories/cat-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Updated' })
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/categories/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should delete a category and return 204', async () => {
    const Category = mockCategory();
    Category.findByIdAndDelete.mockResolvedValue({ _id: 'cat-id' });

    const response = await request(app)
      .delete('/api/categories/cat-id')
      .set('Authorization', 'Bearer valid-token')
      .expect(204);

    expect(response.body).toEqual({});
  });

  test('should return 404 when category not found', async () => {
    const Category = mockCategory();
    Category.findByIdAndDelete.mockResolvedValue(null);

    const response = await request(app)
      .delete('/api/categories/nonexistent-id')
      .set('Authorization', 'Bearer valid-token')
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 500 on error', async () => {
    const Category = mockCategory();
    Category.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .delete('/api/categories/error-id')
      .set('Authorization', 'Bearer valid-token')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});
