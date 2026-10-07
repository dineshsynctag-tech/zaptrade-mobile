import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getQuotes, listOrders } from '@/api/endpoints';
import { queryKeys } from '@/api/query-client';
import type { ListOrdersParams } from '@/types/order';
import { useLiveRefetchInterval } from './use-market-status';

export function useOrders(params: ListOrdersParams) {
  const interval = useLiveRefetchInterval();
  return useQuery({
    queryKey: queryKeys.orders(params.tab, params.search, params.from, params.to),
    queryFn: () => listOrders(params),
    // History doesn't change on its own; only open orders need live polling.
    refetchInterval: params.tab === 'open' ? interval : false,
    placeholderData: keepPreviousData,
  });
}

/** Last price per symbol; the card simply omits it if the endpoint fails. */
export function useQuotes(symbols: string[]) {
  const interval = useLiveRefetchInterval();
  const sorted = [...new Set(symbols)].sort();
  return useQuery({
    queryKey: queryKeys.quotes(sorted),
    queryFn: async () => {
      const { quotes } = await getQuotes(sorted);
      return Object.fromEntries(quotes.map((q) => [q.symbol, q.last])) as Record<string, string>;
    },
    enabled: sorted.length > 0,
    refetchInterval: interval,
    retry: false,
  });
}
