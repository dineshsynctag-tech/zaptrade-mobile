import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import type { Order } from '@/types/order';
import { spacing } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { AppText } from './app-text';
import { EmptyState } from './empty-state';
import { OrderCard } from './order-card';

interface OrderListProps {
  orders: Order[] | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  onRefresh: () => void;
  quotes?: Record<string, string>;
  emptyTitle: string;
  emptyMessage?: string;
  header?: ReactElement;
  onPressOrder?: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
  onDeleteOrder?: (order: Order) => void;
  onRetryOrder?: (order: Order) => void;
}

export function OrderList({
  orders,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
  quotes,
  emptyTitle,
  emptyMessage,
  header,
  ...handlers
}: OrderListProps) {
  const { colors } = useAppTheme();

  if (isLoading && !orders) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const errorText = error
    ? error instanceof ApiError
      ? error.message
      : 'Could not load orders.'
    : null;

  return (
    <FlatList
      data={orders ?? []}
      keyExtractor={(o) => o.id}
      renderItem={({ item }) => (
        <OrderCard
          order={item}
          lastPrice={quotes?.[item.symbol]}
          onPress={handlers.onPressOrder}
          onEdit={handlers.onEditOrder}
          onDelete={handlers.onDeleteOrder}
          onRetry={handlers.onRetryOrder}
        />
      )}
      ListHeaderComponent={
        <>
          {header}
          {errorText ? (
            <View style={[styles.error, { backgroundColor: colors.badge.REJECTED.bg }]}>
              <AppText variant="label" style={{ color: colors.badge.REJECTED.fg }}>
                {errorText} Pull down to retry.
              </AppText>
            </View>
          ) : null}
        </>
      }
      ListEmptyComponent={errorText ? null : <EmptyState title={emptyTitle} message={emptyMessage} />}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
      }
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: spacing.md,
  },
  error: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
});
