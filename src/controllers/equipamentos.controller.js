const { equipamentoService } = require('../services/equipamentos.service');

const equipamentoController = {
  async list(req, res) {
    const equipamentos = await equipamentoService.list(req.query);
    res.json(equipamentos);
  },

  async exportCsv(req, res) {
    const csv = await equipamentoService.exportCsv(req.query);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="equipamentos.csv"');
    res.send(csv);
  },

  async filterOptions(req, res) {
    const options = await equipamentoService.filterOptions();
    res.json(options);
  },

  async createFilterOption(req, res) {
    const option = await equipamentoService.createFilterOption(req.body);
    res.status(201).json(option);
  },

  async importCsv(req, res) {
    const result = await equipamentoService.importCsv(req.file, getActorId(req));
    res.status(201).json(result);
  },

  async getById(req, res) {
    const equipamento = await equipamentoService.getById(req.params.id);
    res.json(equipamento);
  },

  async create(req, res) {
    const equipamento = await equipamentoService.create(req.body, getActorId(req));
    res.status(201).json(equipamento);
  },

  async update(req, res) {
    const equipamento = await equipamentoService.update(req.params.id, req.body, getActorId(req));
    res.json(equipamento);
  },

  async finalize(req, res) {
    const equipamento = await equipamentoService.finalize(req.params.id, req.body, getActorId(req));
    res.json(equipamento);
  },

  async delete(req, res) {
    const equipamento = await equipamentoService.delete(req.params.id, req.body, getActorId(req));
    res.json(equipamento);
  }
};

function getActorId(req, fallback = null) {
  return (
    req.user?.id ||
    fallback
  );
}

module.exports = { equipamentoController };
