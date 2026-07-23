const { pickDefined, requireFields, result } = require('./base.validator');

function createEquipeCidadeValidator(body = {}) {
  const data = normalize(body);
  const errors = requireFields(data, ['equipe', 'cidade', 'supervisor']);
  errors.push(...validateLengths(data));

  return result(data, errors);
}

function updateEquipeCidadeValidator(body = {}) {
  const data = normalize(body);
  const errors = validateLengths(data);

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
    equipe: normalizeText(body.equipe),
    cidade: normalizeText(body.cidade),
    supervisor: normalizeText(body.supervisor)
  });
}

function validateLengths(data) {
  const errors = [];

  for (const field of ['equipe', 'cidade', 'supervisor']) {
    if (data[field] !== undefined && !data[field]) {
      errors.push({
        field,
        message: `${field} e obrigatorio.`
      });
    }

    if (data[field] && data[field].length > 120) {
      errors.push({
        field,
        message: `${field} deve ter no maximo 120 caracteres.`
      });
    }
  }

  return errors;
}

function normalizeText(value) {
  if (value === undefined || value === null) return undefined;
  return String(value).replace(/\s+/g, ' ').trim();
}

module.exports = {
  createEquipeCidadeValidator,
  updateEquipeCidadeValidator
};
