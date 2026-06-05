const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const request = require('supertest');
const { getTestDbUri, cleanDatabase } = require('../helpers/db');

jest.setTimeout(30000);

let app;
let mongoose;

beforeAll(async () => {
  const testUri = getTestDbUri();
  if (!testUri) {
    throw new Error('MONGODB_URI is required for integration tests. Create a .env file.');
  }

  process.env.MONGODB_URI = testUri;

  jest.isolateModules(() => {
    app = require('../../src/app');
    mongoose = require('mongoose');
  });

  await mongoose.connect(testUri);
});

afterAll(async () => {
  if (mongoose) {
    await mongoose.disconnect();
  }
});

beforeEach(async () => {
  if (mongoose && mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const col of collections) {
      await col.deleteMany({});
    }
  }
});

describe('POST /api/auth/register (integration)', () => {
  test('should register a new user and return 201 with token', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New User', email: 'new@example.com', password: 'password123' })
      .expect(201);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('name', 'New User');
    expect(response.body.user).toHaveProperty('email', 'new@example.com');
    expect(response.body.user).toHaveProperty('role', 'subscriber');
    expect(response.body.user).not.toHaveProperty('password');
  });

  test('should return 409 when email already exists', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'First', email: 'duplicate@example.com', password: 'password123' });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Second', email: 'duplicate@example.com', password: 'password123' })
      .expect(409);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 400 when name is missing', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 400 when email is invalid', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'password123' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 400 when password is too short', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@example.com', password: '123' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should lowercase email on registration', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Case Test', email: 'UPPERCASE@Example.Com', password: 'password123' })
      .expect(201);

    expect(response.body.user.email).toBe('uppercase@example.com');
  });
});

describe('POST /api/auth/login (integration)', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });
  });

  test('should login successfully and return token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', 'test@example.com');
    expect(response.body.user).not.toHaveProperty('password');
  });

  test('should return 401 when email does not exist', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'password123' })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 401 when password is incorrect', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  test('should return 400 when email is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});
