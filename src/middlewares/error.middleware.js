const { Prisma } = require('@prisma/client');

function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || mapPrismaStatus(error) || 500;

  const response = {
    error: error.name || 'InternalServerError',
    message: error.message || 'Internal server error'
  };

  if (error.details) {
    response.details = error.details;
  }

  if (process.env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
}

function mapPrismaStatus(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') return 404;
    if (error.code === 'P2002') return 409;
    return 400;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return 400;
  }

  return null;
}

module.exports = { errorMiddleware };
