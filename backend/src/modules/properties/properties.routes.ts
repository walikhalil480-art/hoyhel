import { Router } from 'express';
import multer from 'multer';
import {
  searchPropertiesController,
  getPropertyByIdController,
  createPropertyController,
  updatePropertyController,
  uploadPropertyImageController,
  setCoverImageController,
  deletePropertyImageController,
  submitApprovalController,
  unpublishPropertyController,
  republishPropertyController,
  requestRemovalController,
  cancelRemovalController,
  getStatusHistoryController,
} from './properties.controller';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createPropertySchema, updatePropertySchema, searchPropertySchema } from './properties.schema';
import { recordAuditLog } from '../../middleware/auditLog.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype.toLowerCase()) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WEBP) are allowed'));
    }
  },
});

const router = Router();

router.get('/', validate(searchPropertySchema), searchPropertiesController);
router.get('/:id', getPropertyByIdController);
router.get('/:id/status-history', authenticate, getStatusHistoryController);

router.post(
  '/',
  authenticate,
  requireRoles('HOST', 'ADMIN'),
  validate(createPropertySchema),
  recordAuditLog('PROPERTY_CREATE', 'Property'),
  createPropertyController
);

router.put(
  '/:id',
  authenticate,
  requireRoles('HOST', 'ADMIN'),
  validate(updatePropertySchema),
  recordAuditLog('PROPERTY_UPDATE', 'Property'),
  updatePropertyController
);

router.post(
  '/:id/submit-approval',
  authenticate,
  requireRoles('HOST', 'ADMIN'),
  submitApprovalController
);

router.post(
  '/:id/unpublish',
  authenticate,
  requireRoles('HOST', 'ADMIN'),
  unpublishPropertyController
);

router.post(
  '/:id/republish',
  authenticate,
  requireRoles('HOST', 'ADMIN'),
  republishPropertyController
);

router.post(
  '/:id/request-removal',
  authenticate,
  requireRoles('HOST', 'ADMIN'),
  requestRemovalController
);

router.post(
  '/:id/cancel-removal',
  authenticate,
  requireRoles('HOST', 'ADMIN'),
  cancelRemovalController
);

router.post(
  '/:id/images',
  authenticate,
  requireRoles('HOST', 'ADMIN'),
  upload.any(),
  uploadPropertyImageController
);

router.patch(
  '/:id/images/:imageId/cover',
  authenticate,
  requireRoles('HOST', 'ADMIN'),
  setCoverImageController
);

router.delete(
  '/:id/images/:imageId',
  authenticate,
  requireRoles('HOST', 'ADMIN'),
  deletePropertyImageController
);

export default router;
