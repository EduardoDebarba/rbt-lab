const { guiaService } = require('../services/guia.service');

const guiaController = {
  async list(req, res) {
    const secoes = await guiaService.list();
    res.json(secoes);
  },

  async create(req, res) {
    const secao = await guiaService.create(req.body);
    res.status(201).json(secao);
  },

  async update(req, res) {
    const secao = await guiaService.update(req.params.id, req.body);
    res.json(secao);
  }
};

module.exports = { guiaController };
