const { prisma } = require('../config/prisma');

const equipeCidadeService = {
  async list(filters = {}) {
    const where = {
      ativo: true
    };

    if (filters.q) {
      const query = String(filters.q).trim();
      where.OR = [
        { equipe: { contains: query, mode: 'insensitive' } },
        { cidade: { contains: query, mode: 'insensitive' } },
        { supervisor: { contains: query, mode: 'insensitive' } }
      ];
    }

    return prisma.equipeCidade.findMany({
      where,
      orderBy: [
        { equipe: 'asc' },
        { cidade: 'asc' }
      ]
    });
  },

  async getById(id) {
    return prisma.equipeCidade.findUniqueOrThrow({
      where: { id }
    });
  },

  async create(data) {
    return prisma.equipeCidade.create({
      data
    });
  },

  async update(id, data) {
    return prisma.equipeCidade.update({
      where: { id },
      data
    });
  },

  async remove(id) {
    await prisma.equipeCidade.update({
      where: { id },
      data: { ativo: false }
    });

    return {
      id,
      mensagem: 'Registro excluido com sucesso.'
    };
  }
};

module.exports = { equipeCidadeService };
