const jwt = require('jsonwebtoken');
const config = require('../config');
const BlacklistedToken = require('../models/BlacklistedToken');

const webAuth = async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.redirect('/web/admin/login');
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    const blacklisted = await BlacklistedToken.findOne({ token });
    if (blacklisted) {
      res.clearCookie('token');
      return res.redirect('/web/admin/login');
    }

    if (decoded.role !== 'admin') {
      return res.status(403).render('admin/error', {
        layout: 'admin',
        title: 'Forbidden',
        message: 'Admin access required',
      });
    }

    req.user = { id: decoded.id, role: decoded.role };
    req.tokenPayload = decoded;
    return next();
  } catch (error) {
    res.clearCookie('token');
    return res.redirect('/web/admin/login');
  }
};

module.exports = webAuth;
