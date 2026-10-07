import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import {
  createOrder,
  deleteOrder,
  getOrder,
  retryOrder,
  updateOrder,
} from '@/api/endpoints';
import { queryKeys } from '@/api/query-client';
import type { CreateOrderInput, OrderDetail, UpdateOrderInput } from '@/types/order';
import { newIdempotencyKey } from '@/utils/id';

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.order(id ?? ''),
    queryFn: () => getOrder(id!),
    enabled: !!id,
  });
}

/**
 * One Idempotency-Key per distinct payload: a double tap or a retry after a
 * network error resends the same key, so the server creates/edits only once.
 */
function useIdempotencyKey() {
  const ref = useRef<{ sig: string; key: string } | null>(null);
  return (payload: unknown) => {
    const sig = JSON.stringify(payload);
    if (ref.current?.sig !== sig) ref.current = { sig, key: newIdempotencyKey() };
    return ref.current.key;
  };
}

function useInvalidateOrders() {
  const qc = useQueryClient();
  return (order: OrderDetail) => {
    qc.setQueryData(queryKeys.order(order.id), order);
    return qc.invalidateQueries({ queryKey: queryKeys.allOrders });
  };
}

export function useCreateOrder() {
  const keyFor = useIdempotencyKey();
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input, keyFor(input)),
    onSuccess: invalidate,
  });
}

export function useUpdateOrder(id: string) {
  const keyFor = useIdempotencyKey();
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (patch: UpdateOrderInput) => updateOrder(id, patch, keyFor(patch)),
    onSuccess: invalidate,
  });
}

export function useDeleteOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => deleteOrder(id, version),
    onSuccess: invalidate,
  });
}

export function useRetryOrder() {
  const keyFor = useIdempotencyKey();
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      retryOrder(id, version, keyFor({ id, version })),
    onSuccess: invalidate,
  });
}
