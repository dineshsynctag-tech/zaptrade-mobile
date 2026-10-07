import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/**
 * App icon set: SF Symbols on iOS, Material Symbols on Android/web.
 * Add new glyphs here so every screen uses the same names.
 */
const ICONS = {
  reload: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  eye: { ios: 'eye', android: 'visibility', web: 'visibility' },
  eyeOff: { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' },
  close: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  offline: { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  trendDown: { ios: 'arrow.down.right', android: 'trending_down', web: 'trending_down' },
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color: ColorValue;
}

export function Icon({ name, size = 20, color }: IconProps) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} />;
}
