/**
 * Runtime config from EXPO_PUBLIC_* env vars (inlined at bundle time).
 *
 *   EXPO_PUBLIC_API_URL  https://… base of the ZapTrade API (no trailing slash)
 *   EXPO_PUBLIC_MOCK     "1" to use the in-app mock backend
 *
 * With no API URL configured the app falls back to mock mode.
 */
const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export const IS_MOCK = process.env.EXPO_PUBLIC_MOCK === '1' || apiUrl === '';

// HTTPS only in release builds; plain http is tolerated in dev for a LAN backend.
if (!IS_MOCK && !__DEV__ && !apiUrl.startsWith('https://')) {
  throw new Error('EXPO_PUBLIC_API_URL must use https://');
}

export const API_BASE_URL = `${apiUrl}/api/v1/manual-bot`;

/** Web dashboard, for flows the API doesn't cover yet (sign-up, password reset). */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://algo.zaptrade.ai';
