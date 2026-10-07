/**
 * Mock bot engine. Models the real Manual Bot's rules so the app can be
 * exercised end to end without Schwab. The real backend is authoritative.
 *
 * Buy leg  (DAY limit):
 *   QUEUED → WORKING when the session for its trade date is open.
 *   Fills when price ≤ planned buy. If price is already below plan (gap-down)
 *   it fills at that lower price.
 *   Anything still unfilled at the close is cancelled ("Not filled by market close").
 *
 * Sell leg (GTC limit), placed as soon as shares are bought:
 *   sell = round(actual_fill × (1 + profit% / 100), 2)  — from the real fill, not the plan
 *   Stays WORKING across sessions until price ≥ sell, then FILLED at the sell price.
 *   Profit = (sell_fill − buy_fill) × filled qty.
 */
import type { OrderDetail, OrderEvent, OrderEventType } from '@/types/order';
import { computeMarketStatus, nextTradingDayAfter } from '@/utils/market-hours';
import { calcProfitCents, calcSellPrice, fromCents, toCents } from '@/utils/price';
import { brokerId, db } from './db';

/** Orders whose cost exceeds this are rejected by the "broker". */
export const MOCK_BUYING_POWER_CENTS = 50_000_00;

const TICK_MS = 3_000;
const VOLATILITY = 0.0008; // per tick

export const sim = {
  /** The trading day the mock session represents. */
  sessionDate: computeMarketStatus().nextTradingDate,
  /** Mock market is open by default so fills can be seen at any hour. */
  marketOpen: true,
  lastTick: Date.now(),
};

// --- prices ---------------------------------------------------------------
const prices = new Map<string, number>();

export function priceOf(symbol: string): number {
  let cents = prices.get(symbol);
  if (cents === undefined) {
    const ref = db.orders.find((o) => o.symbol === symbol);
    // Start just above the reference so an unfilled buy triggers soon.
    const base = ref ? toCents(ref.buyFillPrice ?? ref.buyPrice) : 100_00;
    cents = Math.round(base * 1.0015);
    prices.set(symbol, cents);
  }
  return cents;
}

/** Test/dev hook: pin a symbol's price. */
export function setPrice(symbol: string, cents: number) {
  prices.set(symbol, cents);
}

function step(symbol: string) {
  const cents = priceOf(symbol);
  const move = Math.round(cents * VOLATILITY * (Math.random() * 2 - 1));
  prices.set(symbol, Math.max(1, cents + move));
}

// --- bot events (push notifications hook in here in P3) -------------------
export interface BotEvent {
  type: 'BUY_FILLED' | 'SELL_FILLED' | 'REJECTED' | 'EXPIRED';
  order: OrderDetail;
}
type Listener = (e: BotEvent) => void;
const listeners = new Set<Listener>();

export function onBotEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(e: BotEvent) {
  listeners.forEach((l) => l(e));
}

// --- order processing -----------------------------------------------------
export function addEvent(
  order: OrderDetail,
  type: OrderEventType,
  message: string,
  source: OrderEvent['source'] = 'bot',
) {
  const at = new Date().toISOString();
  order.events.push({ type, at, message, source });
  order.version += 1;
  return at;
}

function placeOrReplaceSell(order: OrderDetail) {
  order.sellPrice = calcSellPrice(order.buyFillPrice!, order.profitPct);
  order.sellStatus = 'WORKING';
  order.sellBrokerOrderId = brokerId();
  order.sellUpdatedAt = addEvent(
    order,
    'SELL_PLACED',
    `GTC sell placed: ${order.filledQty} @ $${order.sellPrice} (+${order.profitPct}% on fill $${order.buyFillPrice})`,
  );
}

