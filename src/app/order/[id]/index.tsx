import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { GradientHeader, SheetSurface } from '@/components/gradient-header';
import { HeaderIconButton } from '@/components/header-icon-button';
import { OrderCard } from '@/components/order-card';
import { OrderTimeline } from '@/components/order-timeline';
import { useLiveRefetchInterval } from '@/hooks/use-market-status';
import { useOrderActions } from '@/hooks/use-order-actions';
import { useOrder } from '@/hooks/use-order-mutations';
import { useQuotes } from '@/hooks/use-orders';
import type { OrderDetail } from '@/types/order';
import { radius, spacing } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { isClosed } from '@/utils/order-status';
import { formatUsd } from '@/utils/price';
import { formatTradeDate } from '@/utils/time';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const interval = useLiveRefetchInterval();
  const order = useOrder(id, { refetchInterval: interval });
  const o = order.data;
  const quotes = useQuotes(o && !isClosed(o) ? [o.symbol] : []);
  const actions = useOrderActions();

  return (
    <View style={styles.flex}>
      <GradientHeader
        title={o ? o.symbol : 'Order'}
        subtitle={o ? `${formatTradeDate(o.tradeDate)} · Qty ${o.qty}` : undefined}
        actions={
          <HeaderIconButton
            icon="back"
            label="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        }
      />
      <SheetSurface>
        {!o ? (
          order.error ? (
            <EmptyState title="Couldn’t load this order" message={order.error.message} />
          ) : (
            <ActivityIndicator style={styles.loading} color={colors.accent} />
          )
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={
              <RefreshControl
                refreshing={order.isRefetching}
                onRefresh={() => order.refetch()}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            }>
            <OrderCard
              order={o}
              lastPrice={quotes.data?.[o.symbol]}
              onEdit={actions.edit}
              onDelete={actions.remove}
              onRetry={actions.retry}
            />
            <BrokerDetails order={o} />
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AppText variant="caption" weight="semibold" tone="accent">
                TIMELINE
              </AppText>
              <OrderTimeline events={o.events} />
            </View>
          </ScrollView>
        )}
      </SheetSurface>
    </View>
  );
}

function BrokerDetails({ order: o }: { order: OrderDetail }) {
  const { colors } = useAppTheme();
  const rows: [string, string][] = [
    ['Buy order ID', o.buyBrokerOrderId ?? '—'],
    ['Buy fill', o.buyFillPrice ? `${o.filledQty}/${o.qty} @ ${formatUsd(o.buyFillPrice)}` : '—'],
    ['Sell order ID', o.sellBrokerOrderId ?? '—'],
    ['Sell (GTC)', o.sellPrice ? `${formatUsd(o.sellPrice)} (+${o.profitPct}% on fill)` : `+${o.profitPct}% after fill`],
    ['Sell fill', o.sellFillPrice ? formatUsd(o.sellFillPrice) : '—'],
    ['Source', o.source],
  ];
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText variant="caption" weight="semibold" tone="accent">
        BROKER
      </AppText>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <AppText variant="label" tone="muted" style={styles.flex}>
            {label}
          </AppText>
          <AppText variant="label" weight="medium" selectable>
            {value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    marginTop: 48,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 28,
  },
});
