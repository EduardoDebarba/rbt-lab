const { cabosRedeService } = require('../services/cabosRede.service');

const cabosRedeController = {
  async list(req, res) {
    const cabos = await cabosRedeService.list();
    res.json(cabos);
  },

  async create(req, res) {
    const cabo = await cabosRedeService.create(req.body);
    res.status(201).json(cabo);
  },

  async update(req, res) {
    const cabo = await cabosRedeService.update(req.params.id, req.body);
    res.json(cabo);
  },

  async delete(req, res) {
    const result = await cabosRedeService.delete(req.params.id);
    res.json(result);
  }
};

module.exports = { cabosRedeController };
