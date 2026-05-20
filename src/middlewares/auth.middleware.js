const jwt = require('jsonwebtoken');

const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const { HttpError } = require('../utils/httpError');
const { sanitizeUsuario } = require('../utils/userPresenter');

async function authMiddleware(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new HttpError(401, 'Token de autenticacao nao informado.');
    }

    const payload = jwt.verify(token, env.jwtSecret);

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub }
    });

    if (!usuario || !usuario.ativo) {
      throw new HttpError(401, 'Token invalido ou usuario inativo.');
    }

    req.user = sanitizeUsuario(usuario);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new HttpError(401, 'Token de autenticacao invalido.'));
      return;
    }

    if (error.name === 'TokenExpiredError') {
      next(new HttpError(401, 'Token de autenticacao expirado.'));
      return;
    }

    next(error);
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      next(new HttpError(401, 'Usuario nao autenticado.'));
      return;
    }

    if (!allowedRoles.includes(req.user.perfil)) {
      next(new HttpError(403, 'Usuario nao possui permissao para esta operacao.'));
      return;
    }

    next();
  };
}

function extractToken(req) {
  const header = req.headers.authorization;

  if (!header) return null;

  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) return null;

  return token;
}

module.exports = {
  authMiddleware,
  requireRole
};
