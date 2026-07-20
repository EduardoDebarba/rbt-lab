const { pickDefined, requireFields, result } = require('./base.validator');
const { PERFIS, validateEmailDomain } = require('./auth.validator');

function createUsuarioValidator(body) {
  const data = pickDefined({
    email: normalizeEmail(body.email),
    ativo: body.ativo
  });

  const errors = requireFields(data, ['email']);
  errors.push(...validateEmailDomain(data.email));
  errors.push(...validateUserFields(data));

  return result(data, errors);
}

function updateUsuarioValidator(body) {
  const data = pickDefined({
    nome: body.nome,
    email: normalizeEmail(body.email),
    senha: body.senha,
    perfil: body.perfil,
    ativo: body.ativo
  });

  const errors = validateUserFields(data);
  errors.push(...validateEmailDomain(data.email));

  if (Object.keys(data).length === 0) {
    errors.push({
      field: 'body',
      message: 'Informe pelo menos um campo para alterar.'
    });
  }

  return result(data, errors);
}

function validateUserFields(data) {
  const errors = [];

  if (data.senha && String(data.senha).length < 6) {
    errors.push({
      field: 'senha',
      message: 'Senha deve ter pelo menos 6 caracteres.'
    });
  }

  if (data.perfil && !PERFIS.includes(data.perfil)) {
    errors.push({
      field: 'perfil',
      message: `Perfil invalido. Use: ${PERFIS.join(', ')}.`
    });
  }

  if (data.ativo !== undefined && typeof data.ativo !== 'boolean') {
    errors.push({
      field: 'ativo',
      message: 'Ativo deve ser true ou false.'
    });
  }

  return errors;
}

function normalizeEmail(email) {
  if (!email) return email;
  return String(email).trim().toLowerCase();
}

module.exports = {
  createUsuarioValidator,
  updateUsuarioValidator
};
