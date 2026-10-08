import { create } from 'zustand';
import { Appearance, Platform } from 'react-native';

import type { NotificationKind } from '@/utils/notification-text';
import { getSecure, setSecure } from './secure-storage';

const KEY = 'zt.prefs';

export type ThemePref = 'system' | 'light' | 'dark';

export interface Prefs {
  /** Per-type push toggles. Sent to the server with the device token. */
  notify: Record<NotificationKind, boolean>;
  /** Require Face ID / fingerprint on open and before placing, editing or deleting. */
  biometricLock: boolean;
  /** Pre-filled on the new-order form. Empty qty = no default. */
  defaultQty: string;
  defaultProfitPct: string;
  theme: ThemePref;
}

const DEFAULTS: Prefs = {
  notify: { BUY_FILLED: true, SELL_FILLED: true, REJECTED: true, EXPIRED: true },
  biometricLock: false,
  defaultQty: '',
  defaultProfitPct: '0.25',
  theme: 'system',
};

/** Native controls (switches, alerts, pickers) follow the app's theme choice too. */
function applyTheme(theme: ThemePref) {
  if (Platform.OS === 'web') return;
  Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
}

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
    applyTheme(get().theme);
    set({ hydrated: true });
  },

  update: (patch) => {
    set(patch);
    if (patch.theme) applyTheme(patch.theme);
    const { notify, biometricLock, defaultQty, defaultProfitPct, theme } = get();
    const prefs: Prefs = { notify, biometricLock, defaultQty, defaultProfitPct, theme };
    setSecure(KEY, JSON.stringify(prefs)).catch(() => {});
  },
}));
