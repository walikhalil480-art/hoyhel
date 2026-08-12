import { Router } from 'express';
import {
  registerController,
  loginController,
  refreshTokenController,
  logoutController,
  logoutAllController,
  meController,
  verifyEmailController,
  resendVerificationController,
  forgotPasswordController,
  resetPasswordController,
} from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { authRateLimiter } from '../../middleware/rateLimiter.middleware';
import { recordAuditLog } from '../../middleware/auditLog.middleware';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), recordAuditLog('USER_REGISTERED', 'User'), registerController);
router.post('/login', authRateLimiter, validate(loginSchema), recordAuditLog('USER_LOGIN', 'User'), loginController);
router.post('/refresh', validate(refreshTokenSchema), refreshTokenController);
router.post('/logout', logoutController);
router.post('/logout-all', authenticate, recordAuditLog('LOGOUT_ALL_SESSIONS', 'User'), logoutAllController);
router.get('/me', authenticate, meController);

router.post('/verify-email', authRateLimiter, validate(verifyEmailSchema), recordAuditLog('EMAIL_VERIFIED', 'User'), verifyEmailController);
router.post('/resend-verification', authenticate, authRateLimiter, resendVerificationController);

router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), recordAuditLog('FORGOT_PASSWORD_REQUESTED', 'User'), forgotPasswordController);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), recordAuditLog('PASSWORD_RESET', 'User'), resetPasswordController);

export default router;
