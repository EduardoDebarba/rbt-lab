const { prisma } = require('../config/prisma');

const healthService = {
  async check() {
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      service: 'rbt-lab-api',
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = { healthService };
