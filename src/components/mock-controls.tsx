import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { radius, spacing, TOUCH_TARGET } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { formatTradeDate } from '@/utils/time';
import { AppText } from './app-text';

/**
 * Mock-mode only: drive the simulated session so the end-of-day rule and GTC
 * carry-over can be checked on a device. Never rendered against a real backend.
 */
export function MockControls() {
  const { colors } = useAppTheme();
  const qc = useQueryClient();
  // Loaded lazily so mock code is only touched in mock mode.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mock = require('@/api/mock/simulator') as typeof import('@/api/mock/simulator');
  const [session, setSession] = useState(mock.getSession);

  const refresh = () => {
    setSession(mock.getSession());
    qc.invalidateQueries();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText variant="caption" weight="semibold" tone="accent">
        MOCK SESSION
      </AppText>
      <AppText variant="label" tone="muted">
        Session: {formatTradeDate(session.sessionDate)} · prices tick every 3 s
      </AppText>

      <View style={styles.row}>
        <AppText variant="body" weight="medium" style={styles.flex}>
          Market open
        </AppText>
        <Switch
          value={session.marketOpen}
          onValueChange={(open) => {
            mock.setMarketOpen(open);
            refresh();
          }}
          trackColor={{ true: colors.accent, false: colors.border }}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          mock.endOfDay();
          refresh();
        }}
        style={({ pressed }) => [styles.button, { borderColor: colors.accent, opacity: pressed ? 0.7 : 1 }]}>
        <AppText variant="label" weight="semibold" tone="accent">
          Simulate market close (EOD)
        </AppText>
      </Pressable>
      <AppText variant="caption" tone="muted">
        Cancels buys not filled today and moves to the next session. GTC sells keep working.
      </AppText>
    </View>
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
    minHeight: TOUCH_TARGET,
  },
  flex: {
    flex: 1,
  },
  button: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
