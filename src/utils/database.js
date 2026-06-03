const mongoose = require('mongoose');
const config = require('../config');
const logger = require('./logger');

const connectDatabase = async (uri) => {
  const connectionUri = uri || config.mongodb.uri;

  if (!connectionUri) {
    logger.warn('No MongoDB URI provided, running without database');
    return null;
  }

  try {
    await mongoose.connect(connectionUri);
    logger.info('Connected to MongoDB');
    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
};

module.exports = { connectDatabase, disconnectDatabase };
