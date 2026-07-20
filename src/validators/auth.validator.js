const { pickDefined, requireFields, result } = require('./base.validator');

const PERFIS = ['ADMIN', 'TECNICO'];
const EMAIL_DOMAIN = '@rbt.psi.br';

function registerValidator(body) {
  const data = pickDefined({
    email: normalizeEmail(body.email)
  });

  const errors = requireFields(data, ['email']);
  errors.push(...validateEmailDomain(data.email));

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

function validateEmailDomain(email) {
  if (!email || email.endsWith(EMAIL_DOMAIN)) return [];

  return [
    {
      field: 'email',
      message: `O e-mail deve pertencer ao dominio ${EMAIL_DOMAIN}.`
    }
  ];
}

module.exports = {
  registerValidator,
  loginValidator,
  PERFIS,
  EMAIL_DOMAIN,
  validateEmailDomain
};
