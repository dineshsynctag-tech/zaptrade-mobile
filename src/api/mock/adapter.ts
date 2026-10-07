/**
 * Mock implementation of the Manual Bot API contract (see docs/backend-contract.md).
 * Same request/response shapes as the real server, so only the transport changes.
 */
import type { ApiRequest, ApiResponse, Transport } from '@/api/client';
import type {
  CreateOrderInput,
  MarketStatus,
  Order,
  OrderDetail,
  OrdersTab,
  UpdateOrderInput,
} from '@/types/order';
import { canDelete, checkPatchAllowed, deleteEffect, getEditability } from '@/utils/edit-rules';
import { computeMarketStatus, isTradingDay } from '@/utils/market-hours';
import { isClosed } from '@/utils/order-status';
import { calcSellPrice, fromCents, isValidPct, isValidPrice, pctToE4, toCents } from '@/utils/price';
import { brokerId, db, DEMO_USER, nextId, toListItem } from './db';
import { addEvent, priceOf, processOrder, sim, tick } from './simulator';
import { MOCK_SYMBOLS } from './symbols';

const ACCESS_TTL_MS = 15 * 60_000;

function issueTokens() {
  const rand = Math.random().toString(36).slice(2, 10);
  return {
    accessToken: `mock.${Date.now() + ACCESS_TTL_MS}.${rand}`,
    refreshToken: `mockr.${rand}`,
  };
}

/** Mock tokens carry their own expiry so they survive JS reloads. */
function isAuthorized(req: ApiRequest): boolean {
  const token = req.headers.Authorization?.replace(/^Bearer /, '') ?? '';
  const [kind, expires] = token.split('.');
  return kind === 'mock' && Number(expires) > Date.now();
}

const json = (status: number, body: unknown): ApiResponse => ({ status, body });
const error = (status: number, code: string, message: string, details?: unknown) =>
  json(status, { code, message, details });

// --- idempotency: same key + route replays the first successful response ---
const idempotent = new Map<string, ApiResponse>();

// --- validation shared by create and edit ---
function validateFields(f: Partial<CreateOrderInput>, partial: boolean): string | null {
  if (!partial || f.symbol !== undefined) {
    if (!f.symbol || !MOCK_SYMBOLS[f.symbol]) return `Unknown symbol "${f.symbol ?? ''}"`;
  }
  if (!partial || f.tradeDate !== undefined) {
    if (!f.tradeDate || !isTradingDay(f.tradeDate)) return 'Trade date must be a trading day';
    if (f.tradeDate < sim.sessionDate) return 'Trade date is in the past';
  }
  if (!partial || f.qty !== undefined) {
    if (!Number.isInteger(f.qty) || f.qty! <= 0) return 'Quantity must be a whole number above 0';
  }
  if (!partial || f.buyPrice !== undefined) {
    if (!f.buyPrice || !isValidPrice(f.buyPrice) || toCents(f.buyPrice) <= 0) return 'Invalid buy price';
  }
  if (!partial || f.profitPct !== undefined) {
    if (!f.profitPct || !isValidPct(f.profitPct) || pctToE4(f.profitPct) <= 0) {
      return 'Profit % must be greater than 0';
    }
  }
  return null;
}

function findOrder(id: string) {
  return db.orders.find((o) => o.id === decodeURIComponent(id));
}

function marketStatus(): MarketStatus {
  const real = computeMarketStatus();
  return {
    ...real,
    state: sim.marketOpen ? 'open' : 'closed',
    nextTradingDate: sim.sessionDate,
  };
}

function listOrders(query: ApiRequest['query'] = {}) {
  const tab = (query.tab ?? 'open') as OrdersTab;
  const search = query.search?.trim().toUpperCase();
  const { from, to } = query;

  const orders: Order[] = db.orders
    .filter((o) => (tab === 'history' ? isClosed(o) : !isClosed(o)))
    .filter((o) => !search || o.symbol.includes(search))
    .filter((o) => (!from || o.tradeDate >= from) && (!to || o.tradeDate <= to))
    .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate) || b.createdAt.localeCompare(a.createdAt))
    .map(toListItem);

  return json(200, { orders, total: orders.length });
}

