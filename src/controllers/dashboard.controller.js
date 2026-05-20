const { dashboardService } = require('../services/dashboard.service');

const dashboardController = {
  async metrics(req, res) {
    const data = await dashboardService.getMetrics(req.query);
    res.json(data);
  },

  async exportCsv(req, res) {
    const csv = await dashboardService.exportCsv(req.query);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dashboard-equipamentos.csv"');
    res.send(csv);
  }
};

module.exports = { dashboardController };
