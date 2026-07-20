const { Router } = require('express');

const { cabosRedeController } = require('../controllers/cabosRede.controller');
const { requireRole } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.get('/', asyncHandler(cabosRedeController.list));
router.post('/', requireRole('ADMIN', 'TECNICO'), asyncHandler(cabosRedeController.create));
router.patch('/:id', requireRole('ADMIN', 'TECNICO'), asyncHandler(cabosRedeController.update));
router.delete('/:id', requireRole('ADMIN', 'TECNICO'), asyncHandler(cabosRedeController.delete));

module.exports = router;
