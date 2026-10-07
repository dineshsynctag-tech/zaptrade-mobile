import { describe, expect, it, jest } from '@jest/globals';

import { ApiError, createApiClient, type ApiRequest, type ApiResponse } from '@/api/client';

function setup(responses: (req: ApiRequest) => ApiResponse) {
  const calls: ApiRequest[] = [];
  let tokens = { accessToken: 'old', refreshToken: 'r1' };
  const onAuthFailure = jest.fn(async () => {});
  const client = createApiClient({
    transport: async (req) => {
      calls.push(req);
      return responses(req);
    },
    getTokens: () => tokens,
    setTokens: async (t) => {
      tokens = t;
    },
    onAuthFailure,
  });
  return { client, calls, onAuthFailure };
}

describe('api client', () => {
  it('sends the Idempotency-Key and the mobile source header', async () => {
    const { client, calls } = setup(() => ({ status: 201, body: { id: 'o1' } }));
    await client.request('POST', '/orders', { body: {}, idempotencyKey: 'k1' });
    expect(calls[0].headers['Idempotency-Key']).toBe('k1');
    expect(calls[0].headers['X-Client']).toBe('mobile');
    expect(calls[0].headers.Authorization).toBe('Bearer old');
  });

  it('on 401 refreshes once and retries with the same Idempotency-Key', async () => {
    const { client, calls } = setup((req) => {
      if (req.path === '/auth/refresh') return { status: 200, body: { accessToken: 'new', refreshToken: 'r2' } };
      return req.headers.Authorization === 'Bearer new'
        ? { status: 201, body: { id: 'o1' } }
        : { status: 401, body: {} };
    });
    await client.request('POST', '/orders', { body: {}, idempotencyKey: 'k1' });
    const orderCalls = calls.filter((c) => c.path === '/orders');
    expect(orderCalls).toHaveLength(2);
    expect(orderCalls.map((c) => c.headers['Idempotency-Key'])).toEqual(['k1', 'k1']);
  });

  it('shares one refresh between concurrent 401s', async () => {
    const { client, calls } = setup((req) => {
      if (req.path === '/auth/refresh') return { status: 200, body: { accessToken: 'new', refreshToken: 'r2' } };
      return req.headers.Authorization === 'Bearer new' ? { status: 200, body: {} } : { status: 401, body: {} };
    });
    await Promise.all([client.request('GET', '/a'), client.request('GET', '/b'), client.request('GET', '/c')]);
    expect(calls.filter((c) => c.path === '/auth/refresh')).toHaveLength(1);
  });

  it('signs out when refresh fails', async () => {
    const { client, onAuthFailure } = setup(() => ({ status: 401, body: {} }));
    await expect(client.request('GET', '/orders')).rejects.toBeInstanceOf(ApiError);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('surfaces server error codes', async () => {
    const { client } = setup(() => ({ status: 409, body: { code: 'STALE_ORDER', message: 'changed' } }));
    await expect(client.request('PATCH', '/orders/1')).rejects.toMatchObject({ status: 409, code: 'STALE_ORDER' });
  });
});
