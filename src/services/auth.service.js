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

    const senhaHash = await bcrypt.hash(data.senha, SALT_ROUNDS);

    const usuario = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senhaHash,
        perfil: data.perfil || 'TECNICO'
      }
    });

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

module.exports = { authService };
