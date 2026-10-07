/**
 * Push notification copy. The server sends these via Expo Push; mock mode
 * shows them as local notifications. Keep both in sync with this file.
 */
import type { Order } from '@/types/order';
import { formatUsd, toCentsSigned } from './price';

export type NotificationKind = 'BUY_FILLED' | 'SELL_FILLED' | 'REJECTED' | 'EXPIRED';

export interface OrderNotification {
  title: string;
  body: string;
  data: { orderId: string; kind: NotificationKind };
}

export function orderNotification(kind: NotificationKind, o: Order): OrderNotification {
  const data = { orderId: o.id, kind };
  switch (kind) {
    case 'BUY_FILLED':
      // "MRVL bought 3 @ $285.00 · Sell placed @ $285.71"
      return {
        title: `${o.symbol} bought`,
        body: `${o.symbol} bought ${o.filledQty} @ ${formatUsd(o.buyFillPrice!)} · Sell placed @ ${formatUsd(o.sellPrice!)}`,
        data,
      };
    case 'SELL_FILLED':
      // "MRVL sold @ $285.71 · +$2.13"
      return {
        title: `${o.symbol} sold`,
        body: `${o.symbol} sold @ ${formatUsd(o.sellFillPrice!)} · ${formatUsd(toCentsSigned(o.profit ?? '0.00'), { signed: true })}`,
        data,
      };
    case 'REJECTED':
      return {
        title: `${o.symbol} order rejected`,
        body: `${o.symbol} buy rejected by the broker · ${o.rejectReason ?? 'Unknown reason'}`,
        data,
      };
    case 'EXPIRED':
      return {
        title: `${o.symbol} buy cancelled`,
        body: `${o.symbol} buy @ ${formatUsd(o.buyPrice)} · ${o.cancelReason ?? 'Not filled by market close'}`,
        data,
      };
  }
}
