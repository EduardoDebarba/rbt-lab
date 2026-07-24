const { HttpError } = require('./httpError');

const ORIGENS = ['RECOLHIMENTO', 'CAIXA_OS', 'CASA_VELHA'];
const STATUS = ['RESET_LIMPEZA', 'EM_TESTE', 'FINALIZADO'];
const SITUACOES_FINAIS = ['REAPROVEITADO', 'DESCARTE', 'RMA', 'VENDA'];

const FINAL_STATUS_BY_SITUACAO = {
  DESCARTE: 'FINALIZADO',
  RMA: 'EM_TESTE'
};

function validateEquipamentoBusinessRules(data, options = {}) {
  const errors = [];
  const finalizando = Boolean(options.finalizando);

  if (!isPresent(data.responsavelId)) {
    errors.push({
      field: 'responsavelId',
      message: 'Responsavel e obrigatorio.'
    });
  }

  if (!isPresent(data.modelo)) {
    errors.push({
      field: 'modelo',
      message: 'Modelo e obrigatorio.'
    });
  }

  if (!Number.isInteger(data.quantidade) || data.quantidade <= 0) {
    errors.push({
      field: 'quantidade',
      message: 'Quantidade deve ser um numero inteiro maior que zero.'
    });
  }

  if (!ORIGENS.includes(data.origem)) {
    errors.push({
      field: 'origem',
      message: `Origem deve ser uma das opcoes: ${ORIGENS.join(', ')}.`
    });
  }

  if (!STATUS.includes(data.status)) {
    errors.push({
      field: 'status',
      message: `Status deve ser uma das opcoes: ${STATUS.join(', ')}.`
    });
  }

  if (!SITUACOES_FINAIS.includes(data.situacaoFinal)) {
    errors.push({
      field: 'situacaoFinal',
      message: `Situacao final deve ser uma das opcoes: ${SITUACOES_FINAIS.join(', ')}.`
    });
  }

  if (['RMA', 'DESCARTE'].includes(data.situacaoFinal)) {
    if (data.quantidade !== 1) {
      errors.push({
        field: 'quantidade',
        message: 'Quantidade deve ser exatamente 1 para RMA ou Descarte.'
      });
    }

    if (!isPresent(data.motivo)) {
      errors.push({
        field: 'motivo',
        message: 'Motivo e obrigatorio para RMA ou Descarte.'
      });
    }

  }

  if (data.origem !== 'CAIXA_OS' && data.resolvido !== null && data.resolvido !== undefined) {
    errors.push({
      field: 'resolvido',
      message: 'Resolvido deve ser informado apenas quando a origem for Caixa de OS.'
    });
  }

  if (finalizando && SITUACOES_FINAIS.includes(data.situacaoFinal)) {
    const expectedStatus = FINAL_STATUS_BY_SITUACAO[data.situacaoFinal];

    if (expectedStatus && data.status !== expectedStatus) {
      errors.push({
        field: 'status',
        message: `Para finalizar como ${data.situacaoFinal}, o status deve ser ${expectedStatus}.`
      });
    }
  }

  if (errors.length > 0) {
    throw new HttpError(400, 'Equipamento invalido. Corrija os campos informados.', errors);
  }
}

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

module.exports = {
  ORIGENS,
  STATUS,
  SITUACOES_FINAIS,
  validateEquipamentoBusinessRules
};
