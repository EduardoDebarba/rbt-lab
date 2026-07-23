const { parse } = require('csv-parse/sync');

const { prisma } = require('../config/prisma');
const { HttpError } = require('../utils/httpError');
const { validateEquipamentoBusinessRules } = require('../utils/equipamentoRules');
const { modelosEquipamentoService } = require('./modelosEquipamento.service');
const { motivosEquipamentoService } = require('./motivosEquipamento.service');

const MUTABLE_FIELDS = [
  'dataFinalizacao',
  'modelo',
  'quantidade',
  'origem',
  'numeroSerie',
  'equipe',
  'protocolo',
  'cidade',
  'status',
  'situacaoFinal',
  'motivo',
  'valorVenda',
  'compradorVenda',
  'documentoCompradorVenda',
  'vendaConfirmada',
  'resolvido',
  'responsavelId',
  'observacoes'
];

const USER_SAFE_SELECT = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true
};

const IMPORT_BATCH_SIZE = 50;
const IMPORT_TRANSACTION_OPTIONS = {
  maxWait: 10000,
  timeout: 60000
};
const SUPORTE_OPTIONS = Array.from({ length: 20 }, (_, index) => `Suporte ${String(index + 1).padStart(2, '0')}`);
const DEFAULT_FABRICANTES = [
  'Ubiquiti',
  'Mikrotik',
  'Intelbras',
  'TP-Link',
  'Visiontec',
  'Fiberhome',
  'Multilaser',
  'Parks',
  'ZTE',
  'Cianet',
  'D-Link',
  'Greatek',
  'Link One',
  'OIW',
  'Mercusys',
  'Tenda',
  'Grandstream',
  'Aquario'
];
const DEFAULT_CATEGORIAS = [
  'Acess Point',
  'Antena',
  'ATA',
  'Conversor de Midia',
  'Conversor Digital',
  'Modem',
  'ONU',
  'Patch Panel',
  'Roteador',
  'Switch',
  'Telefone',
  'TV Box'
];
const FILTRO_TIPOS = ['FABRICANTE', 'CATEGORIA'];
const FILTER_OPTIONS_CACHE_TTL_MS = 60 * 1000;
let filterOptionsCache = null;

