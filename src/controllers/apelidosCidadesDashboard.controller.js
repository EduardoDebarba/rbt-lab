const { apelidosCidadesDashboardService } = require('../services/apelidosCidadesDashboard.service');

const apelidosCidadesDashboardController = {
  async list(req, res) {
    const aliases = await apelidosCidadesDashboardService.list();
    res.json(aliases);
  },

  async replaceAll(req, res) {
    const aliases = await apelidosCidadesDashboardService.replaceAll(req.body);
    res.json(aliases);
  }
};

module.exports = { apelidosCidadesDashboardController };
