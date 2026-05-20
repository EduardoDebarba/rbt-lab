const { Router } = require('express');
const { modelosEquipamentoController } = require('../controllers/modelosEquipamento.controller');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.get('/', asyncHandler(modelosEquipamentoController.list));
router.post('/', asyncHandler(modelosEquipamentoController.create));

module.exports = router;
