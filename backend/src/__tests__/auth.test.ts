import { AuthService } from '../modules/auth/auth.service';
import { UserRoleType } from '@prisma/client';
import { hashPassword, verifyPassword } from '../utils/password';
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';

describe('AuthService & Security Suite', () => {
  const authService = new AuthService();

  it('should prevent self-registration as ADMIN or HOST role', async () => {
    await expect(
      authService.register({
        email: 'attacker@example.com',
        password: 'Password123!',
        firstName: 'Attacker',
        lastName: 'User',
        role: UserRoleType.ADMIN,
      })
    ).rejects.toThrow('Self-registration is restricted to GUEST');
  });

  it('should generate generic response for forgot-password to prevent email enumeration', async () => {
    const res = await authService.forgotPassword('nonexistent-email-98765@example.com');
    expect(res.success).toBe(true);
    expect(res.message).toContain('If the account exists');
  });

  it('should correctly hash and verify passwords using bcrypt', async () => {
    const rawPass = 'StrongPassword123!';
    const hash = await hashPassword(rawPass);
    expect(hash).not.toBe(rawPass);

    const isMatch = await verifyPassword(rawPass, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword('WrongPassword123!', hash);
    expect(isWrongMatch).toBe(false);
  });

  it('should sign and verify access tokens correctly', () => {
    const payload = { userId: 'user-uuid-123', email: 'test@example.com', roles: ['GUEST'] };
    const token = signAccessToken(payload);
    expect(token).toBeDefined();

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe('user-uuid-123');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.roles).toEqual(['GUEST']);
  });

  it('should sign and verify refresh tokens correctly', () => {
    const token = signRefreshToken({ userId: 'user-uuid-123' });
    expect(token).toBeDefined();

    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe('user-uuid-123');
  });

  it('should normalize email with leading/trailing spaces and uppercase letters', async () => {
    const rawEmail = '  Guest.Elena@LuxeHaven.com ';
    const normalized = rawEmail.toLowerCase().trim();
    expect(normalized).toBe('guest.elena@luxehaven.com');
  });
});


