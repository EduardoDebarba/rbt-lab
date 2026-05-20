const { Router } = require('express');
const { healthController } = require('../controllers/health.controller');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.get('/', asyncHandler(healthController.check));

module.exports = router;