function createOrder(body: CreateOrderInput) {
  const input = { ...body, symbol: body.symbol?.toUpperCase() };
  const invalid = validateFields(input, false);
  if (invalid) return error(422, 'VALIDATION', invalid);

  const dup = db.orders.find(
    (o) => !isClosed(o) && o.symbol === input.symbol && o.tradeDate === input.tradeDate,
  );
  if (dup && !input.confirmDuplicate) {
    return error(409, 'DUPLICATE_ORDER', `You already have an open ${input.symbol} order for this day.`, {
      orderId: dup.id,
    });
  }

  const now = new Date().toISOString();
  const order: OrderDetail = {
    id: nextId('ord'),
    symbol: input.symbol,
    tradeDate: input.tradeDate,
    qty: input.qty,
    filledQty: 0,
    buyPrice: input.buyPrice,
    buyStatus: 'QUEUED',
    buyFillPrice: null,
    buyBrokerOrderId: null,
    buyUpdatedAt: now,
    profitPct: input.profitPct,
    sellPrice: null,
    sellStatus: null,
    sellFillPrice: null,
    sellBrokerOrderId: null,
    sellUpdatedAt: null,
    cancelReason: null,
    profit: null,
    rejectReason: null,
    version: 0,
    source: 'mobile',
    createdAt: now,
    events: [],
  };
  addEvent(order, 'CREATED', `Order created: ${order.qty} ${order.symbol} @ $${order.buyPrice}, +${order.profitPct}%`, 'mobile');
  addEvent(order, 'QUEUED', `Queued for ${order.tradeDate}`);
  db.orders.push(order);
  processOrder(order, priceOf(order.symbol));
  return json(201, order);
}

function updateOrder(order: OrderDetail, patch: UpdateOrderInput) {
  if (patch.version !== order.version) {
    return error(409, 'STALE_ORDER', 'This order changed on the server. Refresh and try again.');
  }
  const blocked = checkPatchAllowed(order, patch);
  if (blocked) return error(422, 'EDIT_NOT_ALLOWED', blocked);

  const { version: _v, ...fields } = patch;
  const invalid = validateFields(fields, true);
  if (invalid) return error(422, 'VALIDATION', invalid);

  if (getEditability(order) === 'full') {
    // Cancel/replace the buy at the broker with the new terms.
    Object.assign(order, Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)));
    order.rejectReason = null;
    if (order.buyStatus === 'REJECTED') order.buyStatus = 'QUEUED';
    if (order.buyStatus === 'WORKING') order.buyBrokerOrderId = brokerId();
    order.buyUpdatedAt = addEvent(
      order,
      'EDITED',
      `Edited: ${order.qty} @ $${order.buyPrice}, +${order.profitPct}%, ${order.tradeDate}`,
      'mobile',
    );
    processOrder(order, priceOf(order.symbol));
  } else {
    // Cancel/replace the GTC sell, recalculated from the actual fill.
    order.profitPct = fields.profitPct!;
    order.sellPrice = calcSellPrice(order.buyFillPrice!, order.profitPct);
    order.sellBrokerOrderId = brokerId();
    order.sellUpdatedAt = addEvent(
      order,
      'EDITED',
      `Sell replaced @ $${order.sellPrice} (+${order.profitPct}% on fill $${order.buyFillPrice})`,
      'mobile',
    );
  }
  return json(200, order);
}

function deleteOrder(order: OrderDetail, version: number) {
  if (version !== order.version) {
    return error(409, 'STALE_ORDER', 'This order changed on the server. Refresh and try again.');
  }
  if (!canDelete(order)) return error(422, 'DELETE_NOT_ALLOWED', 'This order is already closed.');

  if (deleteEffect(order) === 'cancelSell') {
    order.sellStatus = 'CANCELLED';
    order.sellUpdatedAt = addEvent(
      order,
      'CANCELLED',
      `GTC sell cancelled by user; ${order.filledQty} shares remain in the account`,
      'mobile',
    );
    if (order.buyStatus === 'WORKING') {
      order.buyStatus = 'CANCELLED';
      order.cancelReason = 'Remaining shares cancelled by user';
    }
  } else {
    order.buyStatus = 'CANCELLED';
    order.cancelReason = 'Cancelled by user';
    order.buyUpdatedAt = addEvent(order, 'CANCELLED', 'Buy cancelled by user', 'mobile');
  }
  return json(200, order);
}

