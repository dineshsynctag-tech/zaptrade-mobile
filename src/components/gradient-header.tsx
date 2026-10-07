import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { AppText } from './app-text';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned controls next to the title (e.g. reload). */
  actions?: ReactNode;
  /** Content below the title row (stats, search). */
  children?: ReactNode;
}

/**
 * Brand-gradient screen header. The content below should sit in a
 * <SheetSurface> so its rounded top corners overlap the gradient.
 */
export function GradientHeader({ title, subtitle, actions, children }: GradientHeaderProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={colors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.titleRow}>
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
        {actions}
      </View>
      {children}
    </LinearGradient>
  );
}

/** White surface with large top corners that overlaps the header above it. */
export function SheetSurface({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return <View style={[styles.sheet, { backgroundColor: colors.background }]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    // Extra room for the sheet's rounded corners to overlap.
    paddingBottom: spacing.xl + radius.sheet,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  titles: {
    flex: 1,
    gap: spacing.xxs,
  },
  sheet: {
    flex: 1,
    marginTop: -radius.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: 'hidden',
  },
});
