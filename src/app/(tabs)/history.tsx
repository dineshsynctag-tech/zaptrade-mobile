import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GradientHeader, SheetSurface } from '@/components/gradient-header';
import { HeaderStat, HeaderStats } from '@/components/header-stat';
import { OfflineBanner } from '@/components/offline-banner';
import { OrderList } from '@/components/order-list';
import { SearchField } from '@/components/search-field';
import { SegmentedControl } from '@/components/segmented-control';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useIsOffline } from '@/hooks/use-network-status';
import { useOrderActions } from '@/hooks/use-order-actions';
import { useOrders } from '@/hooks/use-orders';
import { spacing } from '@/theme/theme';
import { historyTotals, RANGE_PRESETS, rangeFor, type RangePreset } from '@/utils/history';
import { formatUsd } from '@/utils/price';

const EMPTY_TITLE: Record<RangePreset, string> = {
  today: 'Nothing closed today',
  '7d': 'Nothing closed in the last 7 days',
  '30d': 'Nothing closed in the last 30 days',
  all: 'No closed orders yet',
};

export default function HistoryScreen() {
  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState<RangePreset>('7d');
  const debouncedSearch = useDebouncedValue(search.trim());
  // Recomputed on preset change, so "Today" follows the ET date.
  const range = useMemo(() => rangeFor(preset), [preset]);
  const orders = useOrders({ tab: 'history', search: debouncedSearch || undefined, ...range });
  const actions = useOrderActions();
  const offline = useIsOffline();

  const totals = useMemo(() => historyTotals(orders.data?.orders ?? []), [orders.data]);
  const hasData = !!orders.data;

  return (
    <View style={styles.flex}>
      <GradientHeader title="History" subtitle="Completed and cancelled orders">
        <HeaderStats>
          <HeaderStat label="Trades" value={hasData ? String(totals.trades) : '—'} />
          <HeaderStat label="Profit" value={hasData ? formatUsd(totals.profitCents, { signed: true }) : '—'} />
          <HeaderStat label="Wins" value={hasData ? `${totals.wins}/${totals.trades}` : '—'} />
        </HeaderStats>
        <SearchField value={search} onChangeText={setSearch} />
      </GradientHeader>
      <SheetSurface>
        <OrderList
          orders={orders.data?.orders}
          isLoading={orders.isLoading}
          isRefreshing={orders.isRefetching}
          error={orders.error}
          onRefresh={() => orders.refetch()}
          header={
            <View style={styles.filter}>
              {offline ? <OfflineBanner updatedAt={orders.dataUpdatedAt} /> : null}
              <SegmentedControl options={RANGE_PRESETS} value={preset} onChange={setPreset} />
            </View>
          }
          emptyTitle={debouncedSearch ? `No closed orders for “${debouncedSearch}”` : EMPTY_TITLE[preset]}
          onPressOrder={actions.open}
        />
      </SheetSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  filter: {
    marginBottom: spacing.md,
  },
});
