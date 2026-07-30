const { apelidosModelosDashboardService } = require('../services/apelidosModelosDashboard.service');

const apelidosModelosDashboardController = {
  async list(req, res) {
    const aliases = await apelidosModelosDashboardService.list();
    res.json(aliases);
  },

  async replaceAll(req, res) {
    const aliases = await apelidosModelosDashboardService.replaceAll(req.body);
    res.json(aliases);
  }
};

module.exports = { apelidosModelosDashboardController };
