const { pickDefined, requireFields, result } = require('./base.validator');

function createGuiaSecaoValidator(body = {}) {
  const data = normalize(body);
  const errors = requireFields(data, ['titulo', 'conteudo']);
  errors.push(...validateFields(data));

  return result(data, errors);
}

function updateGuiaSecaoValidator(body = {}) {
  const data = normalize(body);
  const errors = validateFields(data);

  if (Object.keys(data).length === 0) {
    errors.push({
      field: 'body',
      message: 'Informe pelo menos um campo para alterar.'
    });
  }

  return result(data, errors);
}

function normalize(body) {
  return pickDefined({
    titulo: normalizeTitle(body.titulo),
    conteudo: normalizeContent(body.conteudo),
    ordem: body.ordem === undefined || body.ordem === null || body.ordem === '' ? undefined : Number(body.ordem)
  });
}

function validateFields(data) {
  const errors = [];

  if (data.titulo !== undefined && !data.titulo) {
    errors.push({ field: 'titulo', message: 'Titulo e obrigatorio.' });
  }

  if (data.titulo && data.titulo.length > 180) {
    errors.push({ field: 'titulo', message: 'Titulo deve ter no maximo 180 caracteres.' });
  }

  if (data.conteudo !== undefined && !data.conteudo) {
    errors.push({ field: 'conteudo', message: 'Conteudo e obrigatorio.' });
  }

  if (data.ordem !== undefined && (!Number.isInteger(data.ordem) || data.ordem < 0)) {
    errors.push({ field: 'ordem', message: 'Ordem deve ser um numero inteiro maior ou igual a zero.' });
  }

  return errors;
}

function normalizeTitle(value) {
  if (value === undefined || value === null) return undefined;
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizeContent(value) {
  if (value === undefined || value === null) return undefined;
  return String(value).replace(/\r\n/g, '\n').trim();
}

module.exports = {
  createGuiaSecaoValidator,
  updateGuiaSecaoValidator
};