const equipamentoService = {
  async list(filters = {}) {
    const pagination = buildPagination(filters);
    const where = buildWhere(filters);

    const [items, total] = await Promise.all([
      prisma.equipamento.findMany({
        where,
        include: {
          responsavel: {
            select: USER_SAFE_SELECT
          }
        },
        orderBy: [
          { dataFinalizacao: { sort: 'desc', nulls: 'last' } },
          { criadoEm: 'desc' }
        ],
        skip: pagination.skip,
        take: pagination.limit
      }),
      prisma.equipamento.count({ where })
    ]);

    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit))
      }
    };
  },

  async getById(id) {
    return prisma.equipamento.findUniqueOrThrow({
      where: { id },
      include: {
        responsavel: {
          select: USER_SAFE_SELECT
        },
        historico: {
          include: {
            usuario: {
              select: USER_SAFE_SELECT
            }
          },
          orderBy: { criadoEm: 'desc' }
        }
      }
    });
  },

  async exportCsv(filters = {}) {
    const equipamentos = await prisma.equipamento.findMany({
      where: buildWhere(filters),
      include: {
        responsavel: {
          select: USER_SAFE_SELECT
        }
      },
      orderBy: [
        { dataFinalizacao: 'desc' },
        { criadoEm: 'desc' }
      ]
    });

    return toCsv(equipamentos);
  },

  async filterOptions() {
    if (filterOptionsCache && filterOptionsCache.expiresAt > Date.now()) {
      return filterOptionsCache.data;
    }

    await ensureDefaultFilterOptions();

    const [cidades, equipes, responsaveis, fabricantes, categorias] = await Promise.all([
      prisma.$queryRaw`
        SELECT DISTINCT TRIM("cidade") AS "nome"
        FROM "equipamentos"
        WHERE "ativo" = true
          AND "cidade" IS NOT NULL
          AND TRIM("cidade") <> ''
        ORDER BY "nome" ASC
      `,
      prisma.$queryRaw`
        SELECT DISTINCT TRIM("equipe") AS "nome"
        FROM "equipamentos"
        WHERE "ativo" = true
          AND "equipe" IS NOT NULL
          AND TRIM("equipe") <> ''
        ORDER BY "nome" ASC
      `,
      prisma.$queryRaw`
        SELECT DISTINCT TRIM(u."nome") AS "nome"
        FROM "equipamentos" e
        INNER JOIN "usuarios" u ON u."id" = e."responsavel_id"
        WHERE e."ativo" = true
          AND u."nome" IS NOT NULL
          AND TRIM(u."nome") <> ''
        ORDER BY "nome" ASC
      `,
      prisma.opcaoFiltroEquipamento.findMany({
        where: { tipo: 'FABRICANTE' },
        orderBy: { nome: 'asc' }
      }),
      prisma.opcaoFiltroEquipamento.findMany({
        where: { tipo: 'CATEGORIA' },
        orderBy: { nome: 'asc' }
      })
    ]);

    const data = {
      cidades: normalizeOptionRows(cidades),
      equipes: mergeOptionRows(equipes, SUPORTE_OPTIONS),
      responsaveis: normalizeOptionRows(responsaveis),
      fabricantes: fabricantes.map((item) => item.nome),
      categorias: categorias.map((item) => item.nome)
    };

    filterOptionsCache = {
      data,
      expiresAt: Date.now() + FILTER_OPTIONS_CACHE_TTL_MS
    };

    return data;
  },

  async createFilterOption(input = {}) {
    const tipo = String(input.tipo || '').trim().toUpperCase();
    const nome = String(input.nome || '').trim();

    if (!FILTRO_TIPOS.includes(tipo)) {
      throw new HttpError(400, 'Tipo de opcao invalido. Use FABRICANTE ou CATEGORIA.');
    }

    if (!nome) {
      throw new HttpError(400, 'Nome da opcao e obrigatorio.');
    }

    if (nome.length > 160) {
      throw new HttpError(400, 'Nome da opcao deve ter no maximo 160 caracteres.');
    }

    const option = await prisma.opcaoFiltroEquipamento.upsert({
      where: {
        tipo_nomeBusca: {
          tipo,
          nomeBusca: normalizeOptionName(nome)
        }
      },
      create: {
        tipo,
        nome,
        nomeBusca: normalizeOptionName(nome)
      },
      update: {
        nome
      }
    });
    clearFilterOptionsCache();
    return option;
  },

  async importCsv(file, actorId) {
    validateActor(actorId);

    if (!file) {
      throw new HttpError(400, 'Arquivo CSV e obrigatorio.');
    }

    const rows = parse(decodeCsvBuffer(file.buffer), {
      columns: true,
      delimiter: [',', ';'],
      bom: true,
      skip_empty_lines: true,
      trim: true
    });

    if (rows.length === 0) {
      throw new HttpError(400, 'Arquivo CSV nao possui linhas para importar.');
    }

    const preparedRows = [];
    const avisos = [];

    rows.forEach((row, index) => {
      const lineNumber = index + 2;

      if (isEmptyImportRow(row)) {
        avisos.push(buildImportWarning(lineNumber, 'LINHA', 'Linha em branco ignorada.'));
        return;
      }

      const prepared = prepareImportRow(row, lineNumber, actorId);

      if (prepared.skip) {
        avisos.push(...prepared.avisos);
        return;
      }

      preparedRows.push(prepared);
      avisos.push(...prepared.avisos);
    });

    const imported = [];

    for (const batch of chunkArray(preparedRows, IMPORT_BATCH_SIZE)) {
      const batchImported = await prisma.$transaction(async (tx) => {
        const createdItems = [];
        const historyEntries = [];

        for (const item of batch) {
          await modelosEquipamentoService.ensureExistsOrCreate(item.data.modelo, tx);
          await motivosEquipamentoService.ensureExistsOrCreate(item.data.motivo, tx);

          const created = await tx.equipamento.create({ data: item.data });
          createdItems.push(created);

          const changedFields = getChangedFields({}, created, MUTABLE_FIELDS);

          historyEntries.push(...buildHistoryEntries({
            equipamentoId: created.id,
            usuarioId: actorId,
            acao: 'IMPORTADO',
            entidade: 'equipamentos',
            oldData: {},
            newData: created,
            fields: changedFields
          }));
        }

        await createHistoryEntries(tx, historyEntries);

        return createdItems;
      }, IMPORT_TRANSACTION_OPTIONS);

      imported.push(...batchImported);
    }

    clearFilterOptionsCache();

    return {
      importados: imported.length,
      ignorados: avisos.filter((aviso) => aviso.ignorado).length,
      avisos,
      mensagem: `${imported.length} equipamento(s) importado(s) com sucesso.`
    };
  },

  async create(input, actorId) {
    const data = sanitizeEquipmentData(input);
    if (!data.responsavelId) data.responsavelId = actorId;
    if (data.dataFinalizacao === undefined) data.dataFinalizacao = null;
    data.ativo = true;
    data.excluidoEm = null;

    validateActor(actorId);
    validateEquipamentoBusinessRules(data);
    await modelosEquipamentoService.ensureExists(data.modelo);
    await motivosEquipamentoService.ensureExists(data.motivo);

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.equipamento.create({ data });
      const changedFields = getChangedFields({}, created, MUTABLE_FIELDS);
      const entries = buildHistoryEntries({
        equipamentoId: created.id,
        usuarioId: actorId,
        acao: 'CRIADO',
        entidade: 'equipamentos',
        oldData: {},
        newData: created,
        fields: changedFields
      });

      await createHistoryEntries(tx, entries);
      return findById(tx, created.id);
    });
    clearFilterOptionsCache();
    return result;
  },

  async update(id, input, actorId) {
    validateActor(actorId);

    const patch = pickMutableData(input);

    const result = await prisma.$transaction(async (tx) => {
      const current = await findByIdOrThrow(tx, id);
      ensureActive(current);

      const next = {
        ...current,
        ...patch
      };

      validateEquipamentoBusinessRules(next);
      if (patch.modelo !== undefined) {
        await modelosEquipamentoService.ensureExists(next.modelo, tx);
      }
      if (patch.motivo !== undefined) {
        await motivosEquipamentoService.ensureExists(next.motivo, tx);
      }

      const changes = getChangedFields(current, next, Object.keys(patch));

      if (changes.length === 0) {
        return findById(tx, id);
      }

      const updated = await tx.equipamento.update({
        where: { id },
        data: patch
      });

      await createHistoryEntries(tx, buildHistoryEntries({
        equipamentoId: id,
        usuarioId: actorId,
        acao: 'ATUALIZADO',
        entidade: 'equipamentos',
        oldData: current,
        newData: updated,
        fields: changes
      }));

      return findById(tx, id);
    });
    clearFilterOptionsCache();
    return result;
  },

  async finalize(id, input, actorId) {
    validateActor(actorId);

    const patch = pickMutableData(input);

    const result = await prisma.$transaction(async (tx) => {
      const current = await findByIdOrThrow(tx, id);
      ensureActive(current);

      if (current.dataFinalizacao) {
        throw new HttpError(409, 'Equipamento ja foi finalizado.');
      }

      const next = {
        ...current,
        ...patch,
        dataFinalizacao: new Date()
      };

      validateEquipamentoBusinessRules(next, { finalizando: true });
      if (patch.modelo !== undefined) {
        await modelosEquipamentoService.ensureExists(next.modelo, tx);
      }
      if (patch.motivo !== undefined) {
        await motivosEquipamentoService.ensureExists(next.motivo, tx);
      }

      const updateData = {
        ...patch,
        dataFinalizacao: next.dataFinalizacao
      };

      const changedFields = getChangedFields(current, next, Object.keys(updateData));

      const updated = await tx.equipamento.update({
        where: { id },
        data: updateData
      });

      await createHistoryEntries(tx, buildHistoryEntries({
        equipamentoId: id,
        usuarioId: actorId,
        acao: 'FINALIZADO',
        entidade: 'equipamentos',
        oldData: current,
        newData: updated,
        fields: changedFields
      }));

      return findById(tx, id);
    });
    clearFilterOptionsCache();
    return result;
  },

  async delete(id, input = {}, actorId) {
    validateActor(actorId);

    const result = await prisma.$transaction(async (tx) => {
      const current = await findByIdOrThrow(tx, id);
      ensureActive(current);

      const patch = {
        ativo: false,
        excluidoEm: new Date()
      };

      const updated = await tx.equipamento.update({
        where: { id },
        data: patch
      });

      const entries = buildHistoryEntries({
        equipamentoId: id,
        usuarioId: actorId,
        acao: 'CANCELADO',
        entidade: 'equipamentos',
        oldData: current,
        newData: updated,
        fields: ['ativo', 'excluidoEm']
      });

      if (input.motivoCancelamento) {
        entries.push({
          equipamentoId: id,
          usuarioId: actorId,
          acao: 'CANCELADO',
          entidade: 'equipamentos',
          campo: 'motivoCancelamento',
          valorAntigo: null,
          valorNovo: serializeValue(input.motivoCancelamento),
          observacao: 'Motivo informado no cancelamento do equipamento.'
        });
      }

      await createHistoryEntries(tx, entries);
      return findById(tx, id);
    });
    clearFilterOptionsCache();
    return result;
  }
};

