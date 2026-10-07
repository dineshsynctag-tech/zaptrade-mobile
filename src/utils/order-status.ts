import type { Order } from '@/types/order';

/**
 * An order is closed (History) once it can no longer change:
 *  - the GTC sell filled or was cancelled, or
 *  - the buy was cancelled with nothing bought (e.g. the day buy expired at the close).
 * A partially filled buy whose remainder expired stays Open while its sell works.
 * Rejected legs stay Open so the user can see the reason and retry.
 */
export function isClosed(order: Order): boolean {
  return (
    order.sellStatus === 'FILLED' ||
    order.sellStatus === 'CANCELLED' ||
    (order.buyStatus === 'CANCELLED' && order.filledQty === 0)
  );
}

export function isPartiallyFilled(order: Order): boolean {
  return order.filledQty > 0 && order.filledQty < order.qty;
}
