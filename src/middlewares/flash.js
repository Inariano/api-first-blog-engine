const flash = (req, res, next) => {
  res.locals.success = req.session.success;
  res.locals.error = req.session.error;
  res.locals.info = req.session.info;

  delete req.session.success;
  delete req.session.error;
  delete req.session.info;

  next();
};

module.exports = flash;
