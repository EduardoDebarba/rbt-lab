const { Router } = require('express');
const { modelosEquipamentoController } = require('../controllers/modelosEquipamento.controller');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireRole } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', asyncHandler(modelosEquipamentoController.list));
router.get('/valores', asyncHandler(modelosEquipamentoController.listValores));
router.post('/', requireRole('ADMIN'), asyncHandler(modelosEquipamentoController.create));
router.patch('/:id/valor', requireRole('ADMIN'), asyncHandler(modelosEquipamentoController.updateValor));

module.exports = router;
