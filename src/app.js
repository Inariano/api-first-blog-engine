const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const rateLimit = require('express-rate-limit');
const { engine } = require('express-handlebars');
const config = require('./config');
const logger = require('./utils/logger');
const healthRouter = require('./api/health');
const authRouter = require('./api/auth');
const postsRouter = require('./api/posts');
const commentsRouter = require('./api/comments');
const categoriesRouter = require('./api/categories');
const Category = require('./models/Category');
const webRouter = require('./web/home');
const adminRouter = require('./web/admin');
const flash = require('./middlewares/flash');
const { csrfProtection } = require('./middlewares/csrf');
const csp = require('./middlewares/csp');

const app = express();

// Security
app.use(csp);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'strict-dynamic'",
        (req, res) => `'nonce-${res.nonce}'`,
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
    },
  },
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

// Sessions
const sessionOptions = {
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
};

if (config.mongodb.uri) {
  sessionOptions.store = MongoStore.create({
    mongoUrl: config.mongodb.uri,
    ttl: 24 * 60 * 60,
  });
}

app.use(session(sessionOptions));
app.use(flash);
app.use(csrfProtection);

// View engine
const hbs = engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    eq(a, b) { return a === b; },
    ne(a, b) { return a !== b; },
    toString(val) { return String(val); },
  },
});
app.engine('hbs', hbs);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Logging
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// Static files
app.use(express.static('public'));

// Parse user from token for all routes (optional - doesn't require auth)
app.use((req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return next();

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, config.jwt.secret);
    res.locals.user = { id: decoded.id, role: decoded.role, name: decoded.name };
  } catch (err) {
    // Invalid token - ignore
  }
  next();
});

// Load categories for all web routes (public site header)
app.use('/web', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).limit(5).lean();
    res.locals.categories = categories;
  } catch {
    res.locals.categories = [];
  }
  next();
});

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
