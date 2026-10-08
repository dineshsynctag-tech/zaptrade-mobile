import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient, type Query } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { ApiError } from './client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: (failureCount, error) => {
        // Don't retry auth or validation failures; retry transient ones twice.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
      // Never queue an order change offline to replay later; fail now instead.
      networkMode: 'always',
    },
  },
});

if (Platform.OS !== 'web') {
  // Refetch when the app comes back to the foreground.
  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
  // Pause queries while offline; refetch on reconnect. (Web uses navigator.onLine.)
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );
}

/**
 * Order data is cached on disk so the last list shows when the app starts
 * offline. Tokens never go here (they live in SecureStore), and the cache is
 * cleared on sign-out.
 */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'zt.query-cache',
  throttleTime: 2_000,
});

const PERSISTED_KEYS = new Set(['orders', 'order']);

export const persistOptions = {
  persister: queryPersister,
  maxAge: 24 * 60 * 60 * 1000,
  // Bump when the Order shape changes so stale caches are dropped.
  buster: 'orders-v1',
  dehydrateOptions: {
    shouldDehydrateQuery: (q: Query) =>
      q.state.status === 'success' && PERSISTED_KEYS.has(String(q.queryKey[0])),
  },
};

export const queryKeys = {
  orders: (tab: string, search?: string, from?: string, to?: string) =>
    ['orders', tab, search ?? '', from ?? '', to ?? ''] as const,
  allOrders: ['orders'] as const,
  order: (id: string) => ['order', id] as const,
  marketStatus: ['market-status'] as const,
  quotes: (symbols: string[]) => ['quotes', symbols.join(',')] as const,
};
