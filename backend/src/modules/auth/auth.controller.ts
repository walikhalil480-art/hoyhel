import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { asyncHandler } from '../../utils/asyncHandler';

const authService = new AuthService();

export const registerController = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(201).json({
    success: true,
    message: 'User registered successfully. Please verify your email.',
    data: result,
  });
});

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, req.ip, req.headers['user-agent']);

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

export const refreshTokenController = asyncHandler(async (req: Request, res: Response) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  const result = await authService.refreshTokens(token);

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    success: true,
    message: 'Tokens refreshed successfully',
    data: result,
  });
});

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  await authService.logout(token);

  res.clearCookie('refreshToken');
  res.clearCookie('accessToken');

  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export const logoutAllController = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAll(req.user!.userId);

  res.clearCookie('refreshToken');
  res.clearCookie('accessToken');

  return res.json({
    success: true,
    message: 'Logged out from all sessions',
  });
});

export const meController = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.userId);
  return res.json({
    success: true,
    data: user,
  });
});

export const verifyEmailController = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const result = await authService.verifyEmail(token);
  return res.json(result);
});

export const resendVerificationController = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.resendVerificationEmail(req.user!.userId);
  return res.json(result);
});

export const forgotPasswordController = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  return res.json(result);
});

export const resetPasswordController = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  const result = await authService.resetPassword(token, newPassword);
  return res.json(result);
});
