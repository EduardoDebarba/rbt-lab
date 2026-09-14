const { zohoIntegracaoService } = require('../services/integracoesZoho.service');

const integracoesZohoController = {
  async syncEquipment(req, res) {
    const result = await zohoIntegracaoService.processEquipmentRow(req.body);
    res.status(200).json(result);
  }
};

module.exports = { integracoesZohoController };
