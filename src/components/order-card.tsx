import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Order } from '@/types/order';
import { radius, spacing, TOUCH_TARGET } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { isPartiallyFilled } from '@/utils/order-status';
import { belowPlanCents, formatUsd, toCentsSigned } from '@/utils/price';
import { formatEt, formatTradeDate } from '@/utils/time';
import { AppText } from './app-text';
import { Icon, type IconName } from './icon';
import { StatusBadge } from './status-badge';

interface OrderCardProps {
  order: Order;
  lastPrice?: string;
  onPress?: (order: Order) => void;
  onEdit?: (order: Order) => void;
  onDelete?: (order: Order) => void;
  onRetry?: (order: Order) => void;
}

export const OrderCard = memo(function OrderCard({
  order,
  lastPrice,
  onPress,
  onEdit,
  onDelete,
  onRetry,
}: OrderCardProps) {
  const { colors } = useAppTheme();
  const below = belowPlanCents(order);
  const partial = isPartiallyFilled(order);
  const profitCents = order.profit ? toCentsSigned(order.profit) : null;

  return (
    <Pressable
      disabled={!onPress}
      onPress={() => onPress?.(order)}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? 'Opens order details' : undefined}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.92 : 1 },
      ]}>
      {/* Symbol row */}
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <AppText variant="title" weight="bold">
            {order.symbol}
          </AppText>
          <AppText variant="caption" tone="muted">
            {formatTradeDate(order.tradeDate)} · Qty {order.qty}
          </AppText>
        </View>
        {lastPrice ? (
          <View style={styles.right}>
            <AppText variant="caption" tone="muted">
              Last
            </AppText>
            <AppText variant="label" weight="semibold">
              {formatUsd(lastPrice)}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Buy and sell legs */}
      <View style={styles.legs}>
        <View style={styles.leg}>
          <AppText variant="caption" weight="semibold" tone="muted">
            BUY
          </AppText>
          <AppText variant="heading" weight="semibold">
            {formatUsd(order.buyPrice)}
          </AppText>
          <View style={styles.statusRow}>
            <StatusBadge status={order.buyStatus} />
            <AppText variant="caption" tone="muted">
              {formatEt(order.buyUpdatedAt)}
            </AppText>
          </View>
          {order.buyFillPrice && order.buyFillPrice !== order.buyPrice ? (
            <AppText variant="caption" tone="muted">
              Filled @ {formatUsd(order.buyFillPrice)}
            </AppText>
          ) : null}
          {partial ? (
            <AppText variant="caption" weight="medium">
              Filled {order.filledQty}/{order.qty}
            </AppText>
          ) : null}
          {below > 0 ? (
            <AppText variant="caption" weight="medium" tone="success">
              Filled below plan by {formatUsd(below)}
            </AppText>
          ) : null}
        </View>

        <View style={styles.leg}>
          <AppText variant="caption" weight="semibold" tone="muted">
            {order.profitPct}% → SELL
          </AppText>
          {order.sellStatus && order.sellPrice ? (
            <>
              <AppText variant="heading" weight="semibold">
                {formatUsd(order.sellPrice)}
              </AppText>
              <View style={styles.statusRow}>
                <StatusBadge status={order.sellStatus} />
                <AppText variant="caption" tone="muted">
                  {formatEt(order.sellUpdatedAt)}
                </AppText>
              </View>
              {partial ? (
                <AppText variant="caption" tone="muted">
                  Sell qty {order.filledQty}
                </AppText>
              ) : null}
            </>
          ) : (
            <AppText variant="label" tone="muted" style={styles.awaiting}>
              Awaiting buy fill
            </AppText>
          )}
        </View>
      </View>

      {/* Broker rejection */}
      {order.rejectReason ? (
        <View style={[styles.reject, { backgroundColor: colors.badge.REJECTED.bg }]}>
          <Icon name="warning" size={16} color={colors.badge.REJECTED.fg} />
          <AppText variant="caption" weight="medium" style={[styles.flex, { color: colors.badge.REJECTED.fg }]}>
            {order.rejectReason}
          </AppText>
          {onRetry ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onRetry(order)}
              hitSlop={10}
              style={styles.retry}>
              <AppText variant="caption" weight="bold" style={{ color: colors.badge.REJECTED.fg }}>
                RETRY
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Profit + actions */}
      <View style={styles.footer}>
        <View style={styles.flex}>
          <AppText variant="caption" tone="muted">
            Profit
          </AppText>
          <AppText
            variant="heading"
            weight="bold"
            tone={profitCents === null ? 'muted' : profitCents >= 0 ? 'success' : 'danger'}>
            {profitCents === null ? '—' : formatUsd(profitCents, { signed: true })}
          </AppText>
        </View>
        {onEdit ? (
          <ActionButton icon="edit" label={`Edit ${order.symbol} order`} onPress={() => onEdit(order)} />
        ) : null}
        {onDelete ? (
          <ActionButton
            icon="delete"
            label={`Delete ${order.symbol} order`}
            danger
            onPress={() => onDelete(order)}
          />
        ) : null}
      </View>
    </Pressable>
  );
});

function ActionButton({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: IconName;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Icon name={icon} size={18} color={danger ? colors.danger : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  legs: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  leg: {
    flex: 1,
    gap: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  awaiting: {
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  reject: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retry: {
    minHeight: 28,
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  action: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
