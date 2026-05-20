const { Router } = require('express');
const { historicoController } = require('../controllers/historico.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createHistoricoValidator } = require('../validators/historico.validator');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.get('/', asyncHandler(historicoController.list));
router.get('/:id', asyncHandler(historicoController.getById));
router.post('/', validate(createHistoricoValidator), asyncHandler(historicoController.create));

module.exports = router;
