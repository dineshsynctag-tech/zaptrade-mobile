import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GradientHeader, SheetSurface } from '@/components/gradient-header';
import { HeaderIconButton } from '@/components/header-icon-button';
import { OrderList } from '@/components/order-list';
import { SearchField } from '@/components/search-field';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useMarketStatus } from '@/hooks/use-market-status';
import { useOrders, useQuotes } from '@/hooks/use-orders';
import type { MarketState } from '@/types/order';
import { radius, spacing } from '@/theme/theme';
import { formatTradeDate } from '@/utils/time';

const MARKET_LABEL: Record<MarketState, string> = {
  pre: 'Pre-market',
  open: 'Market open',
  post: 'After hours',
  closed: 'Market closed',
};

export default function OrdersScreen() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());

  const orders = useOrders({ tab: 'open', search: debouncedSearch || undefined });
  const market = useMarketStatus();
  const quotes = useQuotes(orders.data?.orders.map((o) => o.symbol) ?? []);

  const [manualRefresh, setManualRefresh] = useState(false);
  const refresh = async () => {
    setManualRefresh(true);
    await Promise.allSettled([orders.refetch(), quotes.refetch(), market.refetch()]);
    setManualRefresh(false);
  };

  return (
    <View style={styles.flex}>
      <GradientHeader
        title="Manual Bot"
        subtitle="Limit-buy orders with a profit % target"
        actions={
          <HeaderIconButton
            icon="reload"
            label="Reload orders"
            onPress={refresh}
            busy={manualRefresh}
          />
        }>
        <View style={styles.stats}>
          <Stat label="Total Orders" value={String(orders.data?.total ?? '—')} />
          {market.data ? (
            <Stat
              label={MARKET_LABEL[market.data.state]}
              value={
                market.data.state === 'open'
                  ? 'Live'
                  : `Next ${formatTradeDate(market.data.nextTradingDate)}`
              }
            />
          ) : null}
        </View>
        <SearchField value={search} onChangeText={setSearch} />
      </GradientHeader>

      <SheetSurface>
        <OrderList
          orders={orders.data?.orders}
          isLoading={orders.isLoading}
          isRefreshing={manualRefresh}
          error={orders.error}
          onRefresh={refresh}
          quotes={quotes.data}
          emptyTitle={debouncedSearch ? `No open orders for “${debouncedSearch}”` : 'No open orders'}
          emptyMessage={debouncedSearch ? undefined : 'Orders you add will appear here.'}
        />
      </SheetSurface>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" tone="onGradientMuted">
        {label}
      </AppText>
      <AppText variant="heading" weight="bold" tone="onGradient">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
