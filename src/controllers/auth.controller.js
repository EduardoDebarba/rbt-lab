const { authService } = require('../services/auth.service');

const authController = {
  async register(req, res) {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  },

  async login(req, res) {
    const result = await authService.login(req.body);
    res.json(result);
  },

  async me(req, res) {
    const usuario = await authService.getAuthenticatedUser(req.user.id);
    res.json(usuario);
  }
};

module.exports = { authController };
