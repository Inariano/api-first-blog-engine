const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const passport = require('../config/passport');

const router = express.Router();

const generateToken = (user) => jwt.sign(
  { id: user._id, role: user.role, name: user.name },
  config.jwt.secret,
  { expiresIn: config.jwt.expiresIn },
);

router.get('/google', (req, res, next) => {
  if (!config.oauth.google.clientId) {
    return res.status(501).json({ error: 'Google OAuth not configured' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) {
      logger.error('Google OAuth callback error:', err);
      return res.status(401).json({ error: 'Google authentication failed' });
    }
    const token = generateToken(user);
    res.json({ token, user: user.toJSON() });
  })(req, res, next);
});

router.get('/github', (req, res, next) => {
  if (!config.oauth.github.clientId) {
    return res.status(501).json({ error: 'GitHub OAuth not configured' });
  }
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', { session: false }, (err, user) => {
    if (err || !user) {
      logger.error('GitHub OAuth callback error:', err);
      return res.status(401).json({ error: 'GitHub authentication failed' });
    }
    const token = generateToken(user);
    res.json({ token, user: user.toJSON() });
  })(req, res, next);
});

module.exports = router;
