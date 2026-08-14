import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
  role?: string;
  roles?: string[];
  isEmailVerified?: boolean;
  isActive?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  isBlocked?: boolean;
  blockedReason?: string;
  isBanned?: boolean;
  banReason?: string;
  status?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  setAuth: (user, accessToken) => {
    // Standardize user object so roles array is always populated safely
    const normalizedUser = {
      ...user,
      roles: user.roles || (user.role ? [user.role] : ['GUEST']),
    };
    localStorage.setItem('accessToken', accessToken);
    set({ user: normalizedUser, accessToken, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
