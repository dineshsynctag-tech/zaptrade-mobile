import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { radius, TOUCH_TARGET } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { Icon, type IconName } from './icon';

interface HeaderIconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  busy?: boolean;
}

/** Round icon button for the gradient header. */
export function HeaderIconButton({ icon, label, onPress, busy }: HeaderIconButtonProps) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy }}
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.7 : 1 }]}>
      {busy ? (
        <ActivityIndicator color={colors.textOnGradient} />
      ) : (
        <Icon name={icon} color={colors.textOnGradient} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});
