import { useQuery } from '@tanstack/react-query';

import { getMarketStatus } from '@/api/endpoints';
import { queryKeys } from '@/api/query-client';

export function useMarketStatus() {
  return useQuery({
    queryKey: queryKeys.marketStatus,
    queryFn: getMarketStatus,
    refetchInterval: 60_000,
  });
}

/** 12 s while the market is live (pre or regular session), 60 s otherwise. */
export function useLiveRefetchInterval(): number {
  const { data } = useMarketStatus();
  return data?.state === 'open' || data?.state === 'pre' ? 12_000 : 60_000;
}
