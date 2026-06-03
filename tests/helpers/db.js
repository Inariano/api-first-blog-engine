const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

const connect = async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
};

const close = async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
};

module.exports = { connect, close };
