import { describe, expect, it } from '@jest/globals';

import type { Order } from '@/types/order';
import { historyTotals, rangeFor } from '@/utils/history';

// 2026-10-08 01:30 UTC is still Oct 7 in New York.
const now = new Date('2026-10-08T01:30:00Z');

describe('rangeFor', () => {
  it('uses the ET calendar date', () => {
    expect(rangeFor('today', now)).toEqual({ from: '2026-10-07', to: '2026-10-07' });
  });
  it('includes today in 7 and 30 day windows', () => {
    expect(rangeFor('7d', now)).toEqual({ from: '2026-10-01', to: '2026-10-07' });
    expect(rangeFor('30d', now)).toEqual({ from: '2026-09-08', to: '2026-10-07' });
  });
  it('all has no bounds', () => {
    expect(rangeFor('all', now)).toEqual({});
  });
});

const order = (o: Partial<Order>) => ({ filledQty: 2, sellStatus: null, profit: null, ...o }) as Order;

describe('historyTotals', () => {
  it('sums realised profit over sold orders only', () => {
    const t = historyTotals([
      order({ sellStatus: 'FILLED', profit: '2.34' }),
      order({ sellStatus: 'FILLED', profit: '1.43' }),
      order({ sellStatus: 'FILLED', profit: '-0.50' }),
      order({ filledQty: 0 }), // expired at close
    ]);
    expect(t).toEqual({ trades: 3, wins: 2, profitCents: 327, cancelled: 1 });
  });
  it('is zero for an empty list', () => {
    expect(historyTotals([])).toEqual({ trades: 0, wins: 0, profitCents: 0, cancelled: 0 });
  });
});
