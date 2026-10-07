/**
 * In-memory order store for EXPO_PUBLIC_MOCK mode. Seeded on each JS reload
 * with one order in every interesting state. Mock only — never used against
 * the real backend.
 */
import type { LegStatus, Order, OrderDetail, OrderEvent } from '@/types/order';
import {
  computeMarketStatus,
  etParts,
  isTradingDay,
  previousTradingDayBefore,
} from '@/utils/market-hours';
import { calcProfitCents, calcSellPrice, fromCents } from '@/utils/price';

export const DEMO_USER = {
  id: 'u_demo',
  email: 'demo@zaptrade.ai',
  name: 'Demo Trader',
  password: 'demo1234',
};

let seq = 1000;
export function nextId(prefix: string) {
  seq += 1;
  return `${prefix}_${seq}`;
}

export function brokerId() {
  return String(Math.floor(1_000_000_000 + Math.random() * 8_999_999_999));
}

/** ISO time `minutesAgo` before now. */
function ago(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

interface SeedSpec {
  symbol: string;
  tradeDate: string;
  qty: number;
  buyPrice: string;
  profitPct: string;
  buyStatus: LegStatus;
  buyFillPrice?: string;
  filledQty?: number;
  sellStatus?: LegStatus;
  sellFillPrice?: string;
  rejectReason?: string;
  cancelReason?: string;
  minutesAgo: number;
}

function buildOrder(s: SeedSpec): OrderDetail {
  const created = ago(s.minutesAgo + 60);
  const buyAt = ago(s.minutesAgo);
  const sellAt = ago(Math.max(0, s.minutesAgo - 20));
  const filledQty = s.filledQty ?? (s.buyStatus === 'FILLED' ? s.qty : 0);
  const hasFill = !!s.buyFillPrice && filledQty > 0;
  const sellPrice = hasFill ? calcSellPrice(s.buyFillPrice!, s.profitPct) : null;
  const sellStatus = hasFill ? (s.sellStatus ?? 'WORKING') : null;
  const profit =
    sellStatus === 'FILLED' && s.sellFillPrice
      ? fromCents(calcProfitCents(s.buyFillPrice!, s.sellFillPrice, filledQty))
      : null;

  const events: OrderEvent[] = [
    { type: 'CREATED', at: created, message: `Order created: ${s.qty} ${s.symbol} @ $${s.buyPrice}`, source: 'web' },
    { type: 'QUEUED', at: created, message: `Queued for ${s.tradeDate}`, source: 'bot' },
  ];
  if (s.buyStatus !== 'QUEUED') {
    events.push({ type: 'BUY_WORKING', at: ago(s.minutesAgo + 30), message: 'Limit buy live at Schwab', source: 'bot' });
  }
  if (hasFill) {
    events.push({
      type: filledQty < s.qty ? 'BUY_PARTIAL' : 'BUY_FILLED',
      at: buyAt,
      message: `Bought ${filledQty}/${s.qty} @ $${s.buyFillPrice}`,
      source: 'bot',
    });
    events.push({ type: 'SELL_PLACED', at: buyAt, message: `Sell limit placed @ $${sellPrice}`, source: 'bot' });
  }
  if (sellStatus === 'FILLED') {
    events.push({ type: 'SELL_FILLED', at: sellAt, message: `Sold @ $${s.sellFillPrice} · P&L $${profit}`, source: 'bot' });
  }
  if (s.buyStatus === 'CANCELLED') {
    events.push({ type: 'CANCELLED', at: buyAt, message: s.cancelReason ?? 'Cancelled', source: 'bot' });
  }
  if (s.buyStatus === 'REJECTED') {
    events.push({ type: 'REJECTED', at: buyAt, message: `Rejected: ${s.rejectReason}`, source: 'bot' });
  }

  return {
    id: nextId('ord'),
    symbol: s.symbol,
    tradeDate: s.tradeDate,
    qty: s.qty,
    filledQty,
    buyPrice: s.buyPrice,
    buyStatus: s.buyStatus,
    buyFillPrice: hasFill ? s.buyFillPrice! : null,
    buyBrokerOrderId: s.buyStatus === 'QUEUED' ? null : brokerId(),
    buyUpdatedAt: s.buyStatus === 'QUEUED' ? null : buyAt,
    profitPct: s.profitPct,
    sellPrice,
    sellStatus,
    sellFillPrice: sellStatus === 'FILLED' ? s.sellFillPrice! : null,
    sellBrokerOrderId: sellStatus ? brokerId() : null,
    sellUpdatedAt: sellStatus === 'FILLED' ? sellAt : sellStatus ? buyAt : null,
    profit,
    cancelReason: s.cancelReason ?? null,
    rejectReason: s.rejectReason ?? null,
    version: 1,
    source: 'web',
    createdAt: created,
    events,
  };
}

function seed(): OrderDetail[] {
  const today = etParts(new Date()).date;
  const session = isTradingDay(today) ? today : previousTradingDayBefore(today);
  const prev = previousTradingDayBefore(session);
  const next = computeMarketStatus().nextTradingDate;

  const specs: SeedSpec[] = [
    // Open
    { symbol: 'AXON', tradeDate: session, qty: 2, buyPrice: '468.00', profitPct: '0.25', buyStatus: 'FILLED', buyFillPrice: '468.00', minutesAgo: 95 },
    { symbol: 'TSLA', tradeDate: session, qty: 3, buyPrice: '250.00', profitPct: '0.5', buyStatus: 'FILLED', buyFillPrice: '247.30', minutesAgo: 120 },
    { symbol: 'AMD', tradeDate: session, qty: 10, buyPrice: '160.00', profitPct: '0.3', buyStatus: 'WORKING', buyFillPrice: '160.00', filledQty: 6, minutesAgo: 40 },
    { symbol: 'AAPL', tradeDate: session, qty: 4, buyPrice: '255.20', profitPct: '0.25', buyStatus: 'WORKING', minutesAgo: 60 },
    { symbol: 'META', tradeDate: session, qty: 1, buyPrice: '710.00', profitPct: '0.4', buyStatus: 'REJECTED', rejectReason: 'Insufficient buying power', minutesAgo: 70 },
    { symbol: 'NVDA', tradeDate: next, qty: 5, buyPrice: '180.50', profitPct: '0.3', buyStatus: 'QUEUED', minutesAgo: 10 },
    // History
    { symbol: 'MRVL', tradeDate: prev, qty: 3, buyPrice: '285.00', profitPct: '0.25', buyStatus: 'FILLED', buyFillPrice: '285.00', sellStatus: 'FILLED', sellFillPrice: '285.71', minutesAgo: 1500 },
    { symbol: 'AMZN', tradeDate: prev, qty: 2, buyPrice: '220.00', profitPct: '0.25', buyStatus: 'FILLED', buyFillPrice: '220.00', sellStatus: 'FILLED', sellFillPrice: '220.55', minutesAgo: 1560 },
    { symbol: 'GOOG', tradeDate: prev, qty: 3, buyPrice: '240.00', profitPct: '0.3', buyStatus: 'CANCELLED', cancelReason: 'Not filled by market close', minutesAgo: 1620 },
  ];
  return specs.map(buildOrder);
}

export const db = {
  orders: seed(),
};

/** Strip the timeline for list responses. */
export function toListItem({ events: _events, ...order }: OrderDetail): Order {
  return order;
}
