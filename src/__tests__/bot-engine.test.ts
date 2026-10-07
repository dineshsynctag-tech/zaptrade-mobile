/**
 * Mock bot engine + order API rules: buy fill (incl. gap-down), GTC sell from
 * the actual fill, end-of-day expiry, edit rules, 409s and idempotency.
 */
import { beforeEach, describe, expect, it } from '@jest/globals';

import type { ApiRequest } from '@/api/client';
import { handle } from '@/api/mock/adapter';
import { db } from '@/api/mock/db';
import { endOfDay, processOrder, setPrice, sim } from '@/api/mock/simulator';
import type { LoginResponse, OrderDetail } from '@/types/order';
import { toCents } from '@/utils/price';

let auth: Record<string, string>;

function call(req: Omit<ApiRequest, 'headers'> & { headers?: Record<string, string> }) {
  return handle({ ...req, headers: { ...auth, ...req.headers } });
}

function create(symbol: string, buyPrice: string, profitPct = '0.25', qty = 2, key?: string) {
  return call({
    method: 'POST',
    path: '/orders',
    body: { symbol, tradeDate: sim.sessionDate, qty, buyPrice, profitPct },
    headers: key ? { 'Idempotency-Key': key } : {},
  });
}

function fresh(id: string): OrderDetail {
  return db.orders.find((o) => o.id === id)!;
}

beforeEach(() => {
  // Freeze the random walk; tests drive prices explicitly.
  sim.lastTick = Date.now() + 1e12;
  sim.marketOpen = true;
  const login = handle({
    method: 'POST',
    path: '/auth/login',
    body: { email: 'demo@zaptrade.ai', password: 'demo1234' },
    headers: {},
  });
  auth = { Authorization: `Bearer ${(login.body as LoginResponse).accessToken}` };
});

describe('buy leg (day limit)', () => {
  it('goes live and waits while price is above plan', () => {
    setPrice('MSFT', toCents('505.00'));
    const order = create('MSFT', '500.00').body as OrderDetail;
    expect(order.buyStatus).toBe('WORKING');
    expect(order.sellStatus).toBeNull();
  });

  it('fills at the plan when price reaches it, then places the GTC sell from the fill', () => {
    setPrice('TSM', toCents('470.00'));
    const { id } = create('TSM', '468.00').body as OrderDetail;
    processOrder(fresh(id), toCents('468.00'));
    const o = fresh(id);
    expect(o.buyStatus).toBe('FILLED');
    expect(o.buyFillPrice).toBe('468.00');
    expect(o.sellStatus).toBe('WORKING');
    expect(o.sellPrice).toBe('469.17');
  });

  it('gap-down: fills at the lower price and calculates the sell from the actual fill', () => {
    setPrice('MRVL', toCents('283.10'));
    const o = create('MRVL', '285.00').body as OrderDetail;
    expect(o.buyStatus).toBe('FILLED');
    expect(o.buyFillPrice).toBe('283.10');
    expect(o.sellPrice).toBe('283.81'); // 283.10 × 1.0025 = 283.81 (not 285.71)
  });
});

describe('sell leg (GTC)', () => {
  it('waits below the sell price and fills at ≥ sell price with profit', () => {
    setPrice('NFLX', toCents('100.00'));
    const { id } = create('NFLX', '100.00', '0.5', 4).body as OrderDetail;
    expect(fresh(id).sellPrice).toBe('100.50');

    processOrder(fresh(id), toCents('100.49'));
    expect(fresh(id).sellStatus).toBe('WORKING');

    processOrder(fresh(id), toCents('100.50'));
    const o = fresh(id);
    expect(o.sellStatus).toBe('FILLED');
    expect(o.sellFillPrice).toBe('100.50');
    expect(o.profit).toBe('2.00'); // (100.50 − 100.00) × 4
  });

  it('survives the market close and keeps working the next session', () => {
    setPrice('UBER', toCents('80.00'));
    const { id } = create('UBER', '80.00').body as OrderDetail;
    const day = sim.sessionDate;
    endOfDay();
    expect(sim.sessionDate > day).toBe(true);
    expect(fresh(id).sellStatus).toBe('WORKING');
    expect(fresh(id).buyStatus).toBe('FILLED');
  });
});

describe('end of day', () => {
  it('cancels a buy that was not filled by the close', () => {
    setPrice('ORCL', toCents('210.00'));
    const { id } = create('ORCL', '200.00').body as OrderDetail;
    endOfDay();
    const o = fresh(id);
    expect(o.buyStatus).toBe('CANCELLED');
    expect(o.cancelReason).toBe('Not filled by market close');
    expect(o.sellStatus).toBeNull();
  });

  it('partial fill: cancels only the remainder; the sell keeps working', () => {
    setPrice('CRM', toCents('300.00'));
    const { id } = create('CRM', '250.00', '0.25', 10).body as OrderDetail;
    const o = fresh(id);
    // Simulate a broker partial fill of 6 with the sell placed for those shares.
    Object.assign(o, { filledQty: 6, buyFillPrice: '250.00', sellStatus: 'WORKING', sellPrice: '250.63' });
    endOfDay();
    expect(fresh(id).buyStatus).toBe('CANCELLED');
    expect(fresh(id).cancelReason).toBe('Remaining 4 not filled by market close');
    expect(fresh(id).sellStatus).toBe('WORKING');
  });
});

