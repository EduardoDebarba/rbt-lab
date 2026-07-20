const { Router } = require('express');
const multer = require('multer');
const { equipamentoController } = require('../controllers/equipamentos.controller');
const { validate } = require('../middlewares/validate.middleware');
const {
  createEquipamentoValidator,
  updateEquipamentoValidator,
  finalizarEquipamentoValidator,
  deleteEquipamentoValidator
} = require('../validators/equipamentos.validator');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireRole } = require('../middlewares/auth.middleware');

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter(req, file, callback) {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv')
    ) {
      callback(null, true);
      return;
    }

    const error = new Error('Envie um arquivo CSV valido.');
    error.statusCode = 400;
    callback(error);
  }
});

router.get('/', asyncHandler(equipamentoController.list));
router.get('/export.csv', asyncHandler(equipamentoController.exportCsv));
router.get('/filtros-opcoes', asyncHandler(equipamentoController.filterOptions));
router.post('/filtros-opcoes', requireRole('ADMIN'), asyncHandler(equipamentoController.createFilterOption));
router.post('/import.csv', requireRole('ADMIN'), upload.single('file'), asyncHandler(equipamentoController.importCsv));
router.post('/:id/finalizar', requireRole('ADMIN'), validate(finalizarEquipamentoValidator), asyncHandler(equipamentoController.finalize));
router.get('/:id', asyncHandler(equipamentoController.getById));
router.post('/', requireRole('ADMIN'), validate(createEquipamentoValidator), asyncHandler(equipamentoController.create));
router.patch('/:id', requireRole('ADMIN'), validate(updateEquipamentoValidator), asyncHandler(equipamentoController.update));
router.delete('/:id', requireRole('ADMIN'), validate(deleteEquipamentoValidator), asyncHandler(equipamentoController.delete));

module.exports = router;
