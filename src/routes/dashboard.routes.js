const { Router } = require('express');

const { dashboardController } = require('../controllers/dashboard.controller');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.get('/', asyncHandler(dashboardController.metrics));
router.get('/vendas', asyncHandler(dashboardController.vendas));
router.get('/equipamentos-laboratorio', asyncHandler(dashboardController.equipamentosLaboratorio));
router.get('/relatorio-diario/export.csv', asyncHandler(dashboardController.exportRelatorioDiarioCsv));
router.get('/relatorio-diario', asyncHandler(dashboardController.relatorioDiario));
router.get('/export.csv', asyncHandler(dashboardController.exportCsv));

module.exports = router;