function prepareImportRow(row, lineNumber, actorId) {
  const missingRequired = collectMissingRequiredImportFields(row);

  if (missingRequired.length > 0) {
    return {
      lineNumber,
      skip: true,
      avisos: missingRequired.map((field) => ({
        ...buildImportWarning(lineNumber, field, `Campo obrigatorio vazio. Linha ignorada.`),
        ignorado: true
      }))
    };
  }

  try {
    const data = {
      modelo: String(read(row, ['modelo', 'Modelo']) || '').trim(),
      quantidade: toInteger(read(row, ['quantidade', 'Quantidade', 'qtd', 'QTD']), lineNumber),
      origem: normalizeOrigem(read(row, ['origem', 'Origem']), lineNumber),
      numeroSerie: emptyToNull(read(row, ['numeroSerie', 'numero_serie', 'SN', 'sn', 'Número de Série', 'Numero de Serie'])),
      equipe: emptyToNull(read(row, ['equipe', 'Equipe'])),
      protocolo: emptyToNull(read(row, ['protocolo', 'PROTOCOLO'])),
      cidade: emptyToNull(read(row, ['cidade', 'Cidade'])),
      status: normalizeStatus(read(row, ['status', 'Status']), lineNumber),
      situacaoFinal: normalizeSituacaoFinal(read(row, ['situacaoFinal', 'situacao_final', 'Situação Final', 'Situacao Final']), lineNumber),
      motivo: emptyToNull(read(row, ['motivo', 'Motivo'])),
      valorVenda: toMoneyOrNull(read(row, ['valorVenda', 'valor_venda', 'Valor Venda', 'Valor vendido', 'VALOR VENDA', 'VALOR VENDIDO']), lineNumber),
      compradorVenda: emptyToNull(read(row, ['compradorVenda', 'comprador_venda', 'Comprador', 'Nome do comprador', 'COMPRADOR'])),
      documentoCompradorVenda: normalizeCpfCnpjOrNull(read(row, ['documentoCompradorVenda', 'documento_comprador_venda', 'CPF/CNPJ', 'CPF CNPJ', 'Documento Comprador', 'CPF', 'CNPJ']), lineNumber),
      vendaConfirmada: toBooleanOrDefault(read(row, ['vendaConfirmada', 'venda_confirmada', 'Venda Confirmada', 'VENDA CONFIRMADA']), true, lineNumber, 'venda confirmada'),
      resolvido: null,
      responsavelId: actorId,
      observacoes: emptyToNull(read(row, ['observacoes', 'observações', 'Observacoes', 'Observações'])),
      dataFinalizacao: parseImportDate(read(row, ['dataFinalizacao', 'data_finalizacao', 'Data']), lineNumber) || new Date(),
      ativo: true,
      excluidoEm: null
    };

    const resolvidoImportado = toBooleanOrNull(read(row, ['resolvido', 'Resolvido']), lineNumber);
    data.resolvido = data.origem === 'CAIXA_OS' ? resolvidoImportado : null;

    return {
      lineNumber,
      skip: false,
      data,
      avisos: collectImportWarnings(data, lineNumber, resolvidoImportado)
    };
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 400) {
      return {
        lineNumber,
        skip: true,
        avisos: [{
          ...buildImportWarning(lineNumber, 'LINHA', `${stripLinePrefix(error.message, lineNumber)} Linha ignorada.`),
          ignorado: true
        }]
      };
    }

    throw error;
  }
}

