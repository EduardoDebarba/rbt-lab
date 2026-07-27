const { Router } = require('express');

const { authController } = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} = require('../validators/auth.validator');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

router.post('/register', validate(registerValidator), asyncHandler(authController.register));
router.post('/login', validate(loginValidator), asyncHandler(authController.login));
router.post('/forgot-password', validate(forgotPasswordValidator), asyncHandler(authController.forgotPassword));
router.post('/reset-password', validate(resetPasswordValidator), asyncHandler(authController.resetPassword));
router.get('/me', authMiddleware, asyncHandler(authController.me));

module.exports = router;
