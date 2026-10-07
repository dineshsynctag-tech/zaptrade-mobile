import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { radius, spacing, TOUCH_TARGET } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { AppText } from './app-text';

/**
 * Full-width pill button.
 *  - gradient: brand gradient fill, white text (primary on white surfaces)
 *  - outline:  white outline, for use on the gradient
 *  - solid:    white fill, dark text, for use on the gradient
 */
type Variant = 'gradient' | 'outline' | 'solid';

interface PillButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PillButton({
  title,
  onPress,
  variant = 'gradient',
  loading = false,
  disabled = false,
  style,
}: PillButtonProps) {
  const { colors } = useAppTheme();
  const inactive = disabled || loading;
  const textColor = variant === 'solid' ? colors.text : colors.textOnGradient;

  const label = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <AppText
      variant="label"
      weight="bold"
      style={[styles.label, { color: textColor }]}>
      {title.toUpperCase()}
    </AppText>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        { opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {variant === 'gradient' ? (
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}>
          {label}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.fill,
            variant === 'outline'
              ? { borderWidth: 1.5, borderColor: colors.textOnGradient }
              : { backgroundColor: colors.surface },
          ]}>
          {label}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    minHeight: TOUCH_TARGET + 8,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  label: {
    letterSpacing: 1.6,
  },
});
