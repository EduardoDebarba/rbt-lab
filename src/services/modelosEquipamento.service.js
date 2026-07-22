const { prisma } = require('../config/prisma');
const { HttpError } = require('../utils/httpError');

const DEFAULT_MODELOS = [
  'Access Point Ubiquiti LiteAP GPS',
  'Access Point Ubiquiti UniFi 6',
  'Access Point Ubiquiti UniFi AP AC Lite',
  'Antena MikroTik OmniTik',
  'Antena Ubiquiti AirGrid M5HP 23 dBi',
  'Antena Ubiquiti AirGrid M5HP 27 dBi',
  'Antena Ubiquiti BaseStation M5 120',
  'Antena Ubiquiti BaseStation M5 90',
  'Antena Ubiquiti LiteBeam 5AC 23 dBi',
  'Antena Ubiquiti LiteBeam AC',
  'Antena Ubiquiti LiteBeam M5 23 dBi',
  'Antena Ubiquiti NanoBeam AC',
  'Antena Ubiquiti NanoBeam M5',
  'Antena Ubiquiti NanoBeam M5-300',
  'Antena Ubiquiti NanoStation Loco',
  'Antena Ubiquiti NanoStation M5',
  'Antena Ubiquiti PowerBeam 5AC 400',
  'Antena Ubiquiti PowerBeam 5AC 500',
  'Antena Ubiquiti PowerBeam M5 300',
  'Antena Ubiquiti Rocket AC Lite',
  'Antena Ubiquiti Rocket M5',
  'ATA Intelbras GKM2210T',
  'Conversor de Mídia TP-Link MC111',
  'Conversor de Mídia TP-Link MC112',
  'Conversor de Mídia TP-Link TL-SC9005',
  'Conversor de Mídia TP-Link WDM',
  'Conversor Digital Visiontec DTV-9000',
  'Modem TP-Link TD-8816',
  'ONU Bridge FiberHome AN5506-01-A',
  'ONU Bridge Multilaser RE880',
  'ONU Bridge Parks Fiberlink 100',
  'ONU Bridge Parks Fiberlink 101',
  'ONU Bridge ZTE F601',
  'ONU Cianet',
  'ONU FiberHome Mini',
  'ONU GPON Bridge ZTE F612',
  'ONU GPON Cianet GB01 V2',
  'ONU Intelbras ONU110',
  'ONU Router FiberHome AN5506-01-A',
  'ONU Router FiberHome AN5506-02-B',
  'ONU Router ZTE F6600 Gamer',
  'ONU Router ZTE F670L',
  'ONU Router ZTE F670L V1',
  'ONU Router ZTE F670L V9',
  'ONU XGS-PON Wi-Fi 6 ZTE F8648P V2.0',
  'Patch Panel Gigabit 12 Portas',
  'Roteador D-Link DI-524',
  'Roteador D-Link DIR-610',
  'Roteador Greatek 300N',
  'Roteador Greatek AC1200',
  'Roteador Intelbras Action RF 1200',
  'Roteador Intelbras IWR 1000N',
  'Roteador Intelbras IWR 3000N',
  'Roteador Intelbras RF 301K',
  'Roteador Intelbras RG 1200',
  'Roteador Intelbras WOM MIMO',
  'Roteador Intelbras WRN 150',
  'Roteador Intelbras WRN 240 Slim',
  'Roteador Intelbras WRN 241',
  'Roteador Link One RW131',
  'Roteador Link One RW141',
  'Roteador Mesh ZTE H196A Wi-Fi AC1200 (RE939)',
  'Roteador Multilaser RE160',
  'Roteador Multilaser RE172',
  'Roteador Multilaser RE708 AC',
  'Roteador OIW 2431 APGN',
  'Roteador OIW 2442 APGN',
  'Roteador TP-Link Archer C20 AC750',
  'Roteador TP-Link Archer C21',
  'Roteador TP-Link Archer C5 AC',
  'Roteador TP-Link Archer C50',
  'Roteador TP-Link Archer C6 AC',
  'Roteador TP-Link Archer EC220-G5 AC',
  'Roteador TP-Link TL-MR3420',
  'Roteador TP-Link TL-WR720N',
  'Roteador TP-Link TL-WR740N',
  'Roteador TP-Link TL-WR820N',
  'Roteador TP-Link TL-WR829N',
  'Roteador TP-Link TL-WR840N',
  'Roteador TP-Link TL-WR845N',
  'Roteador TP-Link TL-WR849N',
  'Roteador ZTE H198A AC',
  'Roteador ZTE H199A AC',
  'Roteador ZTE H3601P',
  'RouterBoard MikroTik hAP Lite',
  'RouterBoard MikroTik hAP Mini',
  'RouterBoard MikroTik Hex RB750GR2',
  'RouterBoard MikroTik Hex RB750GR3',
  'RouterBoard MikroTik RB2011UiAS-RM',
  'RouterBoard MikroTik RB3011UiAS-RM',
  'RouterBoard MikroTik RB921',
  'Switch D-Link DGS-1008A',
  'Switch Greatek Gigabit 8 Portas',
  'Switch Intelbras SF800',
  'Switch Intelbras SF800 Ultra',
  'Switch Intelbras SG800 Q+',
  'Switch Mercusys MS108G',
  'Switch Tenda G108',
  'Switch TP-Link LS1008G',
  'Switch TP-Link SF1005D',
  'Switch TP-Link SF1008D',
  'Switch TP-Link SF1016D',
  'Switch TP-Link SG1016E',
  'Switch TP-Link SG108',
  'Switch TP-Link TL-SG1008D',
  'Telefone Grandstream',
  'Telefone Intelbras Pleno',
  'Telefone Intelbras TIP 125 Lite',
  'Telefone Intelbras TIP 125i',
  'TV Box Aquário STV-3000 Plus',
  'TV Box Intelbras Izy Play 4K',
  'TV Box Visiontec',
  'TV Box ZTE ZT866'
];

