const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const { HttpError } = require('../utils/httpError');
const { sanitizeUsuario } = require('../utils/userPresenter');

const SALT_ROUNDS = 12;

const authService = {
  async register(data) {
    const existing = await prisma.usuario.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      throw new HttpError(409, 'Ja existe um usuario cadastrado com este e-mail.');
    }

    const nome = getUsernameFromEmail(data.email);
    const senhaInicial = buildInitialPassword(data.email);
    const senhaHash = await bcrypt.hash(senhaInicial, SALT_ROUNDS);

    let usuario;

    try {
      usuario = await prisma.usuario.create({
        data: {
          nome,
          email: data.email,
          senhaHash,
          perfil: 'TECNICO'
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new HttpError(409, 'Ja existe um usuario cadastrado com este e-mail.');
      }

      throw error;
    }

    return buildAuthResponse(usuario);
  },

  async login(data) {
    const usuario = await prisma.usuario.findUnique({
      where: { email: data.email }
    });

    if (!usuario) {
      throw new HttpError(401, 'E-mail ou senha invalidos.');
    }

    if (!usuario.ativo) {
      throw new HttpError(403, 'Usuario inativo. Acesso bloqueado.');
    }

    const passwordMatches = await bcrypt.compare(data.senha, usuario.senhaHash);

    if (!passwordMatches) {
      throw new HttpError(401, 'E-mail ou senha invalidos.');
    }

    return buildAuthResponse(usuario);
  },

  async getAuthenticatedUser(id) {
    const usuario = await prisma.usuario.findUnique({
      where: { id }
    });

    if (!usuario || !usuario.ativo) {
      throw new HttpError(401, 'Usuario autenticado nao encontrado ou inativo.');
    }

    return sanitizeUsuario(usuario);
  }
};

function buildAuthResponse(usuario) {
  const token = jwt.sign(
    {
      sub: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  return {
    token,
    usuario: sanitizeUsuario(usuario)
  };
}

function getUsernameFromEmail(email) {
  return String(email || '').split('@')[0].trim().toLowerCase();
}

function buildInitialPassword(email) {
  return `${getUsernameFromEmail(email)}@rbt`;
}

module.exports = { authService };
