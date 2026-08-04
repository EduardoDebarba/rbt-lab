const { Router } = require('express');
const { motivosEquipamentoController } = require('../controllers/motivosEquipamento.controller');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireRole } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', asyncHandler(motivosEquipamentoController.list));
router.get('/uso', asyncHandler(motivosEquipamentoController.listUso));
router.post('/', requireRole('ADMIN'), asyncHandler(motivosEquipamentoController.create));
router.patch('/:id/renomear', requireRole('ADMIN'), asyncHandler(motivosEquipamentoController.rename));

module.exports = router;
