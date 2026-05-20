const { Router } = require('express');

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const usuarioRoutes = require('./usuarios.routes');
const equipamentoRoutes = require('./equipamentos.routes');
const modelosEquipamentoRoutes = require('./modelosEquipamento.routes');
const motivosEquipamentoRoutes = require('./motivosEquipamento.routes');
const historicoRoutes = require('./historico.routes');
const dashboardRoutes = require('./dashboard.routes');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

router.use(authMiddleware);
router.use('/dashboard', dashboardRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/modelos-equipamento', modelosEquipamentoRoutes);
router.use('/motivos-equipamento', motivosEquipamentoRoutes);
router.use('/equipamentos', equipamentoRoutes);
router.use('/historico', historicoRoutes);

module.exports = router;
