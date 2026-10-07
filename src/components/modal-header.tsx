import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, TOUCH_TARGET } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { AppText } from './app-text';

/** Compact gradient header for modal screens, with a Cancel button. */
export function ModalHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  // iOS page-sheet modals don't sit under the status bar.
  const top = Platform.OS === 'ios' ? spacing.lg : insets.top + spacing.sm;

  return (
    <LinearGradient
      colors={colors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: top }]}>
      <View style={styles.row}>
        <View style={styles.titles}>
          <AppText variant="title" weight="bold" tone="onGradient" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="label" tone="onGradientMuted">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.close}>
          <AppText variant="label" weight="semibold" tone="onGradient">
            Cancel
          </AppText>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg + radius.sheet,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titles: {
    flex: 1,
  },
  close: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
});
