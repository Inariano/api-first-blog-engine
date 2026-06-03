const mongoose = require('mongoose');

function getTestDbUri(originalUri) {
  const uri = originalUri || process.env.MONGODB_URI;
  if (!uri) return null;

  const match = uri.match(/\/([^/?\s]+)(\?|$)/);
  if (match) {
    const baseName = match[1].replace(/-test$/, '');
    return uri.replace(match[1], `${baseName}-test`);
  }

  if (uri.includes('?')) {
    return uri.replace('?', '/blog-engine-test?');
  }

  return `${uri}/blog-engine-test`;
}

async function connect(uri) {
  const connectionUri = uri || getTestDbUri();
  if (!connectionUri) {
    throw new Error('MONGODB_URI not set. Create a .env file with your Atlas connection string.');
  }
  await mongoose.connect(connectionUri);
}

async function close() {
  await mongoose.disconnect();
}

async function cleanDatabase() {
  if (!mongoose.connection.db) return;
  const collections = await mongoose.connection.db.collections();
  for (const col of collections) {
    await col.deleteMany({});
  }
}

module.exports = { connect, close, cleanDatabase, getTestDbUri };
