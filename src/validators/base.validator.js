function requireFields(data, fields) {
  const errors = [];

  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push({ field, message: `${field} is required` });
    }
  }

  return errors;
}

function pickDefined(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
}

function result(data, errors) {
  return {
    valid: errors.length === 0,
    data,
    errors
  };
}

module.exports = {
  requireFields,
  pickDefined,
  result
};
