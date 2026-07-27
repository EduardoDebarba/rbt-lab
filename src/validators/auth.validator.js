const { pickDefined, requireFields, result } = require('./base.validator');

const PERFIS = ['ADMIN', 'TECNICO'];
const EMAIL_DOMAIN = '@rbt.psi.br';

function registerValidator(body) {
  const data = pickDefined({
    email: normalizeEmail(body.email),
    senha: body.senha
  });

  const errors = requireFields(data, ['email', 'senha']);
  errors.push(...validateEmailDomain(data.email));
  errors.push(...validatePassword(data.senha));

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

function forgotPasswordValidator(body) {
  const data = pickDefined({
    email: normalizeEmail(body.email)
  });

  const errors = requireFields(data, ['email']);
  errors.push(...validateEmailDomain(data.email));

  return result(data, errors);
}

function resetPasswordValidator(body) {
  const data = pickDefined({
    email: normalizeEmail(body.email),
    codigo: normalizeCode(body.codigo),
    senha: body.senha
  });

  const errors = requireFields(data, ['email', 'codigo', 'senha']);
  errors.push(...validateEmailDomain(data.email));
  errors.push(...validatePassword(data.senha));

  if (data.codigo && !/^\d{6}$/.test(data.codigo)) {
    errors.push({
      field: 'codigo',
      message: 'Codigo deve ter 6 digitos.'
    });
  }

  return result(data, errors);
}

function normalizeEmail(email) {
  if (!email) return email;
  return String(email).trim().toLowerCase();
}

function normalizeCode(code) {
  if (!code) return code;
  return String(code).replace(/\D/g, '').slice(0, 6);
}

function validatePassword(password) {
  if (!password || String(password).length >= 6) return [];

  return [
    {
      field: 'senha',
      message: 'Senha deve ter pelo menos 6 caracteres.'
    }
  ];
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
  forgotPasswordValidator,
  resetPasswordValidator,
  PERFIS,
  EMAIL_DOMAIN,
  validateEmailDomain
};
