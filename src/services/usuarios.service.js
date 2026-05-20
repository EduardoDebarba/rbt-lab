const bcrypt = require('bcrypt');

const { prisma } = require('../config/prisma');
const { HttpError } = require('../utils/httpError');
const { sanitizeUsuario, sanitizeUsuarios } = require('../utils/userPresenter');

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

  async create(data) {
    await ensureEmailAvailable(data.email);

    const usuario = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senhaHash: await bcrypt.hash(data.senha, SALT_ROUNDS),
        perfil: data.perfil || 'TECNICO',
        ativo: data.ativo
      }
    });

    return sanitizeUsuario(usuario);
  },

  async update(id, data) {
    const updateData = { ...data };

    if (updateData.email) {
      await ensureEmailAvailable(updateData.email, id);
    }

    if (updateData.senha) {
      updateData.senhaHash = await bcrypt.hash(updateData.senha, SALT_ROUNDS);
      delete updateData.senha;
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: updateData
    });

    return sanitizeUsuario(usuario);
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

module.exports = { usuarioService };
