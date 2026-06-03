const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');
const config = require('../config');
const logger = require('../utils/logger');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { registerSchema, loginSchema } = require('../validators/auth');

const router = express.Router();

const generateToken = (user) => jwt.sign(
  { id: user._id, role: user.role },
  config.jwt.secret,
  { expiresIn: config.jwt.expiresIn },
);

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const user = new User({ name, email, password });
    await user.save();

    const token = generateToken(user);

    res.status(201).json({ token, user: user.toJSON() });
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.status(200).json({ token, user: user.toJSON() });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
});

router.post('/logout', auth, async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];

    const blacklisted = new BlacklistedToken({
      token,
      expiresAt: new Date(req.tokenPayload.exp * 1000),
    });
    await blacklisted.save();

    res.status(204).end();
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
});

router.post('/refresh', auth, async (req, res, next) => {
  try {
    const token = jwt.sign(
      { id: req.user.id, role: req.user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn },
    );

    res.json({ token });
  } catch (error) {
    logger.error('Refresh token error:', error);
    next(error);
  }
});

module.exports = router;
