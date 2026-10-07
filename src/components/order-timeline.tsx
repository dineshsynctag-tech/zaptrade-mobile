import { StyleSheet, View } from 'react-native';

import type { OrderEvent, OrderEventType } from '@/types/order';
import { radius, spacing, type Theme } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { formatEtAndIst } from '@/utils/time';
import { AppText } from './app-text';

const LABEL: Record<OrderEventType, string> = {
  CREATED: 'Created',
  QUEUED: 'Queued',
  BUY_WORKING: 'Buy working',
  BUY_PARTIAL: 'Buy partially filled',
  BUY_FILLED: 'Buy filled',
  SELL_PLACED: 'Sell placed (GTC)',
  SELL_FILLED: 'Sold',
  EDITED: 'Edited',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

function dotColor(type: OrderEventType, colors: Theme['colors']): string {
  switch (type) {
    case 'BUY_FILLED':
    case 'SELL_FILLED':
      return colors.badge.FILLED.fg;
    case 'BUY_WORKING':
    case 'SELL_PLACED':
    case 'BUY_PARTIAL':
      return colors.badge.WORKING.fg;
    case 'REJECTED':
      return colors.badge.REJECTED.fg;
    case 'CANCELLED':
      return colors.badge.CANCELLED.fg;
    case 'QUEUED':
      return colors.badge.QUEUED.fg;
    default:
      return colors.textMuted;
  }
}

export function OrderTimeline({ events }: { events: OrderEvent[] }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.list}>
      {events.map((e, i) => (
        <View key={`${e.at}-${i}`} style={styles.item}>
          <View style={styles.rail}>
            <View style={[styles.dot, { backgroundColor: dotColor(e.type, colors) }]} />
            {i < events.length - 1 ? (
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            ) : null}
          </View>
          <View style={styles.body}>
            <AppText variant="label" weight="semibold">
              {LABEL[e.type]}
              {e.source ? (
                <AppText variant="caption" tone="muted">
                  {'  '}
                  {e.source}
                </AppText>
              ) : null}
            </AppText>
            <AppText variant="label">{e.message}</AppText>
            <AppText variant="caption" tone="muted">
              {formatEtAndIst(e.at)}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 0,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    width: 14,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: spacing.xs,
  },
  body: {
    flex: 1,
    gap: spacing.xxs,
    paddingBottom: spacing.lg,
  },
});
