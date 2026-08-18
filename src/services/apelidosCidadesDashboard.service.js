const { prisma } = require('../config/prisma');
const { HttpError } = require('../utils/httpError');

const apelidosCidadesDashboardService = {
  async list() {
    const rows = await prisma.apelidoCidadeDashboard.findMany({
      orderBy: { cidadeOriginal: 'asc' }
    });

    return rows.reduce((aliases, row) => {
      aliases[row.cidadeOriginal] = row.nomeGrafico;
      return aliases;
    }, {});
  },

  async replaceAll(input = {}) {
    const aliases = normalizeAliases(input.aliases || input);

    await prisma.$transaction(async (tx) => {
      const cidades = Object.keys(aliases);

      if (cidades.length > 0) {
        await tx.apelidoCidadeDashboard.deleteMany({
          where: {
            cidadeOriginal: {
              notIn: cidades
            }
          }
        });
      } else {
        await tx.apelidoCidadeDashboard.deleteMany();
      }

      for (const [cidadeOriginal, nomeGrafico] of Object.entries(aliases)) {
        await tx.apelidoCidadeDashboard.upsert({
          where: { cidadeOriginal },
          create: {
            cidadeOriginal,
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
    throw new HttpError(400, 'Informe os apelidos das cidades em um objeto valido.');
  }

  const aliases = {};

  for (const [cidadeOriginal, nomeGrafico] of Object.entries(input)) {
    const cidade = String(cidadeOriginal || '').trim();
    const nome = String(nomeGrafico || '').trim();

    if (!cidade || !nome) continue;

    if (cidade.length > 160) {
      throw new HttpError(400, 'Nome original da cidade deve ter no maximo 160 caracteres.');
    }

    if (nome.length > 80) {
      throw new HttpError(400, 'Nome no grafico deve ter no maximo 80 caracteres.');
    }

    aliases[cidade] = nome;
  }

  return aliases;
}

module.exports = { apelidosCidadesDashboardService };
