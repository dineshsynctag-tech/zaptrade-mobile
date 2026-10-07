/**
 * Wire types for the Manual Bot API (`/api/v1/manual-bot`).
 * Prices travel as 2-dp decimal strings ("468.00"); profit % as a decimal
 * string with up to 4 dp ("0.25"). Never do float math on them — see utils/price.ts.
 */

export type LegStatus = 'QUEUED' | 'WORKING' | 'FILLED' | 'CANCELLED' | 'REJECTED';

export type OrderSource = 'mobile' | 'web';

export interface Order {
  id: string;
  symbol: string;
  /** Trading day the order is for, YYYY-MM-DD (ET). */
  tradeDate: string;
  qty: number;
  /** Shares bought so far; equals qty once the buy is fully filled. */
  filledQty: number;

  buyPrice: string;
  buyStatus: LegStatus;
  buyFillPrice: string | null;
  buyBrokerOrderId: string | null;
  buyUpdatedAt: string | null;

  profitPct: string;
  /** Server-computed from the actual buy fill. Null until the buy fills. */
  sellPrice: string | null;
  /** Null means no sell leg yet ("Awaiting buy fill"). */
  sellStatus: LegStatus | null;
  sellFillPrice: string | null;
  sellBrokerOrderId: string | null;
  sellUpdatedAt: string | null;

  /** Realised profit in $, set once the sell fills. */
  profit: string | null;
  rejectReason: string | null;
  /** Optimistic-concurrency version; sent back on edit/delete, 409 if stale. */
  version: number;
  source: OrderSource;
  createdAt: string;
}

export type OrderEventType =
  | 'CREATED'
  | 'QUEUED'
  | 'BUY_WORKING'
  | 'BUY_PARTIAL'
  | 'BUY_FILLED'
  | 'SELL_PLACED'
  | 'SELL_FILLED'
  | 'EDITED'
  | 'CANCELLED'
  | 'REJECTED';

export interface OrderEvent {
  type: OrderEventType;
  at: string;
  message: string;
  source?: OrderSource | 'bot';
}

export interface OrderDetail extends Order {
  events: OrderEvent[];
}

export type OrdersTab = 'open' | 'history';

export interface ListOrdersParams {
  tab: OrdersTab;
  search?: string;
  from?: string;
  to?: string;
}

export interface ListOrdersResponse {
  orders: Order[];
  total: number;
}

export type MarketState = 'pre' | 'open' | 'post' | 'closed';

export interface MarketStatus {
  state: MarketState;
  /** ISO timestamp of the next regular-session open. */
  nextOpen: string;
  /** YYYY-MM-DD: the trading day new orders default to. */
  nextTradingDate: string;
  isHoliday: boolean;
}

export interface Quote {
  symbol: string;
  last: string;
  asOf: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}
