const { prisma } = require('../config/prisma');

const historicoService = {
  async list(filters = {}) {
    return prisma.historico.findMany({
      where: buildWhere(filters),
      include: {
        usuario: true,
        equipamento: true
      },
      orderBy: { criadoEm: 'desc' }
    });
  },

  async getById(id) {
    return prisma.historico.findUniqueOrThrow({
      where: { id },
      include: {
        usuario: true,
        equipamento: true
      }
    });
  },

  async create(data) {
    return prisma.historico.create({ data });
  }
};

function buildWhere(filters) {
  const where = {};

  if (filters.usuarioId) where.usuarioId = filters.usuarioId;
  if (filters.equipamentoId) where.equipamentoId = filters.equipamentoId;
  if (filters.acao) where.acao = filters.acao;
  if (filters.campo) where.campo = filters.campo;

  return where;
}

module.exports = { historicoService };