function collectMissingRequiredImportFields(row) {
  const requiredFields = [
    { label: 'MODELO', keys: ['modelo', 'Modelo'] },
    { label: 'QTD', keys: ['quantidade', 'Quantidade', 'qtd', 'QTD'] },
    { label: 'ORIGEM', keys: ['origem', 'Origem'] },
    { label: 'STATUS', keys: ['status', 'Status'] },
    { label: 'SITUAÇÃO FINAL', keys: ['situacaoFinal', 'situacao_final', 'Situação Final', 'Situacao Final'] }
  ];

  return requiredFields
    .filter((field) => !isPresent(read(row, field.keys)))
    .map((field) => field.label);
}

function collectImportWarnings(data, lineNumber, resolvidoImportado = null) {
  const avisos = [];

  if (['RMA', 'DESCARTE'].includes(data.situacaoFinal)) {
    if (!isPresent(data.numeroSerie)) {
      avisos.push(buildImportWarning(lineNumber, 'SN', 'Numero de serie ausente para RMA ou Descarte.'));
    }

    if (data.quantidade !== 1) {
      avisos.push(buildImportWarning(lineNumber, 'QTD', 'Quantidade diferente de 1 para RMA ou Descarte.'));
    }

    if (!isPresent(data.motivo)) {
      avisos.push(buildImportWarning(lineNumber, 'MOTIVO', 'Motivo ausente para RMA ou Descarte.'));
    }

  }

  if (data.origem === 'CAIXA_OS' && typeof data.resolvido !== 'boolean') {
    avisos.push(buildImportWarning(lineNumber, 'RESOLVIDO', 'Resolvido nao informado para origem Caixa de OS.'));
  }

  if (data.origem !== 'CAIXA_OS' && resolvidoImportado !== null && resolvidoImportado !== undefined) {
    avisos.push(buildImportWarning(lineNumber, 'RESOLVIDO', 'Resolvido informado em origem diferente de Caixa de OS e nao foi gravado.'));
  }

  return avisos;
}

