const jwt = require('jsonwebtoken');
const config = require('../config');
const BlacklistedToken = require('../models/BlacklistedToken');

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    const blacklisted = await BlacklistedToken.findOne({ token });
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    req.user = { id: decoded.id, role: decoded.role };
    req.tokenPayload = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;
