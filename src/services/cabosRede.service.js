const { Prisma } = require('@prisma/client');

const { prisma } = require('../config/prisma');
const { HttpError } = require('../utils/httpError');

const DEFAULT_CABLE_SIZES = [2, 3, 4, 5, 6, 8, 9, 10];

const cabosRedeService = {
  async list() {
    await ensureDefaultCables();

    const cabos = await prisma.caboRede.findMany({
      orderBy: { metragem: 'asc' }
    });

    return cabos.map(presentCabo);
  },

  async create(data) {
    const metragem = normalizeMetragem(data.metragem);

    try {
      const cabo = await prisma.caboRede.create({
        data: {
          metragem,
          quantidade: normalizeQuantidade(data.quantidade)
        }
      });

      return presentCabo(cabo);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new HttpError(409, 'Ja existe um cabo cadastrado com esta metragem.');
      }

      throw error;
    }
  },

  async update(id, data) {
    const updateData = {};

    if (data.metragem !== undefined) updateData.metragem = normalizeMetragem(data.metragem);
    if (data.quantidade !== undefined) updateData.quantidade = normalizeQuantidade(data.quantidade);

    try {
      const cabo = await prisma.caboRede.update({
        where: { id },
        data: updateData
      });

      return presentCabo(cabo);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpError(404, 'Cabo de rede nao encontrado.');
      }

      if (error.code === 'P2002') {
        throw new HttpError(409, 'Ja existe um cabo cadastrado com esta metragem.');
      }

      throw error;
    }
  },

  async delete(id) {
    try {
      await prisma.caboRede.delete({
        where: { id }
      });

      return { message: 'Cabo de rede removido.' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpError(404, 'Cabo de rede nao encontrado.');
      }

      throw error;
    }
  }
};

async function ensureDefaultCables() {
  await prisma.caboRede.createMany({
    data: DEFAULT_CABLE_SIZES.map((metragem) => ({
      metragem: new Prisma.Decimal(metragem),
      quantidade: 0
    })),
    skipDuplicates: true
  });
}

function normalizeMetragem(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    throw new HttpError(400, 'Metragem deve ser maior que zero.');
  }

  return new Prisma.Decimal(number.toFixed(2));
}

function normalizeQuantidade(value) {
  const number = Number(value || 0);

  if (!Number.isInteger(number) || number < 0) {
    throw new HttpError(400, 'Quantidade deve ser um numero inteiro maior ou igual a zero.');
  }

  return number;
}

function presentCabo(cabo) {
  return {
    id: cabo.id,
    metragem: Number(cabo.metragem),
    quantidade: cabo.quantidade,
    criadoEm: cabo.criadoEm,
    atualizadoEm: cabo.atualizadoEm
  };
}

module.exports = { cabosRedeService };
