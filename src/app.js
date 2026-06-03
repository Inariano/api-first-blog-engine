const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./utils/logger');
const healthRouter = require('./api/health');
const authRouter = require('./api/auth');
const postsRouter = require('./api/posts');

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: config.env === 'production' ? process.env.CORS_ORIGIN : '*', credentials: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// Static files
app.use(express.static('public'));

// Routes
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);

// Test-only route that triggers error handler
if (config.env === 'test') {
  app.get('/trigger-error', (req, res, next) => {
    next(new Error('Test error'));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, _next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
