import { describe, expect, it } from '@jest/globals';

import {
  belowPlanCents,
  calcProfitCents,
  calcSellCents,
  calcSellPrice,
  formatUsd,
  fromCents,
  fromPctE4,
  impliedProfitPct,
  pctToE4,
  toCents,
} from '@/utils/price';

describe('calcSellPrice', () => {
  it('matches the dashboard examples', () => {
    expect(calcSellPrice('468.00', '0.25')).toBe('469.17');
    expect(calcSellPrice('285.00', '0.25')).toBe('285.71');
  });

  it('rounds half up at exactly half a cent', () => {
    // 100.02 × 1.005 = 100.5201 → 100.52 ; 1.10 × 1.05 = 1.155 → 1.16
    expect(calcSellPrice('100.02', '0.5')).toBe('100.52');
    expect(calcSellPrice('1.10', '5')).toBe('1.16');
  });

  it('uses the actual fill (gap-down) not the plan', () => {
    expect(calcSellPrice('247.30', '0.5')).toBe('248.54');
  });

  it('handles high prices without float drift', () => {
    expect(calcSellCents(toCents('9999.99'), pctToE4('0.0001'))).toBe(1_000_000);
    expect(calcSellPrice('0.10', '0.25')).toBe('0.10');
  });
});

describe('impliedProfitPct', () => {
  it('back-calculates a % that reproduces the entered sell price', () => {
    const cases: [string, string][] = [
      ['468.00', '469.17'],
      ['285.00', '285.71'],
      ['123.45', '125.00'],
      ['10.00', '10.01'],
      ['3333.33', '3400.00'],
    ];
    for (const [buy, sell] of cases) {
      const pct = impliedProfitPct(buy, sell)!;
      expect(calcSellPrice(buy, pct)).toBe(sell);
    }
  });

  it('returns null when sell is not above buy', () => {
    expect(impliedProfitPct('100.00', '100.00')).toBeNull();
    expect(impliedProfitPct('100.00', '99.99')).toBeNull();
  });
});

describe('parsing and formatting', () => {
  it('converts prices and percents exactly', () => {
    expect(toCents('468')).toBe(46800);
    expect(toCents('0.5')).toBe(50);
    expect(fromCents(46917)).toBe('469.17');
    expect(fromCents(-213)).toBe('-2.13');
    expect(pctToE4('0.25')).toBe(2500);
    expect(fromPctE4(2500)).toBe('0.25');
    expect(fromPctE4(2512)).toBe('0.2512');
  });

  it('rejects malformed values', () => {
    expect(() => toCents('1.234')).toThrow();
    expect(() => toCents('-1')).toThrow();
    expect(() => pctToE4('0.12345')).toThrow();
  });

  it('formats USD with grouping and sign', () => {
    expect(formatUsd('1234.50')).toBe('$1,234.50');
    expect(formatUsd(213, { signed: true })).toBe('+$2.13');
    expect(formatUsd('-2.13')).toBe('−$2.13');
  });
});

describe('profit and gap-down', () => {
  it('profit = (sellFill − buyFill) × qty', () => {
    expect(calcProfitCents('285.00', '285.71', 3)).toBe(213);
    expect(calcProfitCents('468.00', '469.17', 2)).toBe(234);
  });

  it('reports how far below plan a buy filled', () => {
    expect(belowPlanCents({ buyPrice: '250.00', buyFillPrice: '247.30' })).toBe(270);
    expect(belowPlanCents({ buyPrice: '250.00', buyFillPrice: null })).toBe(0);
  });
});
