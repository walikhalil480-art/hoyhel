import { Request, Response } from 'express';
import { UserService } from './user.service';
import { asyncHandler } from '../../utils/asyncHandler';

const userService = new UserService();

export const changePasswordController = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const result = await userService.changePassword(req.user!.userId, currentPassword, newPassword);
  return res.json(result);
});

export const updateProfileController = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateProfile(req.user!.userId, req.body);
  return res.json({ success: true, message: 'Profile updated successfully', data: user });
});

export const applyForHostController = asyncHandler(async (req: Request, res: Response) => {
  const application = await userService.applyForHost(req.user!.userId, req.body);
  return res.status(201).json({
    success: true,
    message: 'Host application submitted for admin review',
    data: application,
  });
});

export const getSessionsController = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await userService.getUserSessions(req.user!.userId);
  return res.json({ success: true, data: sessions });
});

export const revokeSessionController = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.revokeSession(req.user!.userId, req.params.sessionId);
  return res.json(result);
});

export const getProfileController = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getProfile(req.user!.userId);
  return res.json({ success: true, data: user });
});

export const deactivateAccountController = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.deactivateAccount(req.user!.userId);
  res.clearCookie('refreshToken');
  res.clearCookie('accessToken');
  return res.json(result);
});

