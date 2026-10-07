import { describe, expect, it } from '@jest/globals';

import type { LegStatus, Order } from '@/types/order';
import {
  canDelete,
  checkPatchAllowed,
  deleteEffect,
  getEditability,
  type Editability,
} from '@/utils/edit-rules';

function order(buyStatus: LegStatus, sellStatus: LegStatus | null, filledQty = 0): Order {
  return {
    id: 'o1', symbol: 'AXON', tradeDate: '2026-10-08', qty: 2, filledQty,
    buyPrice: '468.00', buyStatus, buyFillPrice: filledQty ? '468.00' : null,
    buyBrokerOrderId: null, buyUpdatedAt: null, profitPct: '0.25',
    sellPrice: sellStatus ? '469.17' : null, sellStatus, sellFillPrice: null,
    sellBrokerOrderId: null, sellUpdatedAt: null, cancelReason: null, profit: null,
    rejectReason: null, version: 1, source: 'web', createdAt: '2026-10-08T12:00:00Z',
  };
}

describe('getEditability', () => {
  const cases: [LegStatus, LegStatus | null, number, Editability][] = [
    ['QUEUED', null, 0, 'full'],
    ['WORKING', null, 0, 'full'],
    ['REJECTED', null, 0, 'full'],
    ['FILLED', 'WORKING', 2, 'sellOnly'],
    ['WORKING', 'WORKING', 1, 'sellOnly'], // partial fill
    ['CANCELLED', 'WORKING', 1, 'sellOnly'], // remainder expired at close, sell still GTC
    ['FILLED', 'FILLED', 2, 'none'],
    ['FILLED', 'CANCELLED', 2, 'none'],
    ['CANCELLED', null, 0, 'none'], // expired unfilled at close
  ];
  it.each(cases)('buy %s / sell %s / filled %d → %s', (buy, sell, filled, expected) => {
    expect(getEditability(order(buy, sell, filled))).toBe(expected);
  });
});

describe('checkPatchAllowed', () => {
  it('allows any field before the buy fills', () => {
    expect(checkPatchAllowed(order('WORKING', null), { version: 1, qty: 3, buyPrice: '1.00' })).toBeNull();
  });

  it('only allows the profit target once bought', () => {
    const bought = order('FILLED', 'WORKING', 2);
    expect(checkPatchAllowed(bought, { version: 1, profitPct: '0.5' })).toBeNull();
    expect(checkPatchAllowed(bought, { version: 1, qty: 3 })).toMatch(/Only the profit target/);
  });

  it('blocks edits to closed orders', () => {
    expect(checkPatchAllowed(order('FILLED', 'FILLED', 2), { version: 1, profitPct: '1' })).toMatch(/closed/);
  });
});

describe('delete', () => {
  it('cancels the buy when nothing is bought, else the GTC sell', () => {
    expect(deleteEffect(order('WORKING', null))).toBe('cancelBuy');
    expect(deleteEffect(order('FILLED', 'WORKING', 2))).toBe('cancelSell');
  });

  it('is not offered for closed orders', () => {
    expect(canDelete(order('FILLED', 'FILLED', 2))).toBe(false);
    expect(canDelete(order('QUEUED', null))).toBe(true);
  });
});
