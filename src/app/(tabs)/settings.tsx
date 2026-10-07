import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GradientHeader, SheetSurface } from '@/components/gradient-header';
import { PillButton } from '@/components/pill-button';
import { IS_MOCK } from '@/config';
import { useAuthStore } from '@/store/auth';
import { radius, spacing } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';

// P1: account + logout. Defaults, notifications and theme arrive in P3/P4.
export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <View style={styles.flex}>
      <GradientHeader title="Settings" />
      <SheetSurface>
        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="caption" weight="semibold" tone="accent">
              SIGNED IN AS
            </AppText>
            <AppText variant="heading" weight="semibold">
              {user?.name}
            </AppText>
            <AppText variant="label" tone="muted">
              {user?.email}
            </AppText>
            {IS_MOCK ? (
              <AppText variant="caption" tone="muted">
                Mock backend: no real orders are placed.
              </AppText>
            ) : null}
          </View>
          <PillButton title="Log out" onPress={confirmLogout} />
        </View>
      </SheetSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.xs,
  },
});
