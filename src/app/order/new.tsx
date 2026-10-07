import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { SheetSurface } from '@/components/gradient-header';
import { ModalHeader } from '@/components/modal-header';
import { OrderForm } from '@/components/order-form';
import { useMarketStatus } from '@/hooks/use-market-status';
import { useCreateOrder } from '@/hooks/use-order-mutations';
import type { CreateOrderInput } from '@/types/order';
import { useAppTheme } from '@/theme/use-app-theme';
import { confirmAsync } from '@/utils/confirm';
import { tradingDaysFrom } from '@/utils/market-hours';
import type { OrderFormValues } from '@/utils/order-form';
import { calcSellPrice, formatUsd, normalizePrice, toCents } from '@/utils/price';
import { formatTradeDate } from '@/utils/time';

const DEFAULT_PROFIT_PCT = '0.25';

export default function NewOrderScreen() {
  const { colors } = useAppTheme();
  const market = useMarketStatus();
  const create = useCreateOrder();

  const tradeDates = useMemo(
    () => (market.data ? tradingDaysFrom(market.data.nextTradingDate, 5) : []),
    [market.data],
  );

  async function submit(v: OrderFormValues, profitPct: string) {
    const input: CreateOrderInput = {
      symbol: v.symbol,
      tradeDate: v.tradeDate,
      qty: Number(v.qty),
      buyPrice: normalizePrice(v.buyPrice),
      profitPct,
    };
    const ok = await confirmAsync(
      `Place ${input.symbol} order?`,
      [
        `Date: ${formatTradeDate(input.tradeDate)}`,
        `Qty: ${input.qty}`,
        `Buy limit: ${formatUsd(input.buyPrice)} (day order)`,
        `Profit: ${profitPct}% → est. sell ${formatUsd(calcSellPrice(input.buyPrice, profitPct))}`,
        `Est. cost: ${formatUsd(toCents(input.buyPrice) * input.qty)}`,
        '',
        'The sell is recalculated from the actual fill and placed as good-till-cancelled.',
      ].join('\n'),
      'Place order',
    );
    if (!ok) return;

    try {
      await create.mutateAsync(input);
      done();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DUPLICATE_ORDER') {
        const again = await confirmAsync(
          'Duplicate order',
          `${e.message} Place another one anyway?`,
          'Place anyway',
        );
        if (again) {
          await create.mutateAsync({ ...input, confirmDuplicate: true }).then(done, () => {});
        }
      }
      // Other errors are shown inline via create.error.
    }
  }

  function done() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  }

  const serverError =
    create.error instanceof ApiError && create.error.code !== 'DUPLICATE_ORDER'
      ? create.error.message
      : create.error && !(create.error instanceof ApiError)
        ? 'Could not place the order. Check your connection and try again.'
        : null;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ModalHeader title="New order" subtitle="Limit buy with a profit % target" />
      <SheetSurface>
        {tradeDates.length ? (
          <OrderForm
            initial={{
              symbol: '',
              tradeDate: tradeDates[0],
              qty: '',
              buyPrice: '',
              targetMode: 'pct',
              profitPct: DEFAULT_PROFIT_PCT,
              sellPrice: '',
            }}
            editability="full"
            tradeDates={tradeDates}
            submitLabel="Review order"
            submitting={create.isPending}
            serverError={serverError}
            onSubmit={submit}
          />
        ) : (
          <ActivityIndicator style={styles.loading} color={colors.accent} />
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
