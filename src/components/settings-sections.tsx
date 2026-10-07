import { Alert, StyleSheet, Switch, View } from 'react-native';

import { authenticate, biometricAvailability } from '@/hooks/biometrics';
import { supported as pushSupported } from '@/notifications/notifications';
import { usePrefsStore } from '@/store/prefs';
import { radius, spacing, TOUCH_TARGET } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { NotificationKind } from '@/utils/notification-text';
import { AppText } from './app-text';

const NOTIFY_ROWS: { kind: NotificationKind; label: string; hint: string }[] = [
  { kind: 'BUY_FILLED', label: 'Buy filled', hint: 'Includes the sell price placed from the fill' },
  { kind: 'SELL_FILLED', label: 'Sell filled', hint: 'With the realised profit' },
  { kind: 'REJECTED', label: 'Rejected', hint: 'Broker rejected the buy' },
  { kind: 'EXPIRED', label: 'Buy cancelled at close', hint: 'Day buy not filled by market close' },
];

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <AppText variant="body" weight="medium">
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.border }}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText variant="caption" weight="semibold" tone="accent">
        {title}
      </AppText>
      {children}
    </View>
  );
}

export function NotificationSettings() {
  const notify = usePrefsStore((s) => s.notify);
  const update = usePrefsStore((s) => s.update);

  return (
    <Section title="NOTIFICATIONS">
      {NOTIFY_ROWS.map(({ kind, label, hint }) => (
        <ToggleRow
          key={kind}
          label={label}
          hint={hint}
          value={notify[kind]}
          onChange={(v) => update({ notify: { ...notify, [kind]: v } })}
        />
      ))}
      {!pushSupported ? (
        <AppText variant="caption" tone="muted">
          Push notifications are only available in the iOS and Android apps.
        </AppText>
      ) : null}
    </Section>
  );
}

export function SecuritySettings() {
  const biometricLock = usePrefsStore((s) => s.biometricLock);
  const update = usePrefsStore((s) => s.update);

  const toggle = async (next: boolean) => {
    if (next) {
      const availability = await biometricAvailability();
      if (availability !== 'available') {
        Alert.alert(
          'Biometrics unavailable',
          availability === 'notEnrolled'
            ? 'Set up Face ID or a fingerprint in your device settings first.'
            : 'This device doesn’t support Face ID or fingerprint unlock.',
        );
        return;
      }
    }
    // Authenticate both ways, so someone holding an unlocked phone can't just switch it off.
    if (!(await authenticate(next ? 'Enable biometric lock' : 'Disable biometric lock'))) return;
    update({ biometricLock: next });
  };

  return (
    <Section title="SECURITY">
      <ToggleRow
        label="Biometric lock"
        hint="Face ID / fingerprint on open and before placing, editing or cancelling orders"
        value={biometricLock}
        onChange={toggle}
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET,
  },
  flex: {
    flex: 1,
  },
});
