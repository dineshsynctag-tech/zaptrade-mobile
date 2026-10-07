import { create } from 'zustand';

import type { AuthTokens, LoginResponse, User } from '@/types/order';
import { deleteSecure, getSecure, setSecure } from './secure-storage';

const KEYS = {
  access: 'zt.accessToken',
  refresh: 'zt.refreshToken',
  user: 'zt.user',
} as const;

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Load tokens from SecureStore on app start. */
  hydrate: () => Promise<void>;
  signIn: (res: LoginResponse) => Promise<void>;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  refreshToken: null,

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        getSecure(KEYS.access),
        getSecure(KEYS.refresh),
        getSecure(KEYS.user),
      ]);
      if (accessToken && refreshToken && userJson) {
        set({ status: 'signedIn', accessToken, refreshToken, user: JSON.parse(userJson) });
        return;
      }
    } catch {
      // Corrupt or unreadable keychain entry: treat as signed out.
    }
    set({ status: 'signedOut' });
  },

  signIn: async ({ accessToken, refreshToken, user }) => {
    await Promise.all([
      setSecure(KEYS.access, accessToken),
      setSecure(KEYS.refresh, refreshToken),
      setSecure(KEYS.user, JSON.stringify(user)),
    ]);
    set({ status: 'signedIn', accessToken, refreshToken, user });
  },

  setTokens: async ({ accessToken, refreshToken }) => {
    await Promise.all([setSecure(KEYS.access, accessToken), setSecure(KEYS.refresh, refreshToken)]);
    set({ accessToken, refreshToken });
  },

  signOut: async () => {
    await Promise.all(Object.values(KEYS).map(deleteSecure));
    set({ status: 'signedOut', accessToken: null, refreshToken: null, user: null });
  },
}));
