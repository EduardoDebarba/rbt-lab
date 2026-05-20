const { Router } = require('express');

const { dashboardController } = require('../controllers/dashboard.controller');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.get('/', asyncHandler(dashboardController.metrics));
router.get('/export.csv', asyncHandler(dashboardController.exportCsv));

module.exports = router;
