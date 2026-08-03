const { Router } = require('express');

const { dashboardController } = require('../controllers/dashboard.controller');
const { apelidosModelosDashboardController } = require('../controllers/apelidosModelosDashboard.controller');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireRole } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/modelos-apelidos', asyncHandler(apelidosModelosDashboardController.list));
router.put('/modelos-apelidos', requireRole('ADMIN'), asyncHandler(apelidosModelosDashboardController.replaceAll));
router.get('/', asyncHandler(dashboardController.metrics));
router.get('/vendas', asyncHandler(dashboardController.vendas));
router.get('/financeiro', asyncHandler(dashboardController.financeiro));
router.get('/equipamentos-laboratorio', asyncHandler(dashboardController.equipamentosLaboratorio));
router.get('/relatorio-diario/export.csv', asyncHandler(dashboardController.exportRelatorioDiarioCsv));
router.get('/relatorio-diario', asyncHandler(dashboardController.relatorioDiario));
router.get('/export.csv', asyncHandler(dashboardController.exportCsv));

module.exports = router;
