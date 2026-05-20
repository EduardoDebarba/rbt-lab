const { pickDefined, requireFields, result } = require('./base.validator');
const { ORIGENS, STATUS, SITUACOES_FINAIS } = require('../utils/equipamentoRules');

const FORBIDDEN_FIELDS = ['id', 'criadoEm', 'atualizadoEm', 'excluidoEm'];

function createEquipamentoValidator(body) {
  const data = normalize(body);
  const errors = requireFields(data, [
    'modelo',
    'quantidade',
    'origem',
    'status',
    'situacaoFinal'
  ]);

  errors.push(...validateCommon(body, data, { partial: false }));

  return result(data, errors);
}

function updateEquipamentoValidator(body) {
  const data = normalize(body);
  const errors = validateCommon(body, data, { partial: true });

  if (Object.keys(data).filter((field) => !isActorField(field)).length === 0) {
    errors.push({ field: 'body', message: 'Informe pelo menos um campo para alterar.' });
  }

  return result(data, errors);
}

function finalizarEquipamentoValidator(body) {
  const data = normalize(body);
  const errors = validateCommon(body, data, { partial: true });

  return result(data, errors);
}

function deleteEquipamentoValidator(body = {}) {
  const data = pickDefined({
    usuarioId: body.usuarioId,
    usuarioAlteracaoId: body.usuarioAlteracaoId,
    motivoCancelamento: body.motivoCancelamento
  });

  const errors = [];
  return result(data, errors);
}

function normalize(body) {
  return pickDefined({
    modelo: body.modelo,
    dataFinalizacao: normalizeDate(body.dataFinalizacao),
    quantidade: body.quantidade === undefined ? undefined : Number(body.quantidade),
    origem: body.origem,
    numeroSerie: body.numeroSerie,
    equipe: body.equipe,
    protocolo: body.protocolo,
    cidade: body.cidade,
    status: body.status,
    situacaoFinal: body.situacaoFinal,
    motivo: body.motivo,
    resolvido: body.resolvido,
    responsavelId: body.responsavelId,
    observacoes: body.observacoes,
    usuarioId: body.usuarioId,
    usuarioAlteracaoId: body.usuarioAlteracaoId
  });
}

function validateCommon(rawBody, data, options) {
  const errors = [];

  for (const field of FORBIDDEN_FIELDS) {
    if (rawBody[field] !== undefined) {
      errors.push({
        field,
        message: `${field} nao pode ser informado manualmente.`
      });
    }
  }

  if ((!options.partial || data.origem !== undefined) && data.origem !== undefined && !ORIGENS.includes(data.origem)) {
    errors.push({
      field: 'origem',
      message: `Origem invalida. Use: ${ORIGENS.join(', ')}.`
    });
  }

  if ((!options.partial || data.status !== undefined) && data.status !== undefined && !STATUS.includes(data.status)) {
    errors.push({
      field: 'status',
      message: `Status invalido. Use: ${STATUS.join(', ')}.`
    });
  }

  if (
    (!options.partial || data.situacaoFinal !== undefined) &&
    data.situacaoFinal !== undefined &&
    !SITUACOES_FINAIS.includes(data.situacaoFinal)
  ) {
    errors.push({
      field: 'situacaoFinal',
      message: `Situacao final invalida. Use: ${SITUACOES_FINAIS.join(', ')}.`
    });
  }

  if (data.quantidade !== undefined && (!Number.isInteger(data.quantidade) || data.quantidade <= 0)) {
    errors.push({
      field: 'quantidade',
      message: 'Quantidade deve ser um numero inteiro maior que zero.'
    });
  }

  if (data.dataFinalizacao !== undefined && data.dataFinalizacao !== null && Number.isNaN(data.dataFinalizacao.getTime())) {
    errors.push({
      field: 'dataFinalizacao',
      message: 'Data invalida.'
    });
  }

  if (data.resolvido !== undefined && data.resolvido !== null && typeof data.resolvido !== 'boolean') {
    errors.push({
      field: 'resolvido',
      message: 'Resolvido deve ser true ou false.'
    });
  }

  return errors;
}

function normalizeDate(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const raw = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00.000`)
    : new Date(raw);

  return date;
}

function isActorField(field) {
  return field === 'usuarioId' || field === 'usuarioAlteracaoId';
}

module.exports = {
  createEquipamentoValidator,
  updateEquipamentoValidator,
  finalizarEquipamentoValidator,
  deleteEquipamentoValidator
};
