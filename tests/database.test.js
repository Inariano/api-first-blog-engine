const mongoose = require('mongoose');

jest.mock('mongoose', () => {
  const mockConnection = {
    readyState: 0,
  };
  const mockMongoose = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    connection: mockConnection,
  };
  return mockMongoose;
});

const { connectDatabase, disconnectDatabase } = require('../src/utils/database');

describe('Database utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('connectDatabase should call mongoose.connect with URI', async () => {
    mongoose.connect.mockResolvedValueOnce();

    const connection = await connectDatabase('mongodb://localhost/test');
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost/test');
    expect(connection).toBe(mongoose.connection);
  });

  test('disconnectDatabase should call mongoose.disconnect when connected', async () => {
    mongoose.connection.readyState = 1;
    mongoose.disconnect.mockResolvedValueOnce();

    await disconnectDatabase();
    expect(mongoose.disconnect).toHaveBeenCalled();
  });

  test('disconnectDatabase should not call mongoose.disconnect when already disconnected', async () => {
    mongoose.connection.readyState = 0;

    await disconnectDatabase();
    expect(mongoose.disconnect).not.toHaveBeenCalled();
  });

  test('connectDatabase should return null when no URI provided', async () => {
    const result = await connectDatabase(null);
    expect(result).toBeNull();
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  test('connectDatabase should throw on connection error', async () => {
    mongoose.connect.mockRejectedValueOnce(new Error('Connection failed'));

    await expect(connectDatabase('mongodb://localhost/test')).rejects.toThrow('Connection failed');
  });
});