/** Apply one price observation to one order. Returns true if it changed. */
export function processOrder(order: OrderDetail, priceCents: number): boolean {
  const before = order.version;

  // Queue → live at the open of its trading day.
  if (order.buyStatus === 'QUEUED' && sim.marketOpen && order.tradeDate <= sim.sessionDate) {
    if (toCents(order.buyPrice) * order.qty > MOCK_BUYING_POWER_CENTS) {
      order.buyStatus = 'REJECTED';
      order.rejectReason = 'Insufficient buying power';
      order.buyUpdatedAt = addEvent(order, 'REJECTED', 'Rejected by broker: insufficient buying power');
      emit({ type: 'REJECTED', order });
      return true;
    }
    order.buyStatus = 'WORKING';
    order.buyBrokerOrderId = brokerId();
    order.buyUpdatedAt = addEvent(order, 'BUY_WORKING', `Day limit buy live at Schwab @ $${order.buyPrice}`);
  }

  // Buy fills at the limit, or lower if the price is already below plan.
  if (order.buyStatus === 'WORKING' && sim.marketOpen && priceCents <= toCents(order.buyPrice)) {
    const fillCents = Math.min(priceCents, toCents(order.buyPrice));
    const newQty = order.qty - order.filledQty;
    const prevCents = order.buyFillPrice ? toCents(order.buyFillPrice) : 0;
    // Average price across a partial fill and this one, rounded to the cent.
    const avg = Math.round((prevCents * order.filledQty + fillCents * newQty) / order.qty);

    order.filledQty = order.qty;
    order.buyFillPrice = fromCents(avg);
    order.buyStatus = 'FILLED';
    order.buyUpdatedAt = addEvent(order, 'BUY_FILLED', `Bought ${newQty} @ $${fromCents(fillCents)}`);
    placeOrReplaceSell(order);
    emit({ type: 'BUY_FILLED', order });
  }

  // GTC sell triggers at price ≥ sell price.
  if (
    order.sellStatus === 'WORKING' &&
    order.sellPrice &&
    sim.marketOpen &&
    priceCents >= toCents(order.sellPrice)
  ) {
    order.sellStatus = 'FILLED';
    order.sellFillPrice = order.sellPrice;
    order.profit = fromCents(calcProfitCents(order.buyFillPrice!, order.sellFillPrice, order.filledQty));
    // Any unfilled buy remainder is moot once the position is sold.
    if (order.buyStatus === 'WORKING') {
      order.buyStatus = 'CANCELLED';
      order.cancelReason = `Remaining ${order.qty - order.filledQty} cancelled after sell`;
    }
    order.sellUpdatedAt = addEvent(
      order,
      'SELL_FILLED',
      `Sold ${order.filledQty} @ $${order.sellFillPrice} · P&L $${order.profit}`,
    );
    emit({ type: 'SELL_FILLED', order });
  }

  return order.version !== before;
}

/** Advance the price walk for elapsed time and run the bot over all orders. */
export function tick(now = Date.now()) {
  const steps = Math.min(20, Math.floor((now - sim.lastTick) / TICK_MS));
  if (steps <= 0) return;
  sim.lastTick += steps * TICK_MS;

  const active = db.orders.filter(
    (o) => o.buyStatus === 'QUEUED' || o.buyStatus === 'WORKING' || o.sellStatus === 'WORKING',
  );
  const symbols = new Set(active.map((o) => o.symbol));
  for (let i = 0; i < steps; i++) {
    symbols.forEach(step);
    active.forEach((o) => processOrder(o, priceOf(o.symbol)));
  }
}

/**
 * Market close: day buys still unfilled are cancelled. A partially filled
 * buy keeps its shares; only the remainder is cancelled, and its GTC sell
 * carries on into the next session. Then the session rolls forward.
 */
export function endOfDay() {
  for (const order of db.orders) {
    const live = order.buyStatus === 'QUEUED' || order.buyStatus === 'WORKING';
    if (!live || order.tradeDate > sim.sessionDate) continue;

    const remaining = order.qty - order.filledQty;
    order.buyStatus = 'CANCELLED';
    order.cancelReason =
      order.filledQty > 0
        ? `Remaining ${remaining} not filled by market close`
        : 'Not filled by market close';
    order.buyUpdatedAt = addEvent(order, 'CANCELLED', `Day buy expired: ${order.cancelReason}`);
    emit({ type: 'EXPIRED', order });
  }
  sim.sessionDate = nextTradingDayAfter(sim.sessionDate);
}
