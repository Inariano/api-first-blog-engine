const crypto = require('crypto');

const csp = (req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;
  res.nonce = nonce;
  next();
};

module.exports = csp;
