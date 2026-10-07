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
  /**
   * Shares bought so far; equals qty once fully filled. The buy is a DAY
   * order, so any unfilled remainder is cancelled at the close.
   */
  filledQty: number;

  buyPrice: string;
  buyStatus: LegStatus;
  buyFillPrice: string | null;
  buyBrokerOrderId: string | null;
  buyUpdatedAt: string | null;

  profitPct: string;
  /** Server-computed from the actual buy fill. Null until the buy fills. */
  sellPrice: string | null;
  /**
   * Null means no sell leg yet ("Awaiting buy fill"). The sell is a GTC limit
   * for filledQty shares: it stays WORKING across sessions until price ≥ sellPrice.
   */
  sellStatus: LegStatus | null;
  sellFillPrice: string | null;
  sellBrokerOrderId: string | null;
  sellUpdatedAt: string | null;

  /**
   * Why the buy was cancelled, e.g. the day-limit buy expired unfilled at the
   * close ("Not filled by market close"). Null if not cancelled.
   */
  cancelReason: string | null;
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

export interface CreateOrderInput {
  symbol: string;
  tradeDate: string;
  qty: number;
  buyPrice: string;
  profitPct: string;
  /** Set after the user confirms a second open order for the same symbol + date. */
  confirmDuplicate?: boolean;
}

/** Fields allowed depend on the order's state — see utils/edit-rules.ts. */
export interface UpdateOrderInput {
  version: number;
  tradeDate?: string;
  qty?: number;
  buyPrice?: string;
  profitPct?: string;
}

export interface SymbolInfo {
  symbol: string;
  name: string;
}
