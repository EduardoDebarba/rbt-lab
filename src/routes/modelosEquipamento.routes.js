const { Router } = require('express');
const { modelosEquipamentoController } = require('../controllers/modelosEquipamento.controller');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireRole } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', asyncHandler(modelosEquipamentoController.list));
router.post('/', requireRole('ADMIN'), asyncHandler(modelosEquipamentoController.create));

module.exports = router;
