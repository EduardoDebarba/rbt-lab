const { healthService } = require('../services/health.service');

const healthController = {
  async check(req, res) {
    const result = await healthService.check();
    res.json(result);
  }
};

module.exports = { healthController };
