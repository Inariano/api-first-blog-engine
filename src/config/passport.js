const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const config = require('../config');
const logger = require('../utils/logger');

function getEmail(profile, provider, id) {
  if (profile.emails && profile.emails[0] && profile.emails[0].value) {
    return profile.emails[0].value;
  }
  return provider + '-' + id + '@placeholder.local';
}

function getName(profile, provider) {
  if (profile.displayName) return profile.displayName;
  if (provider === 'github' && profile.username) return profile.username;
  if (profile.emails && profile.emails[0] && profile.emails[0].value) return profile.emails[0].value;
  return provider === 'google' ? 'Google User' : 'GitHub User';
}

if (config.oauth.google.clientId && config.oauth.google.clientSecret) {
  passport.use(new GoogleStrategy({
    clientID: config.oauth.google.clientId,
    clientSecret: config.oauth.google.clientSecret,
    callbackURL: '/api/auth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ provider: 'google', providerId: profile.id });
      if (!user) {
        user = new User({
          name: getName(profile, 'google'),
          email: getEmail(profile, 'google', profile.id),
          provider: 'google',
          providerId: profile.id,
        });
        await user.save();
      }
      done(null, user);
    } catch (error) {
      logger.error('Google OAuth error:', error);
      done(error, null);
    }
  }));
}

if (config.oauth.github.clientId && config.oauth.github.clientSecret) {
  passport.use(new GitHubStrategy({
    clientID: config.oauth.github.clientId,
    clientSecret: config.oauth.github.clientSecret,
    callbackURL: '/api/auth/github/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ provider: 'github', providerId: profile.id });
      if (!user) {
        user = new User({
          name: getName(profile, 'github'),
          email: getEmail(profile, 'github', profile.id),
          provider: 'github',
          providerId: profile.id,
        });
        await user.save();
      }
      done(null, user);
    } catch (error) {
      logger.error('GitHub OAuth error:', error);
      done(error, null);
    }
  }));
}

module.exports = passport;
