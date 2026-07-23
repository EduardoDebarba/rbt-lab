const { equipeCidadeService } = require('../services/equipesCidades.service');

const equipeCidadeController = {
  async list(req, res) {
    const rows = await equipeCidadeService.list(req.query);
    res.json(rows);
  },

  async getById(req, res) {
    const row = await equipeCidadeService.getById(req.params.id);
    res.json(row);
  },

  async create(req, res) {
    const row = await equipeCidadeService.create(req.body);
    res.status(201).json(row);
  },

  async update(req, res) {
    const row = await equipeCidadeService.update(req.params.id, req.body);
    res.json(row);
  },

  async remove(req, res) {
    const result = await equipeCidadeService.remove(req.params.id);
    res.json(result);
  }
};

module.exports = { equipeCidadeController };
