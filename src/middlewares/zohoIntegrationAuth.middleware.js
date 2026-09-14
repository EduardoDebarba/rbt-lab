const crypto = require('crypto');

const { env } = require('../config/env');
const { HttpError } = require('../utils/httpError');

function zohoIntegrationAuth(req, res, next) {
  const expectedToken = env.zohoIntegrationToken;

  if (!expectedToken) {
    next(new HttpError(500, 'Token da integracao Zoho nao configurado.'));
    return;
  }

  const receivedToken = extractIntegrationToken(req);

  if (!receivedToken || !safeTokenEquals(receivedToken, expectedToken)) {
    next(new HttpError(401, 'Token da integracao Zoho invalido.'));
    return;
  }

  next();
}

function extractIntegrationToken(req) {
  const explicitHeader = req.headers['x-zoho-integration-token'];
  if (explicitHeader) return String(explicitHeader);

  const authorization = req.headers.authorization;
  if (!authorization) return null;

  const [type, token] = authorization.split(' ');
  if (type !== 'Bearer' || !token) return null;

  return token;
}

function safeTokenEquals(receivedToken, expectedToken) {
  const received = Buffer.from(receivedToken);
  const expected = Buffer.from(expectedToken);

  if (received.length !== expected.length) return false;

  return crypto.timingSafeEqual(received, expected);
}

module.exports = { zohoIntegrationAuth };