let seedPromise = null;
const LIST_CACHE_TTL_MS = 5 * 60 * 1000;
const listCache = new Map();

const modelosEquipamentoService = {
  async list(filters = {}) {
    await ensureSeeded();

    const cacheKey = buildListCacheKey(filters);
    const cached = listCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const where = {
      ativo: true
    };

    if (filters.q) {
      where.nomeBusca = {
        contains: normalizeModelName(filters.q),
        mode: 'insensitive'
      };
    }

    const data = await prisma.modeloEquipamento.findMany({
      where,
      orderBy: { nome: 'asc' },
      take: Math.min(150, Math.max(1, Number.parseInt(filters.limit, 10) || 50))
    });

    listCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + LIST_CACHE_TTL_MS
    });

    return data;
  },

  async create(input) {
    await ensureSeeded();

    const nome = sanitizeModelName(input.nome);
    const nomeBusca = normalizeModelName(nome);

    const existing = await prisma.modeloEquipamento.findUnique({
      where: { nomeBusca }
    });

    if (existing) {
      if (!existing.ativo) {
        const updated = await prisma.modeloEquipamento.update({
          where: { id: existing.id },
          data: { ativo: true, nome }
        });
        clearListCache();
        return updated;
      }

      return existing;
    }

    const created = await prisma.modeloEquipamento.create({
      data: {
        nome,
        nomeBusca
      }
    });
    clearListCache();
    return created;
  },

  async ensureExists(nome, tx = prisma) {
    await ensureSeeded();

    const normalized = normalizeModelName(nome);
    const existing = await tx.modeloEquipamento.findUnique({
      where: { nomeBusca: normalized }
    });

    if (!existing || !existing.ativo) {
      throw new HttpError(400, 'Modelo nao cadastrado. Selecione um modelo da lista ou cadastre um novo modelo.');
    }

    return existing;
  },

  async ensureExistsOrCreate(nome, tx = prisma) {
    await ensureSeeded();

    const sanitized = sanitizeModelName(nome);
    const nomeBusca = normalizeModelName(sanitized);
    const existing = await tx.modeloEquipamento.findUnique({
      where: { nomeBusca }
    });

    if (existing) {
      if (!existing.ativo) {
        const updated = await tx.modeloEquipamento.update({
          where: { id: existing.id },
          data: { ativo: true, nome: sanitized }
        });
        clearListCache();
        return updated;
      }

      return existing;
    }

    const created = await tx.modeloEquipamento.create({
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
    seedPromise = seedDefaultModels();
  }

  return seedPromise;
}

async function seedDefaultModels() {
  const uniqueBySearchName = new Map();

  for (const name of DEFAULT_MODELOS) {
    const nome = sanitizeModelName(name);
    uniqueBySearchName.set(normalizeModelName(nome), nome);
  }

  const defaultModels = Array.from(uniqueBySearchName, ([nomeBusca, nome]) => ({
    nome,
    nomeBusca
  }));
  const activeSearchNames = defaultModels.map((item) => item.nomeBusca);

  await prisma.modeloEquipamento.createMany({
    data: defaultModels,
    skipDuplicates: true
  });

  await prisma.modeloEquipamento.updateMany({
    where: {
      nomeBusca: {
        in: activeSearchNames
      }
    },
    data: {
      ativo: true
    }
  });

  await prisma.modeloEquipamento.updateMany({
    where: {
      nomeBusca: {
        notIn: activeSearchNames
      }
    },
    data: {
      ativo: false
    }
  });
}

function sanitizeModelName(value) {
  const nome = String(value || '').replace(/\s+/g, ' ').trim();

  if (!nome) {
    throw new HttpError(400, 'Nome do modelo e obrigatorio.');
  }

  if (nome.length > 160) {
    throw new HttpError(400, 'Nome do modelo deve ter no maximo 160 caracteres.');
  }

  return nome;
}

function normalizeModelName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildListCacheKey(filters = {}) {
  return JSON.stringify({
    q: normalizeModelName(filters.q || ''),
    limit: Math.min(150, Math.max(1, Number.parseInt(filters.limit, 10) || 50))
  });
}

function clearListCache() {
  listCache.clear();
}

module.exports = {
  modelosEquipamentoService,
  normalizeModelName
};
