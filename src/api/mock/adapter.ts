/**
 * Mock implementation of the Manual Bot API contract (see docs/backend-contract.md).
 * Same request/response shapes as the real server, so only the transport changes.
 */
import type { ApiRequest, ApiResponse, Transport } from '@/api/client';
import type { Order, OrdersTab, Quote } from '@/types/order';
import { computeMarketStatus } from '@/utils/market-hours';
import { isClosed } from '@/utils/order-status';
import { fromCents, toCents } from '@/utils/price';
import { db, DEMO_USER, toListItem } from './db';

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
const error = (status: number, code: string, message: string) => json(status, { code, message });

// --- quotes: a gentle random walk around each symbol's reference price ---
const lastPrice = new Map<string, number>();

function quoteFor(symbol: string): Quote {
  let cents = lastPrice.get(symbol);
  if (cents === undefined) {
    const ref = db.orders.find((o) => o.symbol === symbol);
    const base = ref ? toCents(ref.buyFillPrice ?? ref.buyPrice) : 10_000;
    cents = Math.round(base * 1.001);
  }
  const drift = Math.round(cents * (Math.random() - 0.5) * 0.001);
  cents = Math.max(1, cents + drift);
  lastPrice.set(symbol, cents);
  return { symbol, last: fromCents(cents), asOf: new Date().toISOString() };
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

  if (method === 'GET' && path === '/market-status') {
    return json(200, computeMarketStatus());
  }

  if (method === 'GET' && path === '/quotes') {
    const symbols = (req.query?.symbols ?? '').split(',').filter(Boolean);
    return json(200, { quotes: symbols.map(quoteFor) });
  }

  if (method === 'GET' && path === '/orders') {
    return listOrders(req.query);
  }

  const detail = path.match(/^\/orders\/([^/]+)$/);
  if (detail && method === 'GET') {
    const order = db.orders.find((o) => o.id === decodeURIComponent(detail[1]));
    return order ? json(200, order) : error(404, 'NOT_FOUND', 'Order not found');
  }

  return error(404, 'NOT_FOUND', `No mock route for ${method} ${path}`);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockTransport: Transport = async (req) => {
  await delay(200 + Math.random() * 300);
  // Return copies so callers can't mutate the store through responses.
  const res = route(req);
  return { status: res.status, body: JSON.parse(JSON.stringify(res.body)) };
};
