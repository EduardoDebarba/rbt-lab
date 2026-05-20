const { modelosEquipamentoService } = require('../services/modelosEquipamento.service');

const modelosEquipamentoController = {
  async list(req, res) {
    const modelos = await modelosEquipamentoService.list(req.query);
    res.json(modelos);
  },

  async create(req, res) {
    const modelo = await modelosEquipamentoService.create(req.body);
    res.status(201).json(modelo);
  }
};

module.exports = { modelosEquipamentoController };
