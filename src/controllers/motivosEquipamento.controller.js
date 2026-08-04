const { motivosEquipamentoService } = require('../services/motivosEquipamento.service');

const motivosEquipamentoController = {
  async list(req, res) {
    const motivos = await motivosEquipamentoService.list(req.query);
    res.json(motivos);
  },

  async listUso(req, res) {
    const motivos = await motivosEquipamentoService.listUso(req.query);
    res.json(motivos);
  },

  async create(req, res) {
    const motivo = await motivosEquipamentoService.create(req.body);
    res.status(201).json(motivo);
  },

  async rename(req, res) {
    const motivo = await motivosEquipamentoService.rename(req.params.id, req.body);
    res.json(motivo);
  }
};

module.exports = { motivosEquipamentoController };
