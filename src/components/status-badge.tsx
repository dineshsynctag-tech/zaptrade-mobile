import { StyleSheet, View } from 'react-native';

import type { LegStatus } from '@/types/order';
import { radius, spacing } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { AppText } from './app-text';

export function StatusBadge({ status }: { status: LegStatus }) {
  const { colors } = useAppTheme();
  const { bg, fg } = colors.badge[status];
  return (
    <View
      style={[styles.badge, { backgroundColor: bg }]}
      accessibilityLabel={`Status ${status.toLowerCase()}`}>
      <AppText variant="caption" weight="semibold" style={[styles.text, { color: fg }]}>
        {status}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  text: {
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
