function validate(schema) {
  return (req, res, next) => {
    const result = schema(req.body);

    if (!result.valid) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid request body',
        details: result.errors
      });
    }

    req.body = result.data;
    return next();
  };
}

module.exports = { validate };
