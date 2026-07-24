const { Prisma } = require('@prisma/client');

function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || mapPrismaStatus(error) || 500;

  const response = {
    error: error.name || 'InternalServerError',
    message: getPublicMessage(error) || error.message || 'Internal server error'
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
  if (isTransientDatabaseError(error)) {
    return 503;
  }

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

function getPublicMessage(error) {
  if (!isTransientDatabaseError(error)) return null;

  return 'Banco de dados temporariamente indisponivel. Aguarde alguns segundos e tente novamente.';
}

function isTransientDatabaseError(error) {
  if (!error) return false;

  if (['P1001', 'P1002', 'P1017', 'P2024'].includes(error.code)) {
    return true;
  }

  const text = `${error.message || ''} ${error.name || ''}`.toLowerCase();

  return (
    text.includes("can't reach database server") ||
    text.includes('connection terminated') ||
    text.includes('connection refused') ||
    text.includes('server closed the connection') ||
    text.includes('socket timeout') ||
    text.includes('timed out')
  );
}

module.exports = { errorMiddleware };
