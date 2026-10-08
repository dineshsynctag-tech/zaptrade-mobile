# ZapTrade Mobile: backend contract (draft)

This is what the mobile app expects from the Manual Bot backend. The app ships with an in-app mock (`src/api/mock/`) that implements exactly this contract, so the mock is the executable reference. **None of it has been confirmed against the real backend yet.** Open questions are at the end.

- Base URL: `${EXPO_PUBLIC_API_URL}/api/v1/manual-bot`
- JSON in, JSON out. **Money and percentages are decimal strings** (`"468.00"`, `"0.25"`), never floats.
- Prices have at most 2 dp. Profit % has at most 4 dp.
- Dates are `YYYY-MM-DD` (ET trading day). Timestamps are ISO-8601 UTC.
- The bot backend is the single source of truth. The app never talks to Schwab, and it treats any sell price it shows before the buy fills as an estimate.

## Bot rules the server must enforce

1. **Buy** is a DAY limit order for `tradeDate`. If it isn't filled by market close, it is cancelled (`cancelReason: "Not filled by market close"`). A gap-down open fills it at the lower price.
2. **Sell**: once the buy fills, place a **GTC** limit sell for `filledQty` at `round_half_up(actual_fill × (1 + profitPct/100), 2)`. Compute this from the **actual fill**, not the planned buy price. It stays working across sessions until price ≥ sell.
3. Realised `profit = (sellFill − buyFill) × filledQty`, as a 2-dp string.

## Auth

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `{ accessToken, refreshToken, user: { id, email, name } }` |
| POST | `/auth/refresh` | `{ refreshToken }` | `{ accessToken, refreshToken }` |

- Every other call sends `Authorization: Bearer <accessToken>`.
- On a `401` the app calls `/auth/refresh` once (concurrent requests share that one refresh), then retries the original request once. If the refresh fails, the user is signed out.
- Tokens are stored in the device keychain/keystore (SecureStore).

## Orders

| Method | Path | Notes |
|---|---|---|
| GET | `/orders?tab=open\|history&search=&from=&to=` | `{ orders: Order[], total }`. `search` is a case-insensitive symbol substring; `from`/`to` are inclusive filters on `tradeDate`. Newest first. |
| GET | `/orders/:id` | `OrderDetail` (an `Order` plus `events[]`) |
| POST | `/orders` | `CreateOrderInput`, with an `Idempotency-Key` header → `OrderDetail` |
| PATCH | `/orders/:id` | `UpdateOrderInput` (includes `version`), with an `Idempotency-Key` header → `OrderDetail` |
| DELETE | `/orders/:id?version=N` | Cancels at the broker → `OrderDetail` |
| POST | `/orders/:id/retry` | `{ version }`, with an `Idempotency-Key` header. Resubmits a broker-rejected buy. |

`tab=history` means closed orders: the sell filled, the buy was cancelled or expired, or the order was cancelled after the fill. Everything else is `open`.

### Types

```ts
type LegStatus = 'QUEUED' | 'WORKING' | 'FILLED' | 'CANCELLED' | 'REJECTED';

interface Order {
  id: string; symbol: string; tradeDate: string; qty: number;
  filledQty: number;                 // shares bought so far

  buyPrice: string; buyStatus: LegStatus;
  buyFillPrice: string | null; buyBrokerOrderId: string | null; buyUpdatedAt: string | null;

  profitPct: string;
  sellPrice: string | null;          // server-computed from the actual fill; null until filled
  sellStatus: LegStatus | null;      // null = no sell leg yet
  sellFillPrice: string | null; sellBrokerOrderId: string | null; sellUpdatedAt: string | null;

  cancelReason: string | null; rejectReason: string | null;
  profit: string | null;             // realised, set when the sell fills
  version: number;                   // optimistic concurrency
  source: 'mobile' | 'web';
  createdAt: string;
}

interface OrderEvent {
  type: 'CREATED' | 'QUEUED' | 'BUY_WORKING' | 'BUY_PARTIAL' | 'BUY_FILLED' | 'SELL_PLACED'
      | 'SELL_FILLED' | 'EDITED' | 'CANCELLED' | 'REJECTED';
  at: string; message: string; source?: 'mobile' | 'web' | 'bot';
}

interface CreateOrderInput {
  symbol: string; tradeDate: string; qty: number; buyPrice: string; profitPct: string;
  confirmDuplicate?: boolean;        // sent after the user accepts a DUPLICATE_ORDER warning
}

interface UpdateOrderInput {
  version: number; tradeDate?: string; qty?: number; buyPrice?: string; profitPct?: string;
}
```

The full source is in `src/types/order.ts`.

When the user enters a target sell price instead of a profit %, the app converts it to a 4-dp `profitPct` that reproduces that exact sell price from the planned buy (for very high prices, the closest one). The server only ever receives `profitPct`.

### Edit and delete rules (server-enforced; the app mirrors them in `src/utils/edit-rules.ts`)

