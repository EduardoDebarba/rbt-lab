const { pickDefined, requireFields, result } = require('./base.validator');

const PERFIS = ['ADMIN', 'TECNICO'];

function registerValidator(body) {
  const data = pickDefined({
    nome: body.nome,
    email: normalizeEmail(body.email),
    senha: body.senha,
    perfil: body.perfil || 'TECNICO'
  });

  const errors = requireFields(data, ['nome', 'email', 'senha']);

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

  return result(data, errors);
}

function loginValidator(body) {
  const data = pickDefined({
    email: normalizeEmail(body.email),
    senha: body.senha
  });

  const errors = requireFields(data, ['email', 'senha']);
  return result(data, errors);
}

function normalizeEmail(email) {
  if (!email) return email;
  return String(email).trim().toLowerCase();
}

module.exports = {
  registerValidator,
  loginValidator,
  PERFIS
};
