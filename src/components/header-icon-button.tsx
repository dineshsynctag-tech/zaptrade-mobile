import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { radius, TOUCH_TARGET } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { Icon, type IconName } from './icon';

interface HeaderIconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}

/** Round icon button for the gradient header. */
export function HeaderIconButton({ icon, label, onPress, busy, disabled }: HeaderIconButtonProps) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled }}
      onPress={onPress}
      disabled={busy || disabled}
      style={({ pressed }) => [styles.button, { backgroundColor: colors.onGradientFill, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
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
  },
});
