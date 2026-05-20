const { Router } = require('express');
const { motivosEquipamentoController } = require('../controllers/motivosEquipamento.controller');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.get('/', asyncHandler(motivosEquipamentoController.list));
router.post('/', asyncHandler(motivosEquipamentoController.create));

module.exports = router;
