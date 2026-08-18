const { Router } = require('express');

const { guiaController } = require('../controllers/guia.controller');
const { requireRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createGuiaSecaoValidator, updateGuiaSecaoValidator } = require('../validators/guia.validator');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.get('/', asyncHandler(guiaController.list));
router.post('/', requireRole('ADMIN'), validate(createGuiaSecaoValidator), asyncHandler(guiaController.create));
router.patch('/:id', requireRole('ADMIN'), validate(updateGuiaSecaoValidator), asyncHandler(guiaController.update));

module.exports = router;
