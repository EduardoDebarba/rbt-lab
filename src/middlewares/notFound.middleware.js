function notFoundMiddleware(req, res, next) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
}

module.exports = { notFoundMiddleware };
