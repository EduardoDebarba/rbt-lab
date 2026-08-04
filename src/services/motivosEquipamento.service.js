const { prisma } = require('../config/prisma');
const { HttpError } = require('../utils/httpError');

const DEFAULT_MOTIVOS = [
  'Sem Defeito',
  'Queimado',
  'Sinal Alto',
  'Parte exterior amarelada',
  'Parte exterior com tinta',
  'Antena quebrada',
  'Porta LAN queimada',
  'Conector com defeito',
  'Quedas do WIFI',
  'Alcance da rede WIFI',
  'Não sobe internet',
  'Danificado',
  'Travado',
  'Sem problemas, apenas troca',
  'Não passa banda contratada',
  'Reiniciando',
  'Porta WAN não passa banda correta',
  'Aumentando DBM',
  'Acoplador com problema',
  'Velocidade',
  'Teste Ping',
  'Suporte não conseguiu acessar',
  'Diferença de DBM',
  'Luz da WAN não ascende',
  'ONU travada',
  'ONU não provisiona',
  'Quebrada',
  'Problema na configuração',
  'Rede 2.4 muito lenta',
  'Acoplador',
  'Quedas de Sinal',
  'Apenas Recolhimento',
  'Lentidão',
  'Não tem cadastro no Elleven',
  'Migração',
  'Sem acesso',
  'Não aparece rede 5G',
  'Perca de dBm',
  'Fonte Queimada',
  'ONU em LOS',
  'Wi-Fi passando pouca internet',
  'Porta WAN queimada',
  'Não aparece Wi-Fi',
  'Não conecta na rede via cabo',
  'Fica se descofigurando',
  'Não encontra na OLT',
  'Desligando',
  'Sinal de retorno alto',
  'Ligando apenas o Power',
  'CPU Alto',
  'Antena danificada',
  'Botão reset quebrado',
  'Não liga',
  'Não reseta',
  'Acoplador quebrado',
  'Luz da internet não ascende',
  'Rede 5G não conecta',
  'Desconectando',
  'Não aparece o SN no OLT'
];

let seedPromise = null;
const LIST_CACHE_TTL_MS = 5 * 60 * 1000;
const listCache = new Map();

