import { Router, Request, Response } from 'express';
import { AdminService } from './admin.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';
import { recordAuditLog } from '../../middleware/auditLog.middleware';
import { UserRoleType, HostApplicationStatus, BookingStatus, PaymentStatus } from '@prisma/client';

const router = Router();
const adminService = new AdminService();

router.use(authenticate, requireRoles('ADMIN'));

router.get(
  '/analytics',
  asyncHandler(async (req: Request, res: Response) => {
    const analytics = await adminService.getDashboardAnalytics();
    return res.json({ success: true, data: analytics });
  })
);

// Admin Booking Management Routes
router.get(
  '/bookings',
  asyncHandler(async (req: Request, res: Response) => {
    const { search, status, paymentStatus, page, limit } = req.query;
    const result = await adminService.getAdminBookings({
      search: search as string,
      status: status as BookingStatus,
      paymentStatus: paymentStatus as PaymentStatus,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
    return res.json({
      success: true,
      data: result.bookings,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  })
);

router.get(
  '/bookings/:id',
  recordAuditLog('ADMIN_VIEW_BOOKING', 'Booking'),
  asyncHandler(async (req: Request, res: Response) => {
    const booking = await adminService.getAdminBookingById(req.params.id);
    return res.json({ success: true, data: booking });
  })
);

router.post(
  '/bookings/:id/cancel',
  recordAuditLog('ADMIN_CANCEL_BOOKING', 'Booking'),
  asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;
    const booking = await adminService.cancelBookingByAdmin(req.params.id, req.user!.userId, reason);
    return res.json({ success: true, message: 'Booking cancelled by Administrator', data: booking });
  })
);

// User Management Routes
router.get(
  '/users',
  asyncHandler(async (req: Request, res: Response) => {
    const { search, role, isSuspended, page, limit } = req.query;
    const result = await adminService.getUsers({
      search: search as string,
      role: role as UserRoleType,
      isSuspended: isSuspended === 'true' ? true : isSuspended === 'false' ? false : undefined,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
    return res.json({ success: true, data: result.users, meta: { total: result.total, page: result.page, totalPages: result.totalPages } });
  })
);

router.get(
  '/users/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await adminService.getUserById(req.params.id);
    return res.json({ success: true, data: user });
  })
);

router.patch(
  '/users/:id/status',
  recordAuditLog('USER_STATUS_CHANGED', 'User'),
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await adminService.updateUserStatus(req.params.id, req.body);
    return res.json({ success: true, message: 'User status updated', data: updated });
  })
);

router.patch(
  '/users/:id/role',
  recordAuditLog('ROLE_CHANGED', 'User'),
  asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.body;
    const updated = await adminService.updateUserRole(req.user!.userId, req.params.id, role);
    return res.json({ success: true, message: 'User role updated', data: updated });
  })
);

router.delete(
  '/users/:id',
  recordAuditLog('USER_DELETED', 'User'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.deleteUser(req.user!.userId, req.params.id);
    return res.json(result);
  })
);

// Host Onboarding Review Routes
router.get(
  '/host-applications',
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as HostApplicationStatus;
    const apps = await adminService.getHostApplications(status);
    return res.json({ success: true, data: apps });
  })
);

router.patch(
  '/host-applications/:id/review',
  recordAuditLog('HOST_APPLICATION_REVIEWED', 'HostApplication'),
  asyncHandler(async (req: Request, res: Response) => {
    const { isApproved, rejectionReason } = req.body;
    const app = await adminService.reviewHostApplication(req.user!.userId, req.params.id, isApproved === true, rejectionReason);
    return res.json({ success: true, message: `Host application ${app.status}`, data: app });
  })
);

// Property Approvals
router.get(
  '/properties',
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query;
    const result = await adminService.getAdminProperties({
      status: status as any,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
    return res.json({
      success: true,
      data: result.properties,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  })
);

router.post(
  '/properties/:id/approve',
  recordAuditLog('PROPERTY_APPROVE', 'Property'),
  asyncHandler(async (req: Request, res: Response) => {
    const property = await adminService.approveProperty(req.user!.userId, req.params.id);
    return res.json({ success: true, message: 'Property approved and published', data: property });
  })
);

router.post(
  '/properties/:id/reject',
  recordAuditLog('PROPERTY_REJECT', 'Property'),
  asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;
    const property = await adminService.rejectProperty(req.user!.userId, req.params.id, reason);
    return res.json({ success: true, message: 'Property rejected with feedback', data: property });
  })
);

router.get(
  '/removal-requests',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await adminService.getRemovalRequests(page, limit);
    return res.json({
      success: true,
      data: result.properties,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  })
);

router.post(
  '/removal-requests/:id/approve',
  recordAuditLog('PROPERTY_REMOVAL_APPROVE', 'Property'),
  asyncHandler(async (req: Request, res: Response) => {
    const property = await adminService.approveRemovalRequest(req.user!.userId, req.params.id);
    return res.json({ success: true, message: 'Property removal approved and archived', data: property });
  })
);

router.post(
  '/removal-requests/:id/reject',
  recordAuditLog('PROPERTY_REMOVAL_REJECT', 'Property'),
  asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;
    const property = await adminService.rejectRemovalRequest(req.user!.userId, req.params.id, reason);
    return res.json({ success: true, message: 'Property removal request declined', data: property });
  })
);

router.post(
  '/properties/:id/archive',
  recordAuditLog('PROPERTY_ARCHIVE', 'Property'),
  asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;
    const property = await adminService.archiveProperty(req.user!.userId, req.params.id, reason);
    return res.json({ success: true, message: 'Property archived', data: property });
  })
);

router.post(
  '/properties/:id/restore',
  recordAuditLog('PROPERTY_RESTORE', 'Property'),
  asyncHandler(async (req: Request, res: Response) => {
    const property = await adminService.restoreProperty(req.user!.userId, req.params.id);
    return res.json({ success: true, message: 'Property restored to DRAFT state', data: property });
  })
);

router.delete(
  '/properties/:id/hard-delete',
  recordAuditLog('PROPERTY_HARD_DELETE', 'Property'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.hardDeleteProperty(req.user!.userId, req.params.id);
    return res.json(result);
  })
);

router.get(
  '/audit-logs',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await adminService.getAuditLogs(page, limit);
    return res.json({ success: true, data: result.logs, meta: { total: result.total, page, totalPages: result.totalPages } });
  })
);

export default router;
