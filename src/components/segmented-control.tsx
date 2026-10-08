import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, TOUCH_TARGET } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { AppText } from './app-text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/** Pill-shaped single-select tabs (target mode, history range, theme). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      {options.map((o) => {
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
              numberOfLines={1}
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
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
