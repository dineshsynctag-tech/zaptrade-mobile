import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GradientHeader, SheetSurface } from '@/components/gradient-header';
import { OrderList } from '@/components/order-list';
import { SearchField } from '@/components/search-field';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useOrders } from '@/hooks/use-orders';

// P1: plain closed-order list. Date-range filter and totals arrive in P4.
export default function HistoryScreen() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const orders = useOrders({ tab: 'history', search: debouncedSearch || undefined });

  return (
    <View style={styles.flex}>
      <GradientHeader title="History" subtitle="Completed and cancelled orders">
        <SearchField value={search} onChangeText={setSearch} />
      </GradientHeader>
      <SheetSurface>
        <OrderList
          orders={orders.data?.orders}
          isLoading={orders.isLoading}
          isRefreshing={orders.isRefetching}
          error={orders.error}
          onRefresh={() => orders.refetch()}
          emptyTitle="No closed orders yet"
        />
      </SheetSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