describe('edit, delete and retry rules', () => {
  it('full edit of an unfilled buy (cancel/replace)', () => {
    setPrice('INTC', toCents('40.00'));
    const o = create('INTC', '35.00').body as OrderDetail;
    const res = call({
      method: 'PATCH',
      path: `/orders/${o.id}`,
      body: { version: o.version, qty: 5, buyPrice: '36.00' },
    });
    expect(res.status).toBe(200);
    expect((res.body as OrderDetail).qty).toBe(5);
    expect((res.body as OrderDetail).buyBrokerOrderId).not.toBe(o.buyBrokerOrderId);
  });

  it('after the buy fills only the profit target can change; sell recalculated from the fill', () => {
    setPrice('SHOP', toCents('99.00'));
    const o = create('SHOP', '100.00').body as OrderDetail; // fills at 99.00
    const blocked = call({
      method: 'PATCH',
      path: `/orders/${o.id}`,
      body: { version: o.version, buyPrice: '98.00' },
    });
    expect(blocked.status).toBe(422);

    const ok = call({
      method: 'PATCH',
      path: `/orders/${o.id}`,
      body: { version: o.version, profitPct: '1' },
    });
    expect(ok.status).toBe(200);
    expect((ok.body as OrderDetail).sellPrice).toBe('99.99'); // 99.00 × 1.01
  });

  it('rejects a stale edit with 409', () => {
    setPrice('COIN', toCents('300.00'));
    const o = create('COIN', '290.00').body as OrderDetail;
    processOrder(fresh(o.id), toCents('290.00')); // bot fills it → version bumps
    const res = call({
      method: 'PATCH',
      path: `/orders/${o.id}`,
      body: { version: o.version, qty: 9 },
    });
    expect(res.status).toBe(409);
    expect((res.body as { code: string }).code).toBe('STALE_ORDER');
  });

  it('delete cancels the buy, or the GTC sell once bought', () => {
    setPrice('JPM', toCents('320.00'));
    const unfilled = create('JPM', '300.00').body as OrderDetail;
    const del = call({ method: 'DELETE', path: `/orders/${unfilled.id}`, query: { version: String(unfilled.version) } });
    expect((del.body as OrderDetail).buyStatus).toBe('CANCELLED');

    setPrice('V', toCents('340.00'));
    const bought = create('V', '345.00').body as OrderDetail;
    const del2 = call({ method: 'DELETE', path: `/orders/${bought.id}`, query: { version: String(bought.version) } });
    expect((del2.body as OrderDetail).sellStatus).toBe('CANCELLED');
    expect((del2.body as OrderDetail).filledQty).toBe(2);
  });

  it('rejects orders over buying power and allows retry after editing', () => {
    setPrice('AVGO', toCents('400.00'));
    const o = create('AVGO', '390.00', '0.25', 200).body as OrderDetail; // $78k > $50k
    expect(o.buyStatus).toBe('REJECTED');
    expect(o.rejectReason).toBe('Insufficient buying power');
    const edited = call({ method: 'PATCH', path: `/orders/${o.id}`, body: { version: o.version, qty: 10 } });
    expect((edited.body as OrderDetail).buyStatus).toBe('WORKING');
    expect((edited.body as OrderDetail).rejectReason).toBeNull();
  });
});

describe('create safeguards', () => {
  it('double tap with the same Idempotency-Key creates one order', () => {
    setPrice('PLTR', toCents('190.00'));
    const before = db.orders.length;
    const a = create('PLTR', '180.00', '0.25', 2, 'key-123').body as OrderDetail;
    const b = create('PLTR', '180.00', '0.25', 2, 'key-123').body as OrderDetail;
    expect(b.id).toBe(a.id);
    expect(db.orders.length).toBe(before + 1);
  });

  it('flags a duplicate open order for the same symbol and day unless confirmed', () => {
    setPrice('SMCI', toCents('50.00'));
    create('SMCI', '45.00');
    const dup = create('SMCI', '44.00');
    expect(dup.status).toBe(409);
    expect((dup.body as { code: string }).code).toBe('DUPLICATE_ORDER');
    const confirmed = call({
      method: 'POST',
      path: '/orders',
      body: { symbol: 'SMCI', tradeDate: sim.sessionDate, qty: 1, buyPrice: '44.00', profitPct: '0.25', confirmDuplicate: true },
    });
    expect(confirmed.status).toBe(201);
  });

  it('validates symbol, qty and profit % on the server', () => {
    expect(create('ZZZZ', '10.00').status).toBe(422);
    expect(create('AAPL', '10.00', '0').status).toBe(422);
    expect(create('AAPL', '10.00', '0.25', 0).status).toBe(422);
  });
});