| Order state | Edit | Delete |
|---|---|---|
| Nothing bought (`filledQty = 0`; buy QUEUED, WORKING or REJECTED) | All fields; cancel/replace the buy at the broker | Cancels the buy |
| Bought, GTC sell WORKING | `profitPct` only; cancel/replace the sell, recalculated from the fill | Cancels the sell; the shares stay in the account |
| Closed | Not allowed | Not allowed |

### Concurrency and idempotency

- `PATCH`, `DELETE` and `retry` carry the `version` the client last saw. If it's stale, respond `409 STALE_ORDER`. The app then refreshes the order and closes the form.
- `POST` and `PATCH` send `Idempotency-Key: <uuid>`. The client reuses the same key when retrying the same submission.
- Store `key + route → first successful response` for about 24 h and replay it on repeats, so a double tap or a network retry creates exactly one order.

## Market data

| Method | Path | Response |
|---|---|---|
| GET | `/market-status` | `{ state: 'pre'\|'open'\|'post'\|'closed', nextOpen, nextTradingDate, isHoliday }` |
| GET | `/quotes?symbols=AAPL,MSFT` | `{ quotes: [{ symbol, last, asOf }] }`. Display only, so failures are tolerated. |
| GET | `/symbols/:symbol` | `{ symbol, name }` or `404 UNKNOWN_SYMBOL` |

The app polls open orders and quotes every 12 s during pre-market and regular hours, and every 60 s otherwise.

## Push notifications

| Method | Path | Body |
|---|---|---|
| POST | `/devices` | `{ token: "ExponentPushToken[…]", platform: 'ios'\|'android', notify: { BUY_FILLED, SELL_FILLED, REJECTED, EXPIRED } }` (upsert by token) |
| DELETE | `/devices/:token` | Called on logout |

When the bot changes an order's status, send an Expo push message (https://exp.host/--/api/v2/push/send) to each of the user's devices that has that `notify` kind enabled:

```json
{
  "to": "ExponentPushToken[…]",
  "title": "MRVL bought",
  "body": "MRVL bought 3 @ $285.00 · Sell placed @ $285.71",
  "data": { "orderId": "…", "kind": "BUY_FILLED" },
  "channelId": "orders",
  "sound": "default"
}
```

| kind | title | body |
|---|---|---|
| `BUY_FILLED` | `{SYM} bought` | `{SYM} bought {filledQty} @ {buyFill} · Sell placed @ {sellPrice}` |
| `SELL_FILLED` | `{SYM} sold` | `{SYM} sold @ {sellFill} · {±profit}` |
| `REJECTED` | `{SYM} order rejected` | `{SYM} buy rejected by the broker · {rejectReason}` |
| `EXPIRED` | `{SYM} buy cancelled` | `{SYM} buy @ {buyPrice} · Not filled by market close` |

- The exact copy is in `src/utils/notification-text.ts`. Keep the server and the app in sync.
- `data.orderId` is required: tapping the notification opens that order.
- Remove tokens that Expo reports as `DeviceNotRegistered`.

## Errors

Every error body is `{ code, message, details? }`. The app shows `message` to the user, so write it for humans.

| Status | code | When |
|---|---|---|
| 401 | `INVALID_CREDENTIALS`, `UNAUTHORIZED`, `INVALID_REFRESH` | Bad login, an expired access token, or a bad refresh token |
| 404 | `NOT_FOUND`, `UNKNOWN_SYMBOL` | |
| 409 | `STALE_ORDER` | The `version` sent is out of date |
| 409 | `DUPLICATE_ORDER` | An open order already exists for the same symbol and `tradeDate`; the client can resend with `confirmDuplicate: true` |
| 422 | `VALIDATION` | Field errors (`details` may carry them per field) |
| 422 | `EDIT_NOT_ALLOWED`, `DELETE_NOT_ALLOWED`, `RETRY_NOT_ALLOWED` | The order's state doesn't allow it |
| 429 | `RATE_LIMITED` | Proposed; include `Retry-After`. The app currently just shows `message`. |

## Also needed server-side

- An **audit log** row for every create, edit, delete and retry: user, before, after, `source`.
- **Rate limits** on the order routes.
- **Web/mobile consistency:** both clients read the same store. If the web dashboard caches orders, mobile writes must invalidate that cache.

## Open questions

1. Is the backend session-based or JWT? Can mobile get `/auth/login` and `/auth/refresh`? Is there a sign-up API? (Until there is, the app links to the web for sign-up and password reset.)
2. **Partial fills:** is the sell placed after each partial fill, or only after the full fill? Does the unfilled remainder keep working until the close? (The mock places the sell for the shares filled so far as soon as there's a partial fill, replaces it for the full qty when the buy completes, and cancels any unfilled remainder at the close while the sell keeps working.)
3. **Delete with the sell working:** should it cancel only the sell and keep the shares (the current assumption), or be blocked?
4. How many decimals does profit % allow? Is 4 dp acceptable?
5. History filters on `tradeDate` (the buy day). Should it filter on the date the sell filled instead, since a GTC sell can fill days later?
6. Is quotes data available, and is there a symbol lookup?
