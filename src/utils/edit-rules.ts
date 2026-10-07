/**
 * What a user may change on an order, by state. Enforced by the server; the
 * app uses the same rules to shape the form and hide actions.
 *
 *  full      buy not yet filled (QUEUED / WORKING / REJECTED, nothing bought):
 *            every field editable; server cancel/replaces the buy at the broker
 *  sellOnly  shares bought and the GTC sell is working: only the profit target
 *            (profit % or sell price); server cancel/replaces the sell
 *  none      closed orders are read-only
 */
import type { Order, UpdateOrderInput } from '@/types/order';
import { isClosed } from './order-status';

export type Editability = 'full' | 'sellOnly' | 'none';

export function getEditability(order: Order): Editability {
  if (isClosed(order)) return 'none';
  if (order.filledQty === 0 && ['QUEUED', 'WORKING', 'REJECTED'].includes(order.buyStatus)) {
    return 'full';
  }
  if (order.filledQty > 0 && order.sellStatus === 'WORKING') return 'sellOnly';
  return 'none';
}

/**
 * Delete = cancel at the broker.
 *  - unfilled buy: cancels the buy; the order moves to History
 *  - bought, sell working: cancels the GTC sell; the shares stay in the
 *    Schwab account and the order moves to History
 */
export function canDelete(order: Order): boolean {
  return getEditability(order) !== 'none';
}

export type DeleteEffect = 'cancelBuy' | 'cancelSell';

export function deleteEffect(order: Order): DeleteEffect {
  return order.filledQty > 0 ? 'cancelSell' : 'cancelBuy';
}

const SELL_ONLY_FIELDS = new Set(['version', 'profitPct']);

/** Returns an error message if `patch` touches fields the state doesn't allow. */
export function checkPatchAllowed(order: Order, patch: UpdateOrderInput): string | null {
  const mode = getEditability(order);
  if (mode === 'none') return 'This order is closed and can no longer be edited.';
  if (mode === 'sellOnly') {
    const illegal = Object.keys(patch).filter(
      (k) => !SELL_ONLY_FIELDS.has(k) && patch[k as keyof UpdateOrderInput] !== undefined,
    );
    if (illegal.length) {
      return 'The buy has filled. Only the profit target can be changed.';
    }
  }
  return null;
}
