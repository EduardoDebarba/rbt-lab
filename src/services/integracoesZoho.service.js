const crypto = require('crypto');

const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const { HttpError } = require('../utils/httpError');
const { equipamentoService } = require('./equipamentos.service');

const ID_KEYS = [
  'ID_SISTEMA',
  'idSistema',
  'equipamentoId',
  'EQUIPAMENTO_ID'
];

const ROW_ID_KEYS = [
  'LINHA_ZOHO_ID',
  'linhaZohoId',
  'rowId',
  'ROW_ID',
  'ID_ZOHO',
  'ID_LINHA'
];

const zohoIntegracaoService = {
  async processEquipmentRow(payload = {}) {
    const row = extractRow(payload);
    const actor = await findIntegrationUser();
    const linhaZohoId = resolveLineId(payload, row);
    const requestedEquipmentId = pickFirst(row, ID_KEYS) || pickFirst(payload, ID_KEYS);
    const previousImport = await prisma.zohoImportacao.findUnique({
      where: { linhaZohoId }
    });
    const requestedEquipmentUuid = normalizeUuid(requestedEquipmentId);
    const equipamentoId = await resolveEquipmentIdForSync(requestedEquipmentUuid, previousImport);

    try {
      const result = await equipamentoService.importExternalRow(row, actor.id, { equipamentoId });
      const saved = await prisma.zohoImportacao.upsert({
        where: { linhaZohoId },
        create: {
          linhaZohoId,
          equipamentoId: result.equipamento.id,
          status: 'SUCESSO',
          erro: null,
          payload
        },
        update: {
          equipamentoId: result.equipamento.id,
          status: 'SUCESSO',
          erro: null,
          payload
        }
      });

      return {
        sincronizado: true,
        linhaZohoId: saved.linhaZohoId,
        idSistema: result.equipamento.id,
        equipamento: result.equipamento,
        avisos: result.avisos,
        colunasPlanilha: {
          ID_SISTEMA: result.equipamento.id,
          SINCRONIZADO: 'SIM',
          ERRO_SINCRONIZACAO: ''
        }
      };
    } catch (error) {
      await registerFailedImport(linhaZohoId, equipamentoId, payload, error);
      throw error;
    }
  }
};

async function findIntegrationUser() {
  const usuario = await prisma.usuario.findFirst({
    where: {
      email: env.zohoIntegrationUserEmail,
      ativo: true
    }
  });

  if (usuario) return usuario;

  const fallback = await prisma.usuario.findFirst({
    where: {
      perfil: 'SUPER_ADMIN',
      ativo: true
    },
    orderBy: { criadoEm: 'asc' }
  });

  if (fallback) return fallback;

  throw new HttpError(500, 'Usuario executor da integracao Zoho nao encontrado.');
}

async function resolveEquipmentIdForSync(requestedEquipmentId, previousImport) {
  const candidateId = requestedEquipmentId || previousImport?.equipamentoId || null;

  if (!candidateId) return null;

  const equipamento = await prisma.equipamento.findUnique({
    where: { id: candidateId },
    select: { id: true, ativo: true }
  });

  if (!equipamento) return null;

  if (equipamento.ativo) return equipamento.id;

  if (requestedEquipmentId) {
    throw new HttpError(409, 'Equipamento vinculado ao ID_SISTEMA esta cancelado e nao pode ser alterado.');
  }

  return null;
}

async function registerFailedImport(linhaZohoId, equipamentoId, payload, error) {
  await prisma.zohoImportacao.upsert({
    where: { linhaZohoId },
    create: {
      linhaZohoId,
      equipamentoId,
      status: 'ERRO',
      erro: buildErrorMessage(error),
      payload
    },
    update: {
      equipamentoId,
      status: 'ERRO',
      erro: buildErrorMessage(error),
      payload
    }
  });
}

function extractRow(payload) {
  if (payload.row && typeof payload.row === 'object') return payload.row;
  if (payload.dados && typeof payload.dados === 'object') return payload.dados;
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) return payload.data;
  return payload;
}

function resolveLineId(payload, row) {
  const provided = pickFirst(row, ROW_ID_KEYS) || pickFirst(payload, ROW_ID_KEYS);

  if (provided) return String(provided).trim();

  const idSistema = pickFirst(row, ID_KEYS) || pickFirst(payload, ID_KEYS);
  if (idSistema) return `ID_SISTEMA:${String(idSistema).trim()}`;

  return `HASH:${crypto
    .createHash('sha256')
    .update(stableStringify(row))
    .digest('hex')}`;
}

function pickFirst(source, keys) {
  if (!source || typeof source !== 'object') return null;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const value = source[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
  }

  return null;
}

function normalizeUuid(value) {
  if (!value) return null;
  const text = String(value).trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(text) ? text : null;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function buildErrorMessage(error) {
  if (error.details) {
    return `${error.message} ${JSON.stringify(error.details)}`;
  }

  return error.message || 'Erro ao sincronizar linha da Zoho Sheet.';
}

module.exports = { zohoIntegracaoService };
