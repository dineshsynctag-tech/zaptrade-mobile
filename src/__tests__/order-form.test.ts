import { describe, expect, it } from '@jest/globals';

import { previewOrder, resolveProfitPct, validateOrderForm, type OrderFormValues } from '@/utils/order-form';

const base: OrderFormValues = {
  symbol: 'AXON',
  tradeDate: '2026-10-08',
  qty: '2',
  buyPrice: '468.00',
  targetMode: 'pct',
  profitPct: '0.25',
  sellPrice: '',
};

describe('validateOrderForm', () => {
  it('accepts a valid order', () => {
    expect(validateOrderForm(base)).toEqual({});
  });

  it('flags each invalid field', () => {
    const e = validateOrderForm({ ...base, symbol: 'ax1', qty: '0', buyPrice: '1.234', profitPct: '0' });
    expect(Object.keys(e).sort()).toEqual(['buyPrice', 'profitPct', 'qty', 'symbol']);
  });

  it('sell-price mode requires sell > buy', () => {
    expect(validateOrderForm({ ...base, targetMode: 'sell', sellPrice: '468.00' }).sellPrice).toMatch(/above \$468\.00/);
    expect(validateOrderForm({ ...base, targetMode: 'sell', sellPrice: '469.17' })).toEqual({});
  });

  it('compares the sell price against the actual fill when given', () => {
    // Buy filled at 465.00 (gap-down); 466.00 is above the fill though below the plan.
    expect(validateOrderForm({ ...base, targetMode: 'sell', sellPrice: '466.00' }, '465.00')).toEqual({});
  });
});

describe('preview', () => {
  it('profit % mode: est. sell from the planned buy, cost and profit', () => {
    const p = previewOrder(base, base.buyPrice);
    expect(p.estSellPrice).toBe('469.17');
    expect(p.estCostCents).toBe(93_600);
    expect(p.estProfitCents).toBe(234);
    expect(p.impliedPct).toBeNull();
  });

  it('sell price mode: stores an implied % that reproduces the price', () => {
    const v = { ...base, targetMode: 'sell' as const, sellPrice: '469.17' };
    expect(resolveProfitPct(v, base.buyPrice)).toBe('0.25');
    expect(previewOrder(v, base.buyPrice).impliedPct).toBe('0.25');
  });
});
