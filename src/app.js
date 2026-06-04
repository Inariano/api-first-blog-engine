const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { engine } = require('express-handlebars');
const config = require('./config');
const logger = require('./utils/logger');
const healthRouter = require('./api/health');
const authRouter = require('./api/auth');
const postsRouter = require('./api/posts');
const commentsRouter = require('./api/comments');
const categoriesRouter = require('./api/categories');
const webRouter = require('./web/home');
const adminRouter = require('./web/admin');

const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: false,
}));

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
app.use(cookieParser());

// View engine
const hbs = engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    eq(a, b) { return a === b; },
    ne(a, b) { return a !== b; },
  },
});
app.engine('hbs', hbs);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Logging
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// Static files
app.use(express.static('public'));

// Routes
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/posts/:postId/comments', commentsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/web/admin', adminRouter);
app.use('/web', webRouter);
app.get('/', (req, res) => res.redirect('/web'));

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