function buildImportWarning(lineNumber, field, message) {
  return {
    linha: lineNumber,
    campo: field,
    mensagem: message
  };
}

function stripLinePrefix(message, lineNumber) {
  return String(message || '').replace(new RegExp(`^Linha ${lineNumber}:\\s*`, 'i'), '');
}

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function buildWhere(filters) {
  const where = {};

  if (filters.incluirInativos !== 'true') where.ativo = true;
  applyEnumFilter(where, 'origem', filters.origem);
  applyEnumFilter(where, 'status', filters.status);
  applyEnumFilter(where, 'situacaoFinal', filters.situacaoFinal);
  if (filters.responsavelId) where.responsavelId = filters.responsavelId;
  if (filters.numeroSerie) where.numeroSerie = { contains: filters.numeroSerie, mode: 'insensitive' };
  applyTextFilter(where, 'modelo', filters.modelo);
  applyTextFilter(where, 'modelo', filters.fabricante);
  applyTextFilter(where, 'modelo', filters.categoria);
  applyTipoFilter(where, filters.tipo);
  applyTextFilter(where, 'cidade', filters.cidade);
  applyTextFilter(where, 'equipe', filters.equipe);
  applyTextFilter(where, 'motivo', filters.motivo);
  if (filters.protocolo) where.protocolo = { contains: filters.protocolo, mode: 'insensitive' };
  if (filters.resolvido === 'true') where.resolvido = true;
  if (filters.resolvido === 'false') where.resolvido = false;
  if (filters.data) {
    const start = new Date(`${filters.data}T00:00:00.000`);
    const end = new Date(`${filters.data}T23:59:59.999`);

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      where.dataFinalizacao = {
        gte: start,
        lte: end
      };
    }
  }

  return where;
}

