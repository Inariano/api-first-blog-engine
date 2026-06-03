const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const { errors } = result.error;
    return res.status(400).json({ error: errors[0].message });
  }
  req.body = result.data;
  return next();
};

module.exports = validate;
