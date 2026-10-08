import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { formatLocalTime } from '@/utils/time';
import { AppText } from './app-text';
import { Icon } from './icon';

/** "Offline · last updated 14:32". Orders can't be changed until back online. */
export function OfflineBanner({ updatedAt }: { updatedAt?: number }) {
  const { colors } = useAppTheme();
  const { bg, fg } = colors.badge.QUEUED;
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: bg }]}>
      <Icon name="offline" size={18} color={fg} />
      <AppText variant="label" weight="medium" style={[styles.text, { color: fg }]}>
        Offline{updatedAt ? ` · last updated ${formatLocalTime(updatedAt)}` : ''}. Changes are disabled.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  text: {
    flex: 1,
  },
});
