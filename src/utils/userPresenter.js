function sanitizeUsuario(usuario) {
  if (!usuario) return usuario;

  const { senhaHash, ...safeUsuario } = usuario;
  return safeUsuario;
}

function sanitizeUsuarios(usuarios) {
  return usuarios.map(sanitizeUsuario);
}

module.exports = {
  sanitizeUsuario,
  sanitizeUsuarios
};
