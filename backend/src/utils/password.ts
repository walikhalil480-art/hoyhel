import bcrypt from 'bcryptjs';
import { ValidationError } from './errors';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  validatePasswordComplexity(password);
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordComplexity(password: string): void {
  if (!password || password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    throw new ValidationError('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new ValidationError('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    throw new ValidationError('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    throw new ValidationError('Password must contain at least one special character');
  }
}
