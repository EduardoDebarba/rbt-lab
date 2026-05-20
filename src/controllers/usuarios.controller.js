const { usuarioService } = require('../services/usuarios.service');

const usuarioController = {
  async list(req, res) {
    const usuarios = await usuarioService.list();
    res.json(usuarios);
  },

  async getById(req, res) {
    const usuario = await usuarioService.getById(req.params.id);
    res.json(usuario);
  },

  async create(req, res) {
    const usuario = await usuarioService.create(req.body);
    res.status(201).json(usuario);
  },

  async update(req, res) {
    const usuario = await usuarioService.update(req.params.id, req.body);
    res.json(usuario);
  }
};

module.exports = { usuarioController };
