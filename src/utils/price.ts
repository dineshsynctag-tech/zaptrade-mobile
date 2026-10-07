/**
 * Exact price math for display and previews. Mirrors the bot's server-side rule:
 *
 *   sell_price = round(actual_fill_price × (1 + profit% / 100), 2)
 *
 * The server is the source of truth and always recalculates from the real fill;
 * nothing computed here is ever sent as a sell price.
 *
 * Prices are handled as integer cents and profit % as an integer scaled by 1e4
 * (0.25% → 2500), so no floating-point arithmetic touches money.
 */

const PRICE_RE = /^\d+(\.\d{1,2})?$/;
const PCT_RE = /^\d+(\.\d{1,4})?$/;

/** 100% expressed in pct-e4 units relative to the factor denominator. */
const PCT_SCALE = 1_000_000n; // 1 + pct/100 = (1e6 + pctE4) / 1e6

export function isValidPrice(value: string): boolean {
  return PRICE_RE.test(value.trim());
}

export function isValidPct(value: string): boolean {
  return PCT_RE.test(value.trim());
}

/** "468.5" → 46850. Throws on anything that isn't a non-negative ≤2-dp decimal. */
export function toCents(value: string): number {
  const v = value.trim();
  if (!PRICE_RE.test(v)) throw new Error(`Invalid price: "${value}"`);
  const [whole, frac = ''] = v.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

/** 46850 → "468.50" */
export function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** "0.25" → 2500 */
export function pctToE4(value: string): number {
  const v = value.trim();
  if (!PCT_RE.test(v)) throw new Error(`Invalid percent: "${value}"`);
  const [whole, frac = ''] = v.split('.');
  return Number(whole) * 10_000 + Number(frac.padEnd(4, '0'));
}

/** 2500 → "0.25" (trailing zeros trimmed, at least 2 dp) */
export function fromPctE4(e4: number): string {
  const whole = Math.floor(e4 / 10_000);
  let frac = String(e4 % 10_000).padStart(4, '0');
  while (frac.length > 2 && frac.endsWith('0')) frac = frac.slice(0, -1);
  return `${whole}.${frac}`;
}

/** Round-half-up division for non-negative bigints. */
function divRoundHalfUp(n: bigint, d: bigint): bigint {
  return (n * 2n + d) / (d * 2n);
}

export function calcSellCents(fillCents: number, pctE4: number): number {
  const n = BigInt(fillCents) * (PCT_SCALE + BigInt(pctE4));
  return Number(divRoundHalfUp(n, PCT_SCALE));
}

/** calcSellPrice("468.00", "0.25") → "469.17" */
export function calcSellPrice(fillPrice: string, profitPct: string): string {
  return fromCents(calcSellCents(toCents(fillPrice), pctToE4(profitPct)));
}

/**
 * Sell-price target mode: back-calculate the profit % to store, such that
 * applying it to the planned buy reproduces exactly the sell price entered.
 * Returns null if sell ≤ buy.
 */
export function impliedProfitPct(buyPrice: string, sellPrice: string): string | null {
  const buy = toCents(buyPrice);
  const sell = toCents(sellPrice);
  if (buy <= 0 || sell <= buy) return null;

  let e4 = Number(divRoundHalfUp(BigInt(sell - buy) * PCT_SCALE, BigInt(buy)));
  // Rounding to 4 dp can land a cent off; nudge until it round-trips.
  for (let i = 0; i < 50 && calcSellCents(buy, e4) !== sell; i++) {
    e4 += calcSellCents(buy, e4) < sell ? 1 : -1;
  }
  // For very high prices a 0.0001% step can exceed one cent; the closest % is
  // returned and the form shows the resulting sell price for confirmation.
  return fromPctE4(e4);
}

/** (sellFill − buyFill) × qty, in cents. */
export function calcProfitCents(buyFill: string, sellFill: string, qty: number): number {
  return (toCents(sellFill) - toCents(buyFill)) * qty;
}

/** Positive cents when a buy filled below its planned price (gap-down). */
export function belowPlanCents(order: { buyPrice: string; buyFillPrice: string | null }): number {
  if (!order.buyFillPrice) return 0;
  return Math.max(0, toCents(order.buyPrice) - toCents(order.buyFillPrice));
}

/** "$1,234.50"; `signed` adds +/− for P&L. */
export function formatUsd(value: string | number, opts: { signed?: boolean } = {}): string {
  const cents = typeof value === 'number' ? value : toCentsSigned(value);
  const abs = fromCents(Math.abs(cents));
  const [whole, frac] = abs.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = cents < 0 ? '−' : opts.signed && cents > 0 ? '+' : '';
  return `${sign}$${grouped}.${frac}`;
}

/** Like toCents but accepts a leading minus (for P&L strings). */
export function toCentsSigned(value: string): number {
  const v = value.trim();
  return v.startsWith('-') ? -toCents(v.slice(1)) : toCents(v);
}
