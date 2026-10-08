import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { AppText } from './app-text';

/** Translucent stat tile on the gradient header. */
export function HeaderStat({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.onGradientFill }]}>
      <AppText variant="caption" tone="onGradientMuted" numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="heading" weight="bold" tone="onGradient" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
}

export function HeaderStats({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