const motivosEquipamentoService = {
  async list(filters = {}) {
    await ensureSeeded();

    const cacheKey = buildListCacheKey(filters);
    const cached = listCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const where = { ativo: true };

    if (filters.q) {
      where.nomeBusca = {
        contains: normalizeMotivoName(filters.q),
        mode: 'insensitive'
      };
    }

    const data = await prisma.motivoEquipamento.findMany({
      where,
      orderBy: { nome: 'asc' },
      take: Math.min(500, Math.max(1, Number.parseInt(filters.limit, 10) || 50))
    });

    listCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + LIST_CACHE_TTL_MS
    });

    return data;
  },

  async create(input) {
    await ensureSeeded();

    const nome = sanitizeMotivoName(input.nome);
    const nomeBusca = normalizeMotivoName(nome);
    const existing = await prisma.motivoEquipamento.findUnique({
      where: { nomeBusca }
    });

    if (existing) {
      if (!existing.ativo) {
        const updated = await prisma.motivoEquipamento.update({
          where: { id: existing.id },
          data: { ativo: true, nome }
        });
        clearListCache();
        return updated;
      }

      return existing;
    }

    const created = await prisma.motivoEquipamento.create({
      data: {
        nome,
        nomeBusca
      }
    });
    clearListCache();
    return created;
  },

  async listUso(filters = {}) {
    await ensureSeeded();

    const where = { ativo: true };

    if (filters.q) {
      where.nomeBusca = {
        contains: normalizeMotivoName(filters.q),
        mode: 'insensitive'
      };
    }

    const motivos = await prisma.motivoEquipamento.findMany({
      where,
      orderBy: { nome: 'asc' },
      take: Math.min(1000, Math.max(1, Number.parseInt(filters.limit, 10) || 500))
    });

    const usageRows = await prisma.equipamento.groupBy({
      by: ['motivo'],
      where: {
        ativo: true,
        motivo: {
          in: motivos.map((motivo) => motivo.nome)
        }
      },
      _sum: {
        quantidade: true
      },
      _count: {
        _all: true
      }
    });

    const usageByMotivo = new Map(usageRows.map((row) => [row.motivo, row]));

    return motivos
      .map((motivo) => {
        const usage = usageByMotivo.get(motivo.nome);
        const quantidadeUtilizada = Number(usage?._sum?.quantidade || 0);
        const registrosUtilizados = Number(usage?._count?._all || 0);

        return {
          ...motivo,
          utilizado: quantidadeUtilizada > 0 || registrosUtilizados > 0,
          quantidadeUtilizada,
          registrosUtilizados
        };
      })
      .sort((a, b) => {
        if (a.utilizado !== b.utilizado) return a.utilizado ? -1 : 1;
        if (a.utilizado && b.utilizado) return b.quantidadeUtilizada - a.quantidadeUtilizada || a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true });
        return a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true });
      });
  },

  async rename(id, input) {
    await ensureSeeded();

    const nome = sanitizeMotivoName(input.nome);
    const nomeBusca = normalizeMotivoName(nome);

    return prisma.$transaction(async (tx) => {
      const current = await tx.motivoEquipamento.findUnique({
        where: { id }
      });

      if (!current || !current.ativo) {
        throw new HttpError(404, 'Motivo nao encontrado.');
      }

      const existing = await tx.motivoEquipamento.findUnique({
        where: { nomeBusca }
      });

      if (existing && existing.id !== id) {
        throw new HttpError(400, 'Ja existe um motivo cadastrado com este nome.');
      }

      const equipamentos = await tx.equipamento.updateMany({
        where: {
          motivo: current.nome
        },
        data: {
          motivo: nome
        }
      });

      const updated = await tx.motivoEquipamento.update({
        where: { id },
        data: {
          nome,
          nomeBusca
        }
      });

      clearListCache();

      return {
        ...updated,
        nomeAntigo: current.nome,
        registrosAtualizados: equipamentos.count
      };
    });
  },

  async ensureExists(nome, tx = prisma) {
    if (!isPresent(nome)) return null;
    await ensureSeeded();

    const normalized = normalizeMotivoName(nome);
    const existing = await tx.motivoEquipamento.findUnique({
      where: { nomeBusca: normalized }
    });

    if (!existing || !existing.ativo) {
      throw new HttpError(400, 'Motivo nao cadastrado. Selecione um motivo da lista ou cadastre um novo motivo.');
    }

    return existing;
  },

  async ensureExistsOrCreate(nome, tx = prisma) {
    if (!isPresent(nome)) return null;
    await ensureSeeded();

    const sanitized = sanitizeMotivoName(nome);
    const nomeBusca = normalizeMotivoName(sanitized);
    const existing = await tx.motivoEquipamento.findUnique({
      where: { nomeBusca }
    });

    if (existing) return existing;

    const created = await tx.motivoEquipamento.create({
      data: {
        nome: sanitized,
        nomeBusca
      }
    });
    clearListCache();
    return created;
  }
};

function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = seedDefaultMotivos();
  }

  return seedPromise;
}

async function seedDefaultMotivos() {
  const existingMotivos = await prisma.equipamento.findMany({
    distinct: ['motivo'],
    select: { motivo: true },
    where: {
      motivo: {
        not: null
      }
    }
  });

  const names = [...DEFAULT_MOTIVOS, ...existingMotivos.map((item) => item.motivo)];
  const uniqueBySearchName = new Map();

  for (const name of names) {
    if (!isPresent(name)) continue;
    const nome = sanitizeMotivoName(name);
    uniqueBySearchName.set(normalizeMotivoName(nome), nome);
  }

  await prisma.motivoEquipamento.createMany({
    data: Array.from(uniqueBySearchName, ([nomeBusca, nome]) => ({
      nome,
      nomeBusca
    })),
    skipDuplicates: true
  });
}

function sanitizeMotivoName(value) {
  const nome = String(value || '').replace(/\s+/g, ' ').trim();

  if (!nome) {
    throw new HttpError(400, 'Nome do motivo e obrigatorio.');
  }

  if (nome.length > 160) {
    throw new HttpError(400, 'Nome do motivo deve ter no maximo 160 caracteres.');
  }

  return nome;
}

function normalizeMotivoName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function buildListCacheKey(filters = {}) {
  return JSON.stringify({
    q: normalizeMotivoName(filters.q || ''),
    limit: Math.min(500, Math.max(1, Number.parseInt(filters.limit, 10) || 50))
  });
}

function clearListCache() {
  listCache.clear();
}

module.exports = {
  motivosEquipamentoService,
  normalizeMotivoName
};
