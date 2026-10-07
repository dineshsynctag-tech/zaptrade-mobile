import type {
  ListOrdersParams,
  ListOrdersResponse,
  LoginResponse,
  MarketStatus,
  OrderDetail,
  Quote,
} from '@/types/order';
import { api } from './client';

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
  return api.request<OrderDetail>('GET', `/orders/${encodeURIComponent(id)}`);
}

export function getMarketStatus() {
  return api.request<MarketStatus>('GET', '/market-status');
}

export function getQuotes(symbols: string[]) {
  return api.request<{ quotes: Quote[] }>('GET', '/quotes', {
    query: { symbols: symbols.join(',') },
  });
}
