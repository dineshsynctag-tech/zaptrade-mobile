import { useColorScheme } from 'react-native';

import { usePrefsStore } from '@/store/prefs';
import { colors, type Theme } from './theme';

export function useAppTheme(): Theme {
  const system = useColorScheme();
  const pref = usePrefsStore((s) => s.theme);
  const scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return { scheme, colors: colors[scheme] };
}
