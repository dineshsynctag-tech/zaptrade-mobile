import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import { queryKeys } from '@/api/query-client';
import type { Order } from '@/types/order';
import { requireBiometric } from './biometrics';
import { ensureOnline } from './use-network-status';
import { confirmAsync } from '@/utils/confirm';
import { deleteEffect } from '@/utils/edit-rules';
import { formatUsd } from '@/utils/price';
import { useDeleteOrder, useRetryOrder } from './use-order-mutations';

/** Card actions shared by the order list and (later) the detail screen. */
export function useOrderActions() {
  const qc = useQueryClient();
  const del = useDeleteOrder();
  const retry = useRetryOrder();

  async function handleError(e: unknown) {
    if (e instanceof ApiError && e.status === 409) {
      await qc.invalidateQueries({ queryKey: queryKeys.allOrders });
      Alert.alert('Order changed', `${e.message}\n\nThe latest version has been loaded.`);
    } else {
      Alert.alert('Something went wrong', e instanceof ApiError ? e.message : 'Check your connection and try again.');
    }
  }

  return {
    open: (order: Order) => router.push({ pathname: '/order/[id]', params: { id: order.id } }),

    edit: (order: Order) => router.push({ pathname: '/order/[id]/edit', params: { id: order.id } }),

    remove: async (order: Order) => {
      if (!ensureOnline()) return;
      const sell = deleteEffect(order) === 'cancelSell';
      const ok = await confirmAsync(
        sell ? `Cancel ${order.symbol} sell?` : `Cancel ${order.symbol} order?`,
        sell
          ? `The GTC sell @ ${formatUsd(order.sellPrice!)} is cancelled at Schwab. Your ${order.filledQty} ${order.symbol} shares stay in your account and are no longer managed by the bot.`
          : `The ${order.buyStatus === 'WORKING' ? 'live' : 'queued'} buy for ${order.qty} @ ${formatUsd(order.buyPrice)} is cancelled.`,
        sell ? 'Cancel sell' : 'Cancel order',
        { destructive: true, cancelLabel: 'Keep' },
      );
      if (!ok || !(await requireBiometric(`Confirm cancelling ${order.symbol}`))) return;
      try {
        await del.mutateAsync({ id: order.id, version: order.version });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } catch (e) {
        await handleError(e);
      }
    },

    retry: async (order: Order) => {
      if (!ensureOnline()) return;
      if (!(await requireBiometric(`Confirm resubmitting ${order.symbol}`))) return;
      try {
        await retry.mutateAsync({ id: order.id, version: order.version });
      } catch (e) {
        await handleError(e);
      }
    },
  };
}
