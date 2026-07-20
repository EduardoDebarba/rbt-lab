const { Router } = require('express');
const { usuarioController } = require('../controllers/usuarios.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireRole } = require('../middlewares/auth.middleware');
const { createUsuarioValidator, updateUsuarioValidator } = require('../validators/usuarios.validator');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.use(requireRole('ADMIN'));

router.get('/', asyncHandler(usuarioController.list));
router.get('/:id', asyncHandler(usuarioController.getById));
router.post('/', validate(createUsuarioValidator), asyncHandler(usuarioController.create));
router.patch('/:id', validate(updateUsuarioValidator), asyncHandler(usuarioController.update));
router.delete('/:id', asyncHandler(usuarioController.remove));

module.exports = router;
