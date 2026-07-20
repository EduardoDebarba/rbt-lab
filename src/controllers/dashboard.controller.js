const { dashboardService } = require('../services/dashboard.service');

const dashboardController = {
  async metrics(req, res) {
    const data = await dashboardService.getMetrics(req.query);
    res.json(data);
  },

  async vendas(req, res) {
    const data = await dashboardService.getVendas(req.query);
    res.json(data);
  },

  async equipamentosLaboratorio(req, res) {
    const data = await dashboardService.getEquipamentosLaboratorio(req.query);
    res.json(data);
  },

  async relatorioDiario(req, res) {
    const data = await dashboardService.getRelatorioDiario(req.query);
    res.json(data);
  },

  async exportRelatorioDiarioCsv(req, res) {
    const csv = await dashboardService.exportRelatorioDiarioCsv(req.query);
    const dataInicial = req.query.dataInicial || req.query.data || 'inicio';
    const dataFinal = req.query.dataFinal || req.query.data || 'fim';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-equipamentos-${dataInicial}-a-${dataFinal}.csv"`);
    res.send(csv);
  },

  async exportCsv(req, res) {
    const csv = await dashboardService.exportCsv(req.query);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dashboard-equipamentos.csv"');
    res.send(csv);
  }
};

module.exports = { dashboardController };