function retryOrder(order: OrderDetail, version: number) {
  if (version !== order.version) {
    return error(409, 'STALE_ORDER', 'This order changed on the server. Refresh and try again.');
  }
  if (order.buyStatus !== 'REJECTED') return error(422, 'RETRY_NOT_ALLOWED', 'Only rejected orders can be retried.');
  order.buyStatus = 'QUEUED';
  order.rejectReason = null;
  order.buyUpdatedAt = addEvent(order, 'QUEUED', 'Resubmitted by user', 'mobile');
  processOrder(order, priceOf(order.symbol));
  return json(200, order);
}

function route(req: ApiRequest): ApiResponse {
  const { method, path } = req;

  if (method === 'POST' && path === '/auth/login') {
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
    if (email?.trim().toLowerCase() !== DEMO_USER.email || password !== DEMO_USER.password) {
      return error(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
    }
    const { password: _pw, ...user } = DEMO_USER;
    return json(200, { ...issueTokens(), user });
  }

  if (method === 'POST' && path === '/auth/refresh') {
    const { refreshToken } = (req.body ?? {}) as { refreshToken?: string };
    return refreshToken?.startsWith('mockr.')
      ? json(200, issueTokens())
      : error(401, 'INVALID_REFRESH', 'Session expired');
  }

  if (!isAuthorized(req)) return error(401, 'UNAUTHORIZED', 'Not signed in');

  tick();

  if (method === 'GET' && path === '/market-status') return json(200, marketStatus());

  if (method === 'GET' && path === '/quotes') {
    const symbols = (req.query?.symbols ?? '').split(',').filter(Boolean);
    const asOf = new Date().toISOString();
    return json(200, {
      quotes: symbols.map((symbol) => ({ symbol, last: fromCents(priceOf(symbol)), asOf })),
    });
  }

  const sym = path.match(/^\/symbols\/([^/]+)$/);
  if (sym && method === 'GET') {
    const symbol = decodeURIComponent(sym[1]).toUpperCase();
    return MOCK_SYMBOLS[symbol]
      ? json(200, { symbol, name: MOCK_SYMBOLS[symbol] })
      : error(404, 'UNKNOWN_SYMBOL', `Unknown symbol "${symbol}"`);
  }

  if (path === '/orders' && method === 'GET') return listOrders(req.query);
  if (path === '/orders' && method === 'POST') return createOrder(req.body as CreateOrderInput);

  const retry = path.match(/^\/orders\/([^/]+)\/retry$/);
  if (retry && method === 'POST') {
    const order = findOrder(retry[1]);
    if (!order) return error(404, 'NOT_FOUND', 'Order not found');
    return retryOrder(order, Number((req.body as { version?: number })?.version));
  }

  const one = path.match(/^\/orders\/([^/]+)$/);
  if (one) {
    const order = findOrder(one[1]);
    if (!order) return error(404, 'NOT_FOUND', 'Order not found');
    if (method === 'GET') return json(200, order);
    if (method === 'PATCH') return updateOrder(order, req.body as UpdateOrderInput);
    if (method === 'DELETE') return deleteOrder(order, Number(req.query?.version));
  }

  return error(404, 'NOT_FOUND', `No mock route for ${method} ${path}`);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Synchronous core, exported for tests. */
export function handle(req: ApiRequest): ApiResponse {
  const key = req.headers['Idempotency-Key'];
  const cacheKey = key ? `${req.method} ${req.path} ${key}` : null;
  const cached = cacheKey ? idempotent.get(cacheKey) : undefined;
  if (cached) return cached;

  const res = route(req);
  // Copy so callers can't mutate the store through responses.
  const out = { status: res.status, body: JSON.parse(JSON.stringify(res.body)) };
  if (cacheKey && out.status >= 200 && out.status < 300) idempotent.set(cacheKey, out);
  return out;
}

export const mockTransport: Transport = async (req) => {
  await delay(200 + Math.random() * 300);
  return handle(req);
};
