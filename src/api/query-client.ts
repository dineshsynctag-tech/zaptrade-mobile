import { focusManager, QueryClient } from '@tanstack/react-query';
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
    },
  },
});

// Refetch when the app comes back to the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
}

export const queryKeys = {
  orders: (tab: string, search?: string, from?: string, to?: string) =>
    ['orders', tab, search ?? '', from ?? '', to ?? ''] as const,
  allOrders: ['orders'] as const,
  order: (id: string) => ['order', id] as const,
  marketStatus: ['market-status'] as const,
  quotes: (symbols: string[]) => ['quotes', symbols.join(',')] as const,
};
