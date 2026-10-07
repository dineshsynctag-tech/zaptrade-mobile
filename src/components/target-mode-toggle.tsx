import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, TOUCH_TARGET } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { TargetMode } from '@/utils/order-form';
import { AppText } from './app-text';

const OPTIONS: { value: TargetMode; label: string }[] = [
  { value: 'pct', label: 'Profit %' },
  { value: 'sell', label: 'Sell Price' },
];

export function TargetModeToggle({
  value,
  onChange,
}: {
  value: TargetMode;
  onChange: (mode: TargetMode) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      {OPTIONS.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.option, selected && { backgroundColor: colors.accent }]}>
            <AppText
              variant="label"
              weight="semibold"
              style={{ color: selected ? colors.textOnGradient : colors.textMuted }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xxs,
  },
  option: {
    flex: 1,
    minHeight: TOUCH_TARGET - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
