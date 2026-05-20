const { prisma } = require('../config/prisma');
const { HttpError } = require('../utils/httpError');

const DEFAULT_MODELOS = [
  'Antena Rádio Nano Station M5',
  'Antena Rádio Powerbeam 5Ac 400',
  'Antena Rádio Powerbeam 5Ac 500',
  'Antena Rádio Powerbeam M5 300',
  'Antena Rádio Ubiquiti Airgrid M5Hp 27Db',
  'Base Station M5 120',
  'Base Station M5 90',
  'Dtv 9000',
  'Dtv-9000 Full Hd',
  'Hap Lite',
  'Lite Ap Gps',
  'Mc111',
  'Mc112',
  'Mikrotik Hap Lite',
  'Mikrotik Hap Mini',
  'Mikrotik Hex GR3',
  'Modem Optico Onu Gpon Bridge Ige - Onu Gb01 V2',
  'Omnitk',
  'Onu Bridge Fiberhome An 5506-01-A',
  'Onu Bridge Multilaser Re 880',
  'Onu Bridge Parks Fiberlink 100',
  'Onu Bridge Parks Fiberlink 101',
  'Onu Bridge Zte F601',
  'Onu Cianet',
  'Onu Inelbras 110',
  'Onu Router Fiberhome An5506-01-A',
  'Onu Router Fiberhome An5506-02-B',
  'Onu Router Zte F6600 Gamer',
  'Onu Router Zte F670L',
  'Onu Router Zte F670L V1',
  'Onu Router Zte F670L V9',
  'Patch Panel 12 Portas Gigabit',
  'Rádio Nano Beam Ac',
  'Rádio Nano Loco',
  'Archer C50',
  'Rádio Ubiquiti Airgrid M5Hp 23Db',
  'Rádio Ubiquiti Lite Beam 5Ac 23 Dbi',
  'Rádio Ubiquiti Lite Beam M5 23Dbi',
  'Rádio Ubiquiti Nano Beam M5',
  'Rádio Ubiquiti Nano Beam M5-300',
  'Rb2011-Vias-Rm',
  'Rb3011-Vias-Rm',
  'Rb921',
  'Rbgr2',
  'Rbgr3',
  'Rocket Ac Lite',
  'Rocket M5',
  'Roteador Greatek 1200 Ac',
  'Roteador Greatek 300 N',
  'Roteador Intelbras Iwr 1000N',
  'Roteador Intelbras Iwr 3000N',
  'Roteador Intelbras Rf 301K N',
  'Roteador Intelbras Rg 1200',
  'Roteador Intelbras Wrn 150',
  'Roteador Intelbras Wrn 240 Slim N',
  'Roteador Multilaser Re 160 N',
  'Roteador Multilaser Re172 N',
  'Roteador Multilaser Re708 Ac',
  'Roteador Oiw 2442 Apgn',
  'Roteador Tp-Link 820 N',
  'Roteador Tp-Link 829 N',
  'Roteador Tp-Link 840 N',
  'Roteador Tp-Link Archer C5 Ac',
  'Roteador Tp-Link Archer C6 Ac',
  'Roteador Tp-Link Archer Ec220-G5 Ac',
  'Roteador Tp-Link Mr3420 N',
  'Roteador Tp-Link Tl-Wr720 N',
  'Roteador Tp-Link Tl-Wr829N',
  'Roteador Tp-Link Tl-Wr849N',
  'Roteador Zte H198A Ac',
  'Roteador Zte H199A Ac',
  'Roteador Zte H3601P',
  'Routerboard 2011Vias-Rm',
  'Routerboard 3011Vias-Rm',
  'Routerboard 750Gr3',
  'Routerboard Hap Mini',
  'Switch 8P 10/100/1000 Gigabit Greatek',
  'Switch 8P Gigabit Ethernet G 108 Tenda',
  'Switch Dgs-1008A',
  'Switch D-Link 1008 / 8 Portas Gb',
  'Switch Intelbras Sf800 / 8 Portas Fast',
  'Switch Intelbras Sf800 Ultra / 8 Portas Fast',
  'Switch Tp-Link De Mesa 8 Portas Gigabit - Ls1008G',
  'Switch Tp-Link Sf 1005D / 5 Portas Fast',
  'Switch Tp-Link Sf 1008D / 8 Portas Fast',
  'Switch Tp-Link Sf 1016D / 16 Portas Gb',
  'Switch Tp-Link Sg 11 6E / 16 Portas Gb',
  'Telefone Intelbras Pleno',
  'Telefone Tip 125I',
  'Tp-Link Wdm',
  'Wom Mimo',
  'Zte Tv Box Zt866',
  'ONU XGS PON WIFI AX6000 ZTE F8648PV2.0',
  'Fiberhome Mini',
  'Roteador TP-Link TL-WR740N',
  'SWITCH 8P GIGA SG800 Q+ ETHERNET',
  'Mikrotik Hex GR2',
  'Switch TP-Link 8P TL-SG1008D',
  'WR 849N',
  'tp link',
  'acher c21',
  'Roteador D-Link DIR610',
  'SWITCH 8P GIGABIT 10/100/1000 - MS108G - MERCUSYS',
  'Roteador Dual Band Tp-link Ac75ghz Si0 - Archer C20',
  'VISIONTEC',
  'ONU GPON BRIDGE ZTE F612',
  'ROTEADOR MESH ZTE H196A WIFI AC1200 (RE939)',
  'IZIPLAY',
  'WRN 241',
  'TLSC9005',
  'L1-RW131',
  'TD-8816',
  'Ata GKM2210t',
  'Roteador Oiw 2431 apgn',
  'UniFi 6',
  'Intelbras action rf 1200',
  'Rádio Ubiquiti lite beam ac',
  'Aquário STV-3000 PLUS'
];

let seedPromise = null;

const modelosEquipamentoService = {
  async list(filters = {}) {
    await ensureSeeded();

    const where = {
      ativo: true
    };

    if (filters.q) {
      where.nomeBusca = {
        contains: normalizeModelName(filters.q),
        mode: 'insensitive'
      };
    }

    return prisma.modeloEquipamento.findMany({
      where,
      orderBy: { nome: 'asc' },
      take: Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 50))
    });
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
        return prisma.modeloEquipamento.update({
          where: { id: existing.id },
          data: { ativo: true, nome }
        });
      }

      return existing;
    }

    return prisma.modeloEquipamento.create({
      data: {
        nome,
        nomeBusca
      }
    });
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

    if (existing) return existing;

    return tx.modeloEquipamento.create({
      data: {
        nome: sanitized,
        nomeBusca
      }
    });
  }
};

function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = seedDefaultModels();
  }

  return seedPromise;
}

async function seedDefaultModels() {
  const existingModels = await prisma.equipamento.findMany({
    distinct: ['modelo'],
    select: { modelo: true },
    where: {
      modelo: {
        not: ''
      }
    }
  });

  const names = [...DEFAULT_MODELOS, ...existingModels.map((item) => item.modelo)];
  const uniqueBySearchName = new Map();

  for (const name of names) {
    const nome = sanitizeModelName(name);
    uniqueBySearchName.set(normalizeModelName(nome), nome);
  }

  await prisma.modeloEquipamento.createMany({
    data: Array.from(uniqueBySearchName, ([nomeBusca, nome]) => ({
      nome,
      nomeBusca
    })),
    skipDuplicates: true
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

module.exports = {
  modelosEquipamentoService,
  normalizeModelName
};
