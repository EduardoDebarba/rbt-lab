const { Router } = require('express');

const { equipeCidadeController } = require('../controllers/equipesCidades.controller');
const { requireRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createEquipeCidadeValidator,
  updateEquipeCidadeValidator
} = require('../validators/equipesCidades.validator');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.get('/', asyncHandler(equipeCidadeController.list));
router.get('/:id', asyncHandler(equipeCidadeController.getById));
router.post('/', requireRole('ADMIN'), validate(createEquipeCidadeValidator), asyncHandler(equipeCidadeController.create));
router.patch('/:id', requireRole('ADMIN'), validate(updateEquipeCidadeValidator), asyncHandler(equipeCidadeController.update));
router.delete('/:id', requireRole('ADMIN'), asyncHandler(equipeCidadeController.remove));

module.exports = router;
