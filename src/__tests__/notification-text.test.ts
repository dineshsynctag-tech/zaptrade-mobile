/**
 * Push copy for each bot event. The server must send the same text.
 */
import { describe, expect, it } from '@jest/globals';

import type { Order } from '@/types/order';
import { orderNotification } from '@/utils/notification-text';

const base: Order = {
  id: 'o1',
  symbol: 'MRVL',
  tradeDate: '2026-10-07',
  qty: 3,
  filledQty: 3,
  buyPrice: '285.00',
  buyStatus: 'FILLED',
  buyFillPrice: '285.00',
  buyBrokerOrderId: 'B1',
  buyUpdatedAt: null,
  profitPct: '0.25',
  sellPrice: '285.71',
  sellStatus: 'WORKING',
  sellFillPrice: null,
  sellBrokerOrderId: 'S1',
  sellUpdatedAt: null,
  cancelReason: null,
  profit: null,
  rejectReason: null,
  version: 1,
  source: 'mobile',
  createdAt: '2026-10-07T13:00:00Z',
};

describe('orderNotification', () => {
  it('buy filled shows the fill and the sell placed from it', () => {
    const n = orderNotification('BUY_FILLED', base);
    expect(n.body).toBe('MRVL bought 3 @ $285.00 · Sell placed @ $285.71');
    expect(n.data).toEqual({ orderId: 'o1', kind: 'BUY_FILLED' });
  });

  it('sell filled shows the sell fill and signed profit', () => {
    const n = orderNotification('SELL_FILLED', {
      ...base,
      sellStatus: 'FILLED',
      sellFillPrice: '285.71',
      profit: '2.13',
    });
    expect(n.body).toBe('MRVL sold @ $285.71 · +$2.13');
  });

  it('rejected includes the broker reason', () => {
    const n = orderNotification('REJECTED', {
      ...base,
      buyStatus: 'REJECTED',
      rejectReason: 'Insufficient buying power',
    });
    expect(n.body).toBe('MRVL buy rejected by the broker · Insufficient buying power');
  });

  it('expired day buy says it was not filled by the close', () => {
    const n = orderNotification('EXPIRED', { ...base, buyStatus: 'CANCELLED', filledQty: 0 });
    expect(n.body).toBe('MRVL buy @ $285.00 · Not filled by market close');
  });
});