function applyEnumFilter(where, field, value) {
  const values = parseList(value);
  if (values.length === 1) where[field] = values[0];
  if (values.length > 1) where[field] = { in: values };
}

function applyTextFilter(where, field, value) {
  const values = parseList(value);
  if (values.length === 1) {
    where[field] = { contains: values[0], mode: 'insensitive' };
  }

  if (values.length > 1) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: values.map((item) => ({
          [field]: { contains: item, mode: 'insensitive' }
        }))
      }
    ];
  }
}

function applyTipoFilter(where, tipo) {
  if (!tipo) return;

  const antennaConditions = [
    { modelo: { startsWith: 'Antena', mode: 'insensitive' } },
    { modelo: { startsWith: 'Rádio', mode: 'insensitive' } },
    { modelo: { startsWith: 'Radio', mode: 'insensitive' } }
  ];

  if (tipo === 'ANTENA') {
    where.AND = [...(where.AND || []), { OR: antennaConditions }];
  }

  if (tipo === 'OUTROS') {
    where.AND = [...(where.AND || []), { NOT: { OR: antennaConditions } }];
  }
}

function parseList(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : String(value).split(',');
  return values.map((item) => String(item).trim()).filter(Boolean);
}

function buildPagination(filters) {
  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 20));

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

function toCsv(equipamentos) {
  const headers = [
    'Data',
    'Modelo',
    'QTD',
    'Origem',
    'SN',
    'Equipe',
    'Protocolo',
    'Cidade',
    'Status',
    'Situacao Final',
    'Motivo',
    'Valor Venda',
    'Comprador',
    'CPF/CNPJ Comprador',
    'Venda Confirmada',
    'Resolvido',
    'Responsavel'
  ];

  const rows = equipamentos.map((equipamento) => [
    equipamento.dataFinalizacao ? equipamento.dataFinalizacao.toISOString().slice(0, 10) : '',
    equipamento.modelo,
    equipamento.quantidade,
    equipamento.origem,
    equipamento.numeroSerie,
    equipamento.equipe,
    equipamento.protocolo,
    equipamento.cidade,
    equipamento.status,
    equipamento.situacaoFinal,
    equipamento.motivo,
    equipamento.valorVenda,
    equipamento.compradorVenda,
    equipamento.documentoCompradorVenda,
    equipamento.vendaConfirmada ? 'Sim' : 'Nao',
    equipamento.resolvido === null || equipamento.resolvido === undefined ? '' : equipamento.resolvido ? 'Sim' : 'Nao',
    equipamento.responsavel?.nome
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
}

function normalizeOptionRows(rows) {
  return rows.map((row) => row.nome).filter(Boolean);
}

function mergeOptionRows(rows, extraOptions = []) {
  return [...new Set([...normalizeOptionRows(rows), ...extraOptions])]
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
}

async function ensureDefaultFilterOptions() {
  const options = [
    ...DEFAULT_FABRICANTES.map((nome) => ({ tipo: 'FABRICANTE', nome, nomeBusca: normalizeOptionName(nome) })),
    ...DEFAULT_CATEGORIAS.map((nome) => ({ tipo: 'CATEGORIA', nome, nomeBusca: normalizeOptionName(nome) }))
  ];

  await prisma.opcaoFiltroEquipamento.createMany({
    data: options,
    skipDuplicates: true
  });
}

function normalizeOptionName(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function escapeCsv(value) {
  if (value === undefined || value === null) return '';
  return `"${String(value).replaceAll('"', '""')}"`;
}

function read(row, keys) {
  const normalizedRow = normalizeRowKeys(row);

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }

    const normalizedKey = normalizeHeader(key);
    if (Object.prototype.hasOwnProperty.call(normalizedRow, normalizedKey)) {
      return normalizedRow[normalizedKey];
    }
  }

  return undefined;
}

function isEmptyImportRow(row) {
  return Object.values(row).every((value) => !isPresent(value));
}

function normalizeRowKeys(row) {
  const normalized = {};

  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeHeader(key)] = value;
  }

  return normalized;
}

