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

    return prisma.$transaction(async (tx) => {
      const imported = [];

      for (const item of preparedRows) {
        await modelosEquipamentoService.ensureExistsOrCreate(item.data.modelo, tx);
        await motivosEquipamentoService.ensureExistsOrCreate(item.data.motivo, tx);
        const created = await tx.equipamento.create({ data: item.data });
        imported.push(created);

        const changedFields = getChangedFields({}, created, MUTABLE_FIELDS);

        await createHistoryEntries(tx, buildHistoryEntries({
          equipamentoId: created.id,
          usuarioId: actorId,
          acao: 'IMPORTADO',
          entidade: 'equipamentos',
          oldData: {},
          newData: created,
          fields: changedFields
        }));
      }

      return {
        importados: imported.length,
        ignorados: avisos.filter((aviso) => aviso.ignorado).length,
        avisos,
        mensagem: `${imported.length} equipamento(s) importado(s) com sucesso.`
      };
    });
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

    return prisma.$transaction(async (tx) => {
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
  },

  async update(id, input, actorId) {
    validateActor(actorId);

    const patch = pickMutableData(input);

    return prisma.$transaction(async (tx) => {
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
  },

  async finalize(id, input, actorId) {
    validateActor(actorId);

    const patch = pickMutableData(input);

    return prisma.$transaction(async (tx) => {
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
  },

  async delete(id, input = {}, actorId) {
    validateActor(actorId);

    return prisma.$transaction(async (tx) => {
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
    resolvido: null,
    responsavelId: actorId,
    observacoes: emptyToNull(read(row, ['observacoes', 'observações', 'Observacoes', 'Observações'])),
    dataFinalizacao: parseImportDate(read(row, ['dataFinalizacao', 'data_finalizacao', 'Data']), lineNumber) || new Date(),
    ativo: true,
    excluidoEm: null
  };

  const resolvidoImportado = toBooleanOrNull(read(row, ['resolvido', 'Resolvido']), lineNumber);
  data.resolvido = data.status === 'EM_TESTE' ? resolvidoImportado : null;

  return {
    lineNumber,
    skip: false,
    data,
    avisos: collectImportWarnings(data, lineNumber, resolvidoImportado)
  };
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

    if (!isPresent(data.equipe)) {
      avisos.push(buildImportWarning(lineNumber, 'EQUIPE', 'Equipe ausente para RMA ou Descarte.'));
    }

    if (!isPresent(data.cidade)) {
      avisos.push(buildImportWarning(lineNumber, 'CIDADE', 'Cidade ausente para RMA ou Descarte.'));
    }
  }

  if (data.status === 'EM_TESTE' && typeof data.resolvido !== 'boolean') {
    avisos.push(buildImportWarning(lineNumber, 'RESOLVIDO', 'Resolvido nao informado para status Em Teste.'));
  }

  if (data.status !== 'EM_TESTE' && resolvidoImportado !== null && resolvidoImportado !== undefined) {
    avisos.push(buildImportWarning(lineNumber, 'RESOLVIDO', 'Resolvido informado em status diferente de Em Teste e nao foi gravado.'));
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

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function buildWhere(filters) {
  const where = {};

  if (filters.incluirInativos !== 'true') where.ativo = true;
  if (filters.origem) where.origem = filters.origem;
  if (filters.status) where.status = filters.status;
  if (filters.situacaoFinal) where.situacaoFinal = filters.situacaoFinal;
  if (filters.responsavelId) where.responsavelId = filters.responsavelId;
  if (filters.numeroSerie) where.numeroSerie = { contains: filters.numeroSerie, mode: 'insensitive' };
  if (filters.modelo) where.modelo = { contains: filters.modelo, mode: 'insensitive' };
  if (filters.cidade) where.cidade = { contains: filters.cidade, mode: 'insensitive' };
  if (filters.equipe) where.equipe = { contains: filters.equipe, mode: 'insensitive' };
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
    equipamento.resolvido === null || equipamento.resolvido === undefined ? '' : equipamento.resolvido ? 'Sim' : 'Nao',
    equipamento.responsavel?.nome
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
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

function toBooleanOrNull(value, lineNumber) {
  if (value === undefined || value === null || String(value).trim() === '') return null;

  const normalized = normalizeText(value);

  if (['sim', 's', 'true', '1', 'resolvido'].includes(normalized)) return true;
  if (['nao', 'não', 'n', 'false', '0', 'pendente'].includes(normalized)) return false;

  throw new HttpError(400, `Linha ${lineNumber}: resolvido deve ser Sim ou Nao.`);
}

function normalizeOrigem(value, lineNumber) {
  const normalized = normalizeText(value);
  if (normalized === 'recolhimento') return 'RECOLHIMENTO';
  if (normalized === 'caixa de os' || normalized === 'caixa_os' || normalized === 'caixa os') return 'CAIXA_OS';
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

async function createHistoryEntries(tx, entries) {
  if (entries.length === 0) return;
  await tx.historico.createMany({ data: entries });
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
