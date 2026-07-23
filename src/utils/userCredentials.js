function getUsernameFromEmail(email) {
  return String(email || '').split('@')[0].trim().toLowerCase();
}

function buildDisplayNameFromEmail(email) {
  return getUsernameFromEmail(email)
    .split(/[._-]+/)
    .filter(Boolean)
    .map(capitalizeNamePart)
    .join(' ');
}

function buildInitialPassword(email) {
  return `${getUsernameFromEmail(email)}@rbt`;
}

function capitalizeNamePart(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

module.exports = {
  buildDisplayNameFromEmail,
  buildInitialPassword,
  getUsernameFromEmail
};
