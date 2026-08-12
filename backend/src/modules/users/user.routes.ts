import { Router } from 'express';
import {
  changePasswordController,
  getProfileController,
  updateProfileController,
  applyForHostController,
  getSessionsController,
  revokeSessionController,
  deactivateAccountController,
} from './user.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { recordAuditLog } from '../../middleware/auditLog.middleware';

const router = Router();

router.use(authenticate);

router.get('/me', getProfileController);
router.patch('/me', recordAuditLog('PROFILE_UPDATED', 'User'), updateProfileController);
router.post('/change-password', recordAuditLog('PASSWORD_CHANGED', 'User'), changePasswordController);
router.post('/apply-host', recordAuditLog('HOST_APPLICATION_SUBMITTED', 'HostApplication'), applyForHostController);
router.get('/me/sessions', getSessionsController);
router.delete('/me/sessions/:sessionId', recordAuditLog('SESSION_REVOKED', 'UserSession'), revokeSessionController);
router.post('/me/deactivate', recordAuditLog('USER_DEACTIVATED', 'User'), deactivateAccountController);

export default router;

