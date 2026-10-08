/** History tab: date-range presets and realised P&L totals. */
import type { Order } from '@/types/order';
import { etParts } from './market-hours';
import { toCentsSigned } from './price';

export type RangePreset = 'today' | '7d' | '30d' | 'all';

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All' },
];

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Inclusive trade-date range (ET calendar days, today included). */
export function rangeFor(preset: RangePreset, now: Date = new Date()): { from?: string; to?: string } {
  const today = etParts(now).date;
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case '7d':
      return { from: addDays(today, -6), to: today };
    case '30d':
      return { from: addDays(today, -29), to: today };
    case 'all':
      return {};
  }
}

export interface HistoryTotals {
  /** Round trips completed (sell filled). */
  trades: number;
  wins: number;
  /** Realised profit in cents across completed trades. */
  profitCents: number;
  /** Buys cancelled at close or rejected — no position taken. */
  cancelled: number;
}

export function historyTotals(orders: Order[]): HistoryTotals {
  const t: HistoryTotals = { trades: 0, wins: 0, profitCents: 0, cancelled: 0 };
  for (const o of orders) {
    if (o.sellStatus === 'FILLED') {
      const p = toCentsSigned(o.profit ?? '0.00');
      t.trades += 1;
      t.profitCents += p;
      if (p > 0) t.wins += 1;
    } else if (o.filledQty === 0) {
      t.cancelled += 1;
    }
  }
  return t;
}
