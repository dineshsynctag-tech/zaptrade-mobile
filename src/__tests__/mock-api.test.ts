import { describe, expect, it } from '@jest/globals';

import { mockTransport } from '@/api/mock/adapter';
import type { ApiRequest } from '@/api/client';
import type { ListOrdersResponse, LoginResponse } from '@/types/order';

const headers = { 'Content-Type': 'application/json' };

async function signedIn(): Promise<Record<string, string>> {
  const res = await mockTransport({
    method: 'POST',
    path: '/auth/login',
    body: { email: 'demo@zaptrade.ai', password: 'demo1234' },
    headers,
  });
  const { accessToken } = res.body as LoginResponse;
  return { ...headers, Authorization: `Bearer ${accessToken}` };
}

async function list(query: ApiRequest['query']) {
  const res = await mockTransport({ method: 'GET', path: '/orders', query, headers: await signedIn() });
  return (res.body as ListOrdersResponse).orders.map((o) => o.symbol);
}

describe('mock Manual Bot API', () => {
  it('rejects bad credentials and unauthenticated calls', async () => {
    const bad = await mockTransport({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'demo@zaptrade.ai', password: 'nope' },
      headers,
    });
    expect(bad.status).toBe(401);
    const anon = await mockTransport({ method: 'GET', path: '/orders', headers });
    expect(anon.status).toBe(401);
  });

  it('splits open and history orders', async () => {
    const open = await list({ tab: 'open' });
    const history = await list({ tab: 'history' });
    expect(open).toEqual(expect.arrayContaining(['AXON', 'TSLA', 'AMD', 'AAPL', 'META', 'NVDA']));
    expect(open).not.toContain('MRVL');
    expect(history).toEqual(expect.arrayContaining(['MRVL', 'AMZN', 'GOOG']));
    expect(history).not.toContain('AXON');
  });

  it('filters by symbol search', async () => {
    expect(await list({ tab: 'open', search: 'ax' })).toEqual(['AXON']);
  });

  it('refreshes tokens with a valid refresh token', async () => {
    const res = await mockTransport({
      method: 'POST',
      path: '/auth/refresh',
      body: { refreshToken: 'mockr.abc' },
      headers,
    });
    expect(res.status).toBe(200);
  });
});
