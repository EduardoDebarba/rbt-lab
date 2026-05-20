const { historicoService } = require('../services/historico.service');

const historicoController = {
  async list(req, res) {
    const historico = await historicoService.list(req.query);
    res.json(historico);
  },

  async getById(req, res) {
    const item = await historicoService.getById(req.params.id);
    res.json(item);
  },

  async create(req, res) {
    const item = await historicoService.create(req.body);
    res.status(201).json(item);
  }
};

module.exports = { historicoController };
