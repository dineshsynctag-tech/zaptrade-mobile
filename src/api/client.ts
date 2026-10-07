import { API_BASE_URL, IS_MOCK } from '@/config';
import { useAuthStore } from '@/store/auth';
import type { AuthTokens } from '@/types/order';

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  headers: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

export type Transport = (req: ApiRequest) => Promise<ApiResponse>;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetwork() {
    return this.status === 0;
  }
}

export interface RequestOptions {
  query?: ApiRequest['query'];
  body?: unknown;
  /** Same key for every retry of one user action, so the server dedupes. */
  idempotencyKey?: string;
  auth?: boolean;
}

interface ClientDeps {
  transport: Transport;
  getTokens: () => AuthTokens | null;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  onAuthFailure: () => Promise<void>;
}

export function buildQuery(query: ApiRequest['query']): string {
  const parts = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const fetchTransport: Transport = async (req) => {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${req.path}${buildQuery(req.query)}`, {
      method: req.method,
      headers: req.headers,
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No connection to the server');
  }
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }
  return { status: res.status, body };
};

export function createApiClient(deps: ClientDeps) {
  let refreshing: Promise<boolean> | null = null;

  /** Single-flight refresh: concurrent 401s share one refresh call. */
  function refresh(): Promise<boolean> {
    refreshing ??= (async () => {
      const tokens = deps.getTokens();
      if (!tokens) return false;
      try {
        const res = await deps.transport({
          method: 'POST',
          path: '/auth/refresh',
          body: { refreshToken: tokens.refreshToken },
          headers: baseHeaders(),
        });
        if (res.status !== 200) return false;
        await deps.setTokens(res.body as AuthTokens);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  function baseHeaders(): Record<string, string> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // Lets the server tag audit-log rows with source = mobile.
      'X-Client': 'mobile',
    };
  }

  async function request<T>(
    method: ApiRequest['method'],
    path: string,
    opts: RequestOptions = {},
  ): Promise<T> {
    const { auth = true } = opts;

    const send = () => {
      const headers = baseHeaders();
      const tokens = deps.getTokens();
      if (auth && tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
      if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
      return deps.transport({ method, path, query: opts.query, body: opts.body, headers });
    };

    let res = await send();

    if (res.status === 401 && auth) {
      if (await refresh()) {
        res = await send();
      }
      if (res.status === 401) {
        await deps.onAuthFailure();
        throw new ApiError(401, 'UNAUTHORIZED', 'Your session has expired. Please sign in again.');
      }
    }

    if (res.status >= 200 && res.status < 300) return res.body as T;

    const body = (res.body ?? {}) as { code?: string; message?: string; details?: unknown };
    throw new ApiError(
      res.status,
      body.code ?? `HTTP_${res.status}`,
      body.message ?? `Request failed (${res.status})`,
      body.details,
    );
  }

  return { request };
}

function resolveTransport(): Transport {
  if (IS_MOCK) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./mock/adapter').mockTransport as Transport;
  }
  return fetchTransport;
}

export const api = createApiClient({
  transport: resolveTransport(),
  getTokens: () => {
    const { accessToken, refreshToken } = useAuthStore.getState();
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },
  setTokens: (tokens) => useAuthStore.getState().setTokens(tokens),
  onAuthFailure: () => useAuthStore.getState().signOut(),
});
