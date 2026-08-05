const bcrypt = require('bcrypt');

const { prisma } = require('../config/prisma');
const { HttpError } = require('../utils/httpError');
const { sanitizeUsuario, sanitizeUsuarios } = require('../utils/userPresenter');
const { buildDisplayNameFromEmail } = require('../utils/userCredentials');
const { emailService } = require('./email.service');

const SALT_ROUNDS = 12;

const usuarioService = {
  async list() {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { criadoEm: 'desc' }
    });

    return sanitizeUsuarios(usuarios);
  },

  async getById(id) {
    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { id },
      include: {
        equipamentos: true,
        historico: true
      }
    });

    return sanitizeUsuario(usuario);
  },

  async create(data, authenticatedUser = null) {
    await ensureEmailAvailable(data.email);
    ensureCanManageProfile(authenticatedUser, 'USER');

    const nome = buildDisplayNameFromEmail(data.email);
    let usuario;

    try {
      usuario = await prisma.usuario.create({
        data: {
          nome,
          email: data.email,
          senhaHash: await bcrypt.hash(data.senha, SALT_ROUNDS),
          senhaAtualizadaEm: new Date(),
          perfil: 'USER',
          ativo: data.ativo
        }
      });
    } catch (error) {
      handleUniqueEmailError(error);
    }

    const safeUsuario = sanitizeUsuario(usuario);

    try {
      await emailService.sendAccountCreated(usuario);
    } catch (error) {
      safeUsuario.emailAviso = error.message;
    }

    return safeUsuario;
  },

  async update(id, data, authenticatedUser = null) {
    const updateData = { ...data };

    if (updateData.email) {
      await ensureEmailAvailable(updateData.email, id);
    }

    if (updateData.senha) {
      updateData.senhaHash = await bcrypt.hash(updateData.senha, SALT_ROUNDS);
      delete updateData.senha;
    }

    if (updateData.perfil) {
      const currentUsuario = await prisma.usuario.findUniqueOrThrow({
        where: { id },
        select: { perfil: true }
      });

      if (currentUsuario.perfil === 'SUPER_ADMIN' && authenticatedUser?.perfil !== 'SUPER_ADMIN') {
        throw new HttpError(403, 'Somente super administradores podem alterar outro SUPER_ADMIN.');
      }

      ensureCanManageProfile(authenticatedUser, updateData.perfil);
    }

    let usuario;

    try {
      usuario = await prisma.usuario.update({
        where: { id },
        data: updateData
      });
    } catch (error) {
      handleUniqueEmailError(error);
    }

    return sanitizeUsuario(usuario);
  },

  async remove(id, authenticatedUserId) {
    if (id === authenticatedUserId) {
      throw new HttpError(400, 'Voce nao pode excluir o seu proprio usuario.');
    }

    await prisma.usuario.findUniqueOrThrow({
      where: { id }
    });

    const vinculos = await prisma.usuario.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            equipamentos: true,
            historico: true
          }
        }
      }
    });

    const hasRelations = vinculos._count.equipamentos > 0 || vinculos._count.historico > 0;

    if (hasRelations) {
      const usuario = await prisma.usuario.update({
        where: { id },
        data: { ativo: false }
      });

      return {
        excluido: false,
        inativado: true,
        usuario: sanitizeUsuario(usuario),
        mensagem: 'Usuario possui registros vinculados e foi inativado para preservar o historico.'
      };
    }

    await prisma.usuario.delete({
      where: { id }
    });

    return {
      excluido: true,
      inativado: false,
      id,
      mensagem: 'Usuario excluido com sucesso.'
    };
  }
};

async function ensureEmailAvailable(email, currentUserId = null) {
  const existing = await prisma.usuario.findUnique({
    where: { email }
  });

  if (existing && existing.id !== currentUserId) {
    throw new HttpError(409, 'Ja existe um usuario cadastrado com este e-mail.');
  }
}

function handleUniqueEmailError(error) {
  if (error.code === 'P2002') {
    throw new HttpError(409, 'Ja existe um usuario cadastrado com este e-mail.');
  }

  throw error;
}

function ensureCanManageProfile(authenticatedUser, targetProfile) {
  if (!authenticatedUser) {
    throw new HttpError(401, 'Usuario autenticado nao encontrado.');
  }

  if (targetProfile === 'SUPER_ADMIN' && authenticatedUser.perfil !== 'SUPER_ADMIN') {
    throw new HttpError(403, 'Somente super administradores podem definir perfil SUPER_ADMIN.');
  }

  if (!['ADMIN', 'SUPER_ADMIN'].includes(authenticatedUser.perfil)) {
    throw new HttpError(403, 'Usuario nao possui permissao para gerenciar perfis.');
  }
}

module.exports = { usuarioService };