function normalizeHeader(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function toInteger(value, lineNumber) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new HttpError(400, `Linha ${lineNumber}: quantidade deve ser um numero inteiro maior que zero.`);
  }

  return number;
}

function toMoneyOrNull(value, lineNumber) {
  if (value === undefined || value === null || String(value).trim() === '') return null;

  const normalized = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(/^R\$/i, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const number = Number(normalized);

  if (!Number.isFinite(number) || number < 0) {
    throw new HttpError(400, `Linha ${lineNumber}: valor de venda invalido.`);
  }

  return number;
}

function toBooleanOrNull(value, lineNumber) {
  if (value === undefined || value === null || String(value).trim() === '') return null;

  const normalized = normalizeText(value);

  if (['sim', 's', 'true', '1', 'resolvido'].includes(normalized)) return true;
  if (['nao', 'não', 'n', 'false', '0', 'pendente'].includes(normalized)) return false;

  throw new HttpError(400, `Linha ${lineNumber}: resolvido deve ser Sim ou Nao.`);
}

function toBooleanOrDefault(value, defaultValue, lineNumber, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') return defaultValue;

  const normalized = normalizeText(value);

  if (['sim', 's', 'true', '1', 'confirmada', 'confirmado'].includes(normalized)) return true;
  if (['nao', 'nÃ£o', 'n', 'false', '0', 'cancelada', 'cancelado'].includes(normalized)) return false;

  throw new HttpError(400, `Linha ${lineNumber}: ${fieldName} deve ser Sim ou Nao.`);
}

function normalizeCpfCnpjOrNull(value, lineNumber) {
  if (value === undefined || value === null || String(value).trim() === '') return null;

  const digits = String(value).replace(/\D/g, '');

  if (![11, 14].includes(digits.length)) {
    throw new HttpError(400, `Linha ${lineNumber}: CPF/CNPJ do comprador deve ter 11 ou 14 digitos.`);
  }

  return digits;
}

function normalizeOrigem(value, lineNumber) {
  const normalized = normalizeText(value);
  if (normalized === 'recolhimento') return 'RECOLHIMENTO';
  if (normalized === 'caixa de os' || normalized === 'caixa_os' || normalized === 'caixa os') return 'CAIXA_OS';
  if (normalized === 'casa velha' || normalized === 'casa_velha') return 'CASA_VELHA';
  throw new HttpError(400, `Linha ${lineNumber}: origem invalida.`);
}

function normalizeStatus(value, lineNumber) {
  const normalized = normalizeText(value);
  if (normalized === 'reset/limpeza' || normalized === 'reset limpeza' || normalized === 'reset_limpeza') return 'RESET_LIMPEZA';
  if (normalized === 'em teste' || normalized === 'em_teste') return 'EM_TESTE';
  if (normalized === 'finalizado') return 'FINALIZADO';
  throw new HttpError(400, `Linha ${lineNumber}: status invalido.`);
}

function normalizeSituacaoFinal(value, lineNumber) {
  const normalized = normalizeText(value);
  if (normalized === 'reaproveitado') return 'REAPROVEITADO';
  if (normalized === 'descarte') return 'DESCARTE';
  if (normalized === 'rma') return 'RMA';
  if (normalized === 'venda') return 'VENDA';
  throw new HttpError(400, `Linha ${lineNumber}: situacao final invalida.`);
}

function parseImportDate(value, lineNumber) {
  if (!value || String(value).trim() === '') return null;

  const raw = String(value).trim();
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = brMatch
    ? new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}T12:00:00.000`)
    : isoMatch
      ? new Date(`${raw}T12:00:00.000`)
      : new Date(raw);

  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `Linha ${lineNumber}: data invalida. Use DD/MM/AAAA ou AAAA-MM-DD.`);
  }

  return date;
}

function normalizeText(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function decodeCsvBuffer(buffer) {
  const utf8 = buffer.toString('utf8');

  if (!utf8.includes('\uFFFD')) {
    return utf8;
  }

  return buffer.toString('latin1');
}

function sanitizeEquipmentData(input) {
  const data = pickFields(input, MUTABLE_FIELDS);
  delete data.usuarioId;
  delete data.usuarioAlteracaoId;
  return data;
}

function pickMutableData(input) {
  return pickFields(input, MUTABLE_FIELDS);
}

function pickFields(input, allowedFields) {
  const data = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      data[field] = normalizeEmpty(input[field]);
    }
  }

  return data;
}

function normalizeEmpty(value) {
  if (value === '') return null;
  return value;
}

function validateActor(actorId) {
  if (!actorId) {
    throw new HttpError(400, 'Usuario executor e obrigatorio para registrar historico.');
  }
}

function ensureActive(equipamento) {
  if (!equipamento.ativo) {
    throw new HttpError(409, 'Equipamento cancelado nao pode ser alterado.');
  }
}

async function findByIdOrThrow(tx, id) {
  return tx.equipamento.findUniqueOrThrow({
    where: { id }
  });
}

async function findById(tx, id) {
  return tx.equipamento.findUnique({
    where: { id },
    include: {
      responsavel: {
        select: USER_SAFE_SELECT
      },
      historico: {
        include: {
          usuario: {
            select: USER_SAFE_SELECT
          }
        },
        orderBy: { criadoEm: 'desc' }
      }
    }
  });
}

function getChangedFields(oldData, newData, fields) {
  return fields.filter((field) => serializeValue(oldData[field]) !== serializeValue(newData[field]));
}

function buildHistoryEntries({ equipamentoId, usuarioId, acao, entidade, oldData, newData, fields }) {
  return fields.map((field) => ({
    equipamentoId,
    usuarioId,
    acao,
    entidade,
    campo: field,
    valorAntigo: serializeValue(oldData[field]),
    valorNovo: serializeValue(newData[field]),
    dadosAnteriores: oldData[field] === undefined ? undefined : { [field]: toJsonValue(oldData[field]) },
    dadosNovos: newData[field] === undefined ? undefined : { [field]: toJsonValue(newData[field]) }
  }));
}

function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function createHistoryEntries(tx, entries) {
  if (entries.length === 0) return;
  await tx.historico.createMany({ data: entries });
}

function clearFilterOptionsCache() {
  filterOptionsCache = null;
}

function serializeValue(value) {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function toJsonValue(value) {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

module.exports = { equipamentoService };
