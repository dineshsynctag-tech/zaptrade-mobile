import { useColorScheme } from 'react-native';

import { colors, type Theme } from './theme';

export function useAppTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: colors[scheme] };
}
