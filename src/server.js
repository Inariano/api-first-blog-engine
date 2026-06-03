const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { connectDatabase } = require('./utils/database');

const start = async () => {
  await connectDatabase();

  const server = app.listen(config.port, config.host, () => {
    logger.info(`Server running at http://${config.host}:${config.port}`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      const { disconnectDatabase } = require('./utils/database');
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
