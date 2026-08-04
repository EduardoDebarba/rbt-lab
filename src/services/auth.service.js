const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const { HttpError } = require('../utils/httpError');
const { sanitizeUsuario } = require('../utils/userPresenter');
const { buildDisplayNameFromEmail } = require('../utils/userCredentials');
const { emailService } = require('./email.service');

const SALT_ROUNDS = 12;
const RESET_CODE_TTL_MINUTES = 15;

const authService = {
  async register(data) {
    const existing = await prisma.usuario.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      throw new HttpError(409, 'Ja existe um usuario cadastrado com este e-mail.');
    }

    const nome = buildDisplayNameFromEmail(data.email);
    const senhaHash = await bcrypt.hash(data.senha, SALT_ROUNDS);

    let usuario;

    try {
      usuario = await prisma.usuario.create({
        data: {
          nome,
          email: data.email,
          senhaHash,
          senhaAtualizadaEm: new Date(),
          perfil: 'USER'
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new HttpError(409, 'Ja existe um usuario cadastrado com este e-mail.');
      }

      throw error;
    }

    const response = buildAuthResponse(usuario);

    try {
      await emailService.sendAccountCreated(usuario);
    } catch (error) {
      response.emailAviso = error.message;
    }

    return response;
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

  async forgotPassword(data) {
    const usuario = await prisma.usuario.findUnique({
      where: { email: data.email }
    });

    if (!usuario || !usuario.ativo) {
      return {
        mensagem: 'Se o e-mail estiver cadastrado, um codigo de recuperacao sera enviado.'
      };
    }

    const codigo = generateResetCode();
    const resetSenhaCodigoHash = await bcrypt.hash(codigo, SALT_ROUNDS);
    const resetSenhaExpiraEm = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        resetSenhaCodigoHash,
        resetSenhaExpiraEm
      }
    });

    await emailService.sendPasswordResetCode(usuario, codigo);

    return {
      mensagem: 'Se o e-mail estiver cadastrado, um codigo de recuperacao sera enviado.'
    };
  },

  async resetPassword(data) {
    const usuario = await prisma.usuario.findUnique({
      where: { email: data.email }
    });

    if (!usuario || !usuario.ativo || !usuario.resetSenhaCodigoHash || !usuario.resetSenhaExpiraEm) {
      throw new HttpError(400, 'Codigo invalido ou expirado.');
    }

    if (usuario.resetSenhaExpiraEm.getTime() < Date.now()) {
      throw new HttpError(400, 'Codigo invalido ou expirado.');
    }

    const codeMatches = await bcrypt.compare(data.codigo, usuario.resetSenhaCodigoHash);

    if (!codeMatches) {
      throw new HttpError(400, 'Codigo invalido ou expirado.');
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senhaHash: await bcrypt.hash(data.senha, SALT_ROUNDS),
        senhaAtualizadaEm: new Date(),
        resetSenhaCodigoHash: null,
        resetSenhaExpiraEm: null
      }
    });

    return {
      mensagem: 'Senha redefinida com sucesso.'
    };
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

function generateResetCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

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
