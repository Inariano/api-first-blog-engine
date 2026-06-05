const crypto = require('crypto');

const csrfProtection = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.locals.csrfToken = req.session.csrfToken;

  next();
};

const csrfValidate = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const bodyToken = req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!bodyToken || !sessionToken || bodyToken !== sessionToken) {
      if (req.headers['hx-request']) {
        return res.status(403).send('Invalid or expired CSRF token');
      }

      req.session.error = 'Invalid or expired form. Please try again.';
      return res.redirect(req.get('Referrer') || '/web');
    }
  }

  next();
};

module.exports = { csrfProtection, csrfValidate };
