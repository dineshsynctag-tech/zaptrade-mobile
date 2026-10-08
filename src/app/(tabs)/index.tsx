import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GradientHeader, SheetSurface } from '@/components/gradient-header';
import { HeaderStat, HeaderStats } from '@/components/header-stat';
import { HeaderIconButton } from '@/components/header-icon-button';
import { OrderList } from '@/components/order-list';
import { SearchField } from '@/components/search-field';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useMarketStatus } from '@/hooks/use-market-status';
import { useOrderActions } from '@/hooks/use-order-actions';
import { useOrders, useQuotes } from '@/hooks/use-orders';
import type { MarketState } from '@/types/order';
import { spacing } from '@/theme/theme';
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
  const actions = useOrderActions();

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
          <View style={styles.actions}>
            <HeaderIconButton
              icon="reload"
              label="Reload orders"
              onPress={refresh}
              busy={manualRefresh}
            />
            <HeaderIconButton icon="plus" label="Add order" onPress={() => router.push('/order/new')} />
          </View>
        }>
        <HeaderStats>
          <HeaderStat label="Total Orders" value={String(orders.data?.total ?? '—')} />
          {market.data ? (
            <HeaderStat
              label={MARKET_LABEL[market.data.state]}
              value={
                market.data.state === 'open'
                  ? 'Live'
                  : `Next ${formatTradeDate(market.data.nextTradingDate)}`
              }
            />
          ) : null}
        </HeaderStats>
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
          emptyMessage={debouncedSearch ? undefined : 'Tap + to add a limit-buy order.'}
          onPressOrder={actions.open}
          onEditOrder={actions.edit}
          onDeleteOrder={actions.remove}
          onRetryOrder={actions.retry}
        />
      </SheetSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
