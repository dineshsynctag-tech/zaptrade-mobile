import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GradientHeader, SheetSurface } from '@/components/gradient-header';
import { MockControls } from '@/components/mock-controls';
import { PillButton } from '@/components/pill-button';
import {
  AppearanceSettings,
  NotificationSettings,
  OrderDefaultsSettings,
  SecuritySettings,
} from '@/components/settings-sections';
import { IS_MOCK } from '@/config';
import { unregisterPush } from '@/notifications/use-push-notifications';
import { useAuthStore } from '@/store/auth';
import { radius, spacing } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => unregisterPush().finally(signOut) },
    ]);

  return (
    <View style={styles.flex}>
      <GradientHeader title="Settings" />
      <SheetSurface>
        <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
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
          <OrderDefaultsSettings />
          <NotificationSettings />
          <SecuritySettings />
          <AppearanceSettings />
          {IS_MOCK ? <MockControls /> : null}
          <PillButton title="Log out" onPress={confirmLogout} />
        </ScrollView>
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
