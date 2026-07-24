const { PrismaClient } = require('@prisma/client');

const RETRYABLE_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  '$queryRaw',
  '$queryRawUnsafe',
  '$connect'
]);

const TRANSIENT_ERROR_CODES = new Set(['P1001', 'P1002', 'P1017', 'P2024']);
const RETRY_ATTEMPTS = Number(process.env.PRISMA_RETRY_ATTEMPTS || 3);
const RETRY_BASE_DELAY_MS = Number(process.env.PRISMA_RETRY_BASE_DELAY_MS || 400);

const basePrisma = new PrismaClient();
const prisma = withRetry(basePrisma);

function withRetry(target, cache = new WeakMap()) {
  if (!target || typeof target !== 'object') return target;
  if (cache.has(target)) return cache.get(target);

  const proxy = new Proxy(target, {
    get(currentTarget, property, receiver) {
      const value = Reflect.get(currentTarget, property, receiver);

      if (typeof value === 'function') {
        return (...args) => runPrismaOperation(currentTarget, property, value, args);
      }

      return withRetry(value, cache);
    }
  });

  cache.set(target, proxy);
  return proxy;
}

async function runPrismaOperation(target, property, fn, args) {
  const operation = String(property);

  if (!RETRYABLE_OPERATIONS.has(operation)) {
    return fn.apply(target, args);
  }

  let lastError;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await fn.apply(target, args);
    } catch (error) {
      lastError = error;

      if (!isTransientDatabaseError(error) || attempt === RETRY_ATTEMPTS) {
        throw error;
      }

      await wait(RETRY_BASE_DELAY_MS * attempt);
    }
  }

  throw lastError;
}

function isTransientDatabaseError(error) {
  if (!error) return false;
  if (TRANSIENT_ERROR_CODES.has(error.code)) return true;

  const text = `${error.message || ''} ${error.name || ''}`.toLowerCase();

  return (
    text.includes("can't reach database server") ||
    text.includes('connection terminated') ||
    text.includes('connection refused') ||
    text.includes('server closed the connection') ||
    text.includes('socket timeout') ||
    text.includes('timed out')
  );
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = { prisma };
