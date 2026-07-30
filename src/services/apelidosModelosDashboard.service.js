const { prisma } = require('../config/prisma');
const { HttpError } = require('../utils/httpError');

const apelidosModelosDashboardService = {
  async list() {
    const rows = await prisma.apelidoModeloDashboard.findMany({
      orderBy: { modeloOriginal: 'asc' }
    });

    return rows.reduce((aliases, row) => {
      aliases[row.modeloOriginal] = row.nomeGrafico;
      return aliases;
    }, {});
  },

  async replaceAll(input = {}) {
    const aliases = normalizeAliases(input.aliases || input);

    await prisma.$transaction(async (tx) => {
      const modelos = Object.keys(aliases);

      if (modelos.length > 0) {
        await tx.apelidoModeloDashboard.deleteMany({
          where: {
            modeloOriginal: {
              notIn: modelos
            }
          }
        });
      } else {
        await tx.apelidoModeloDashboard.deleteMany();
      }

      for (const [modeloOriginal, nomeGrafico] of Object.entries(aliases)) {
        await tx.apelidoModeloDashboard.upsert({
          where: { modeloOriginal },
          create: {
            modeloOriginal,
            nomeGrafico
          },
          update: {
            nomeGrafico
          }
        });
      }
    });

    return aliases;
  }
};

function normalizeAliases(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'Informe os apelidos dos modelos em um objeto valido.');
  }

  const aliases = {};

  for (const [modeloOriginal, nomeGrafico] of Object.entries(input)) {
    const modelo = String(modeloOriginal || '').trim();
    const nome = String(nomeGrafico || '').trim();

    if (!modelo || !nome) continue;

    if (modelo.length > 160) {
      throw new HttpError(400, 'Nome original do modelo deve ter no maximo 160 caracteres.');
    }

    if (nome.length > 80) {
      throw new HttpError(400, 'Nome no grafico deve ter no maximo 80 caracteres.');
    }

    aliases[modelo] = nome;
  }

  return aliases;
}

module.exports = { apelidosModelosDashboardService };
