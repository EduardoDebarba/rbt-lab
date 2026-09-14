const { Router } = require('express');

const { integracoesZohoController } = require('../controllers/integracoesZoho.controller');
const { zohoIntegrationAuth } = require('../middlewares/zohoIntegrationAuth.middleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.post('/zoho/equipamentos', zohoIntegrationAuth, asyncHandler(integracoesZohoController.syncEquipment));

module.exports = router;
