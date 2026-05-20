const { motivosEquipamentoService } = require('../services/motivosEquipamento.service');

const motivosEquipamentoController = {
  async list(req, res) {
    const motivos = await motivosEquipamentoService.list(req.query);
    res.json(motivos);
  },

  async create(req, res) {
    const motivo = await motivosEquipamentoService.create(req.body);
    res.status(201).json(motivo);
  }
};

module.exports = { motivosEquipamentoController };
