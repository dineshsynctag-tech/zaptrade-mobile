import { create } from 'zustand';

import type { NotificationKind } from '@/utils/notification-text';
import { getSecure, setSecure } from './secure-storage';

const KEY = 'zt.prefs';

export interface Prefs {
  /** Per-type push toggles. Sent to the server with the device token. */
  notify: Record<NotificationKind, boolean>;
  /** Require Face ID / fingerprint on open and before placing, editing or deleting. */
  biometricLock: boolean;
}

const DEFAULTS: Prefs = {
  notify: { BUY_FILLED: true, SELL_FILLED: true, REJECTED: true, EXPIRED: true },
  biometricLock: false,
};

interface PrefsState extends Prefs {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (patch: Partial<Prefs>) => void;
}

export const usePrefsStore = create<PrefsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await getSecure(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Prefs>;
        set({ ...DEFAULTS, ...saved, notify: { ...DEFAULTS.notify, ...saved.notify } });
      }
    } catch {
      // Fall back to defaults.
    }
    set({ hydrated: true });
  },

  update: (patch) => {
    set(patch);
    const { notify, biometricLock } = get();
    setSecure(KEY, JSON.stringify({ notify, biometricLock })).catch(() => {});
  },
}));
