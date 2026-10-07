import type { Order } from '@/types/order';

/**
 * An order is closed (History) once it can no longer change: the sell filled,
 * the sell was cancelled, or the buy was cancelled. Rejected legs stay Open so
 * the user can see the reason and retry.
 */
export function isClosed(order: Order): boolean {
  return (
    order.buyStatus === 'CANCELLED' ||
    order.sellStatus === 'FILLED' ||
    order.sellStatus === 'CANCELLED'
  );
}

export function isPartiallyFilled(order: Order): boolean {
  return order.filledQty > 0 && order.filledQty < order.qty;
}
