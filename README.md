# ZapTrade Mobile

An Expo (iOS and Android) app to control and monitor the ZapTrade **Manual Bot**: limit buys on Charles Schwab, each followed automatically by a GTC sell at `round(actual_fill × (1 + profit%/100), 2)`.

The app only talks to the ZapTrade backend (`/api/v1/manual-bot`), never to Schwab. Until that backend exposes the API in [docs/backend-contract.md](docs/backend-contract.md), the app runs against an in-app **mock backend** that simulates the bot (fills, gap-downs, GTC sells, end-of-day expiry, 409s, idempotency).

## Features

- Sign in (JWT, stored in SecureStore), with sign-up and password reset handled by the web app
- **Orders:** open orders with live status, last price, fill vs. plan and estimated profit. Pull to refresh; polls every 12 s while the market is open and every 60 s otherwise.
- **Add, edit and cancel orders**, with the rules enforced per state:
  - before the buy fills: everything is editable
  - after the buy fills: only the profit target
  - closed orders: read-only
- Each change shows a confirm dialog, then an optional biometric check
- **Order detail:** broker IDs, fills, and a timeline with every time shown in ET and IST
- **History:** Today, 7 days, 30 days or All, with totals for trades, realised profit and wins
- **Push notifications** for buy filled (with the sell price placed), sell filled, rejected, and buy cancelled at close. Tapping one opens the order.
- **Biometric lock:** on app open, after 60 s in the background, and before any order change
- **Offline:** cached orders, an "Offline · last updated HH:MM" banner, and order changes disabled
- **Settings:** default qty and profit %, per-type notification toggles, biometric lock, and Light, Dark or System theme

## Setup

You need Node 20+ and npm.

```bash
npm install
cp docs/.env.example .env.local   # then edit; see below
npx expo start
```

Environment variables (`EXPO_PUBLIC_*` values are inlined at bundle time; never put secrets in them):

| Variable | Meaning |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend origin, e.g. `https://algo.zaptrade.ai`, with no trailing slash. Release builds require `https://`. **If left empty, the app runs in mock mode.** |
| `EXPO_PUBLIC_MOCK` | `1` forces the mock backend |
| `EXPO_PUBLIC_WEB_URL` | Web dashboard used for sign-up and forgot-password (default `https://algo.zaptrade.ai`) |

**Mock login:** `demo@zaptrade.ai` / `demo1234`. In mock mode, Settings → **Mock session** lets you open or close the market and simulate the close (EOD). Prices tick every 3 s, so orders fill and sell on their own.

## Running on a device

| | Expo Go | Development build |
|---|---|---|
| UI, orders, mock bot | ✅ | ✅ |
| Biometrics | ✅ (Face ID needs a dev build on iOS) | ✅ |
| Local notifications (mock events) | ✅ | ✅ |
| **Remote push** | ❌ (removed from Expo Go on Android in SDK 53) | ✅ |

Expo Go is fine for most work: run `npx expo start` and scan the QR code.

For push notifications and the full P3 checklist, use a **development build**:

```bash
npx eas-cli@latest login
npx eas-cli@latest init                                  # one-time: adds the EAS projectId to app.json
npx eas-cli@latest build --profile development --platform android   # installable APK
npx eas-cli@latest build --profile development --platform ios       # needs an Apple Developer account
npx eas-cli@latest build --profile development-simulator --platform ios
npx expo start --dev-client
```

Remote push also needs FCM credentials (Android) and an APNs key (iOS). EAS walks you through these during the build or with `eas credentials`. Until the project has an EAS `projectId`, the app skips push-token registration.

## Builds (EAS)

The profiles are defined in [eas.json](eas.json):

| Profile | Output | Backend |
|---|---|---|
| `development` | Dev client: Android APK or iOS internal build | mock |
| `development-simulator` | iOS simulator dev client | mock |
| `preview` | Release build for testers: Android APK or iOS ad-hoc IPA | mock |
| `production` | Store builds: Android AAB, iOS IPA; build number is auto-incremented | **set `EXPO_PUBLIC_API_URL` first** |

```bash
npx eas-cli@latest build --profile preview --platform android      # shareable APK
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production --platform ios
```

Set the production API URL as an EAS environment variable (`eas env:create`) or in the `production` profile's `env`. Without it, a production build silently runs in **mock mode**.

## Development

```bash
npx expo lint        # ESLint
npx tsc --noEmit     # typecheck
npx jest             # unit + integration tests (mock backend, real routes)
npx expo-doctor      # dependency / config checks
```

Install packages with `npx expo install <pkg>` so the versions match SDK 57. `ios/` and `android/` are generated (CNG), so don't edit them; native configuration lives in `app.json` and config plugins.

### Layout

```
src/
  app/            routes (Expo Router): (auth), (tabs) Orders/History/Settings, order/new, order/[id], order/[id]/edit
  api/            fetch client (JWT refresh, Idempotency-Key), typed endpoints, query client + persistence
  api/mock/       in-memory backend + bot simulator (same contract as the real API)
  components/     UI building blocks (theme tokens only, no hard-coded colours)
  hooks/          data hooks, biometrics, network status
  notifications/  expo-notifications setup and the push hook
  store/          auth tokens (SecureStore), prefs
  theme/          light/dark tokens
  utils/          price math (integer cents), edit rules, market hours, time formatting
```

Money is handled as integer cents and profit % as integer units of 0.0001%, both using BigInt rounding, so calculations never drift. The server is authoritative; any sell price shown before the buy fills is an estimate.
