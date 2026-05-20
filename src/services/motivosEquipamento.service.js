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

const motivosEquipamentoService = {
  async list(filters = {}) {
    await ensureSeeded();

    const where = { ativo: true };

    if (filters.q) {
      where.nomeBusca = {
        contains: normalizeMotivoName(filters.q),
        mode: 'insensitive'
      };
    }

    return prisma.motivoEquipamento.findMany({
      where,
      orderBy: { nome: 'asc' },
      take: Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 50))
    });
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
        return prisma.motivoEquipamento.update({
          where: { id: existing.id },
          data: { ativo: true, nome }
        });
      }

      return existing;
    }

    return prisma.motivoEquipamento.create({
      data: {
        nome,
        nomeBusca
      }
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

    return tx.motivoEquipamento.create({
      data: {
        nome: sanitized,
        nomeBusca
      }
    });
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

module.exports = {
  motivosEquipamentoService,
  normalizeMotivoName
};
