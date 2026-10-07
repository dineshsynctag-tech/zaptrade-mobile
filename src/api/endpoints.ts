import type {
  CreateOrderInput,
  ListOrdersParams,
  ListOrdersResponse,
  LoginResponse,
  MarketStatus,
  OrderDetail,
  Quote,
  SymbolInfo,
  UpdateOrderInput,
} from '@/types/order';
import { api } from './client';

const orderPath = (id: string) => `/orders/${encodeURIComponent(id)}`;

export function login(email: string, password: string) {
  return api.request<LoginResponse>('POST', '/auth/login', {
    body: { email, password },
    auth: false,
  });
}

export function listOrders(params: ListOrdersParams) {
  return api.request<ListOrdersResponse>('GET', '/orders', {
    query: { tab: params.tab, search: params.search, from: params.from, to: params.to },
  });
}

export function getOrder(id: string) {
  return api.request<OrderDetail>('GET', orderPath(id));
}

export function createOrder(input: CreateOrderInput, idempotencyKey: string) {
  return api.request<OrderDetail>('POST', '/orders', { body: input, idempotencyKey });
}

export function updateOrder(id: string, patch: UpdateOrderInput, idempotencyKey: string) {
  return api.request<OrderDetail>('PATCH', orderPath(id), { body: patch, idempotencyKey });
}

/** Cancels at the broker if live, then marks the order cancelled. */
export function deleteOrder(id: string, version: number) {
  return api.request<OrderDetail>('DELETE', orderPath(id), { query: { version: String(version) } });
}

/** Resubmit a broker-rejected buy. */
export function retryOrder(id: string, version: number, idempotencyKey: string) {
  return api.request<OrderDetail>('POST', `${orderPath(id)}/retry`, {
    body: { version },
    idempotencyKey,
  });
}

export function lookupSymbol(symbol: string) {
  return api.request<SymbolInfo>('GET', `/symbols/${encodeURIComponent(symbol)}`);
}

export interface DeviceRegistration {
  token: string;
  platform: 'ios' | 'android';
  /** Which order events to push; the server skips disabled kinds. */
  notify: Record<string, boolean>;
}

/** Register (or update) this device's Expo push token. */
export function registerDevice(device: DeviceRegistration) {
  return api.request<void>('POST', '/devices', { body: device });
}

export function unregisterDevice(token: string) {
  return api.request<void>('DELETE', `/devices/${encodeURIComponent(token)}`);
}

export function getMarketStatus() {
  return api.request<MarketStatus>('GET', '/market-status');
}

export function getQuotes(symbols: string[]) {
  return api.request<{ quotes: Quote[] }>('GET', '/quotes', {
    query: { symbols: symbols.join(',') },
  });
}
