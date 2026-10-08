import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { queryKeys } from '@/api/query-client';
import { EmptyState } from '@/components/empty-state';
import { SheetSurface } from '@/components/gradient-header';
import { ModalHeader } from '@/components/modal-header';
import { OrderForm } from '@/components/order-form';
import { requireBiometric } from '@/hooks/biometrics';
import { useMarketStatus } from '@/hooks/use-market-status';
import { ensureOnline } from '@/hooks/use-network-status';
import { useOrder, useUpdateOrder } from '@/hooks/use-order-mutations';
import type { UpdateOrderInput } from '@/types/order';
import { useAppTheme } from '@/theme/use-app-theme';
import { confirmAsync } from '@/utils/confirm';
import { getEditability } from '@/utils/edit-rules';
import { tradingDaysFrom } from '@/utils/market-hours';
import type { OrderFormValues } from '@/utils/order-form';
import { calcSellPrice, formatUsd, normalizePrice } from '@/utils/price';
import { formatTradeDate } from '@/utils/time';

export default function EditOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const qc = useQueryClient();
  const order = useOrder(id);
  const market = useMarketStatus();
  const update = useUpdateOrder(id);

  const o = order.data;
  const editability = o ? getEditability(o) : 'none';

  const tradeDates = useMemo(() => {
    if (!market.data || !o) return [];
    const days = tradingDaysFrom(market.data.nextTradingDate, 5);
    return days.includes(o.tradeDate) ? days : [o.tradeDate, ...days];
  }, [market.data, o]);

  async function submit(v: OrderFormValues, profitPct: string) {
    if (!ensureOnline()) return;
    if (!o) return;

    const patch: UpdateOrderInput = { version: o.version };
    if (profitPct !== o.profitPct) patch.profitPct = profitPct;
    if (editability === 'full') {
      if (v.tradeDate !== o.tradeDate) patch.tradeDate = v.tradeDate;
      if (Number(v.qty) !== o.qty) patch.qty = Number(v.qty);
      const buy = normalizePrice(v.buyPrice);
      if (buy !== o.buyPrice) patch.buyPrice = buy;
    }
    if (Object.keys(patch).length === 1) {
      Alert.alert('No changes', 'Nothing was changed on this order.');
      return;
    }

    const base = editability === 'sellOnly' ? o.buyFillPrice! : (patch.buyPrice ?? o.buyPrice);
    const lines =
      editability === 'sellOnly'
        ? [
            `Profit: ${o.profitPct}% → ${profitPct}%`,
            `Sell: ${formatUsd(o.sellPrice!)} → ${formatUsd(calcSellPrice(base, profitPct))}`,
            '',
            `The GTC sell for ${o.filledQty} shares is cancelled and replaced at Schwab.`,
          ]
        : [
            `Date: ${formatTradeDate(patch.tradeDate ?? o.tradeDate)}`,
            `Qty: ${patch.qty ?? o.qty}`,
            `Buy limit: ${formatUsd(base)}`,
            `Profit: ${profitPct}% → est. sell ${formatUsd(calcSellPrice(base, profitPct))}`,
            '',
            o.buyStatus === 'WORKING'
              ? 'The live buy is cancelled and replaced at Schwab.'
              : 'The queued order is updated.',
          ];

    const ok = await confirmAsync(`Save ${o.symbol} changes?`, lines.join('\n'), 'Save');
    if (!ok || !(await requireBiometric(`Confirm ${o.symbol} changes`))) return;

    try {
      await update.mutateAsync(patch);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // The bot (or the web dashboard) changed it meanwhile — e.g. the buy just filled.
        await qc.invalidateQueries({ queryKey: queryKeys.allOrders });
        await qc.invalidateQueries({ queryKey: queryKeys.order(id) });
        Alert.alert('Order changed', `${e.message}\n\nThe latest version has been loaded.`);
        router.back();
      }
    }
  }

  const serverError =
    update.error instanceof ApiError && update.error.status !== 409
      ? update.error.message
      : update.error && !(update.error instanceof ApiError)
        ? 'Could not save. Check your connection and try again.'
        : null;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ModalHeader
        title={o ? `Edit ${o.symbol}` : 'Edit order'}
        subtitle={editability === 'sellOnly' ? 'Bought · update the profit target' : undefined}
      />
      <SheetSurface>
        {!o || !tradeDates.length ? (
          order.error ? (
            <EmptyState title="Couldn’t load this order" message={order.error.message} />
          ) : (
            <ActivityIndicator style={styles.loading} color={colors.accent} />
          )
        ) : editability === 'none' ? (
          <EmptyState title="This order is closed" message="Completed and cancelled orders are read-only." />
        ) : (
          <OrderForm
            initial={{
              symbol: o.symbol,
              tradeDate: o.tradeDate,
              qty: String(o.qty),
              buyPrice: o.buyPrice,
              targetMode: 'pct',
              profitPct: o.profitPct,
              sellPrice: o.sellPrice ?? '',
            }}
            editability={editability}
            fillPrice={o.buyFillPrice}
            filledQty={o.filledQty}
            tradeDates={tradeDates}
            submitLabel="Review changes"
            submitting={update.isPending}
            serverError={serverError}
            onSubmit={submit}
          />
        )}
      </SheetSurface>
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
});
