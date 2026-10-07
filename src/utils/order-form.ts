/**
 * Add/Edit form validation and live previews. Pure functions so the same
 * rules are unit-tested and reused by the mock server.
 */
import {
  calcSellPrice,
  formatUsd,
  impliedProfitPct,
  isValidPct,
  isValidPrice,
  pctToE4,
  toCents,
} from './price';

export type TargetMode = 'pct' | 'sell';

export interface OrderFormValues {
  symbol: string;
  tradeDate: string;
  qty: string;
  buyPrice: string;
  targetMode: TargetMode;
  profitPct: string;
  sellPrice: string;
}

export type FormErrors = Partial<Record<keyof OrderFormValues, string>>;

const SYMBOL_RE = /^[A-Z][A-Z.]{0,5}$/;

export function normalizeSymbol(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z.]/g, '');
}

/**
 * Validate the form. `basePrice` is what the sell is calculated from: the
 * planned buy for unfilled orders, the actual fill when only the target is editable.
 */
export function validateOrderForm(v: OrderFormValues, basePrice?: string): FormErrors {
  const e: FormErrors = {};

  if (!SYMBOL_RE.test(v.symbol)) e.symbol = 'Enter a valid symbol';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.tradeDate)) e.tradeDate = 'Pick a trading day';

  if (!/^\d+$/.test(v.qty) || Number(v.qty) <= 0) e.qty = 'Whole number greater than 0';

  if (!isValidPrice(v.buyPrice) || toCents(v.buyPrice) <= 0) {
    e.buyPrice = 'Price greater than 0, up to 2 decimals';
  }

  const base = basePrice ?? (e.buyPrice ? undefined : v.buyPrice);

  if (v.targetMode === 'pct') {
    if (!isValidPct(v.profitPct) || pctToE4(v.profitPct) <= 0) {
      e.profitPct = 'Profit % greater than 0, up to 4 decimals';
    }
  } else if (!isValidPrice(v.sellPrice)) {
    e.sellPrice = 'Price up to 2 decimals';
  } else if (base && toCents(v.sellPrice) <= toCents(base)) {
    e.sellPrice = `Sell price must be above ${formatUsd(base)}`;
  }

  return e;
}

/** The profit % to send to the server (always stored as %, never a sell price). */
export function resolveProfitPct(v: OrderFormValues, basePrice: string): string | null {
  if (v.targetMode === 'pct') return isValidPct(v.profitPct) ? v.profitPct.trim() : null;
  if (!isValidPrice(v.sellPrice) || !isValidPrice(basePrice)) return null;
  return impliedProfitPct(basePrice, v.sellPrice.trim());
}

export interface OrderPreview {
  /** Estimated sell from the base price and resolved %. */
  estSellPrice: string | null;
  /** In sell-price mode, the % that will be stored. */
  impliedPct: string | null;
  estCostCents: number | null;
  estProfitCents: number | null;
}

export function previewOrder(v: OrderFormValues, basePrice: string, qtyForProfit?: number): OrderPreview {
  const qty = /^\d+$/.test(v.qty) ? Number(v.qty) : 0;
  const validBase = isValidPrice(basePrice) && toCents(basePrice) > 0;
  const pct = validBase ? resolveProfitPct(v, basePrice) : null;
  const validPct = !!pct && pctToE4(pct) > 0;
  const estSellPrice = validBase && validPct ? calcSellPrice(basePrice, pct!) : null;
  const profitQty = qtyForProfit ?? qty;

  return {
    estSellPrice,
    impliedPct: v.targetMode === 'sell' && validPct ? pct : null,
    estCostCents: isValidPrice(v.buyPrice) && qty > 0 ? toCents(v.buyPrice) * qty : null,
    estProfitCents:
      estSellPrice && profitQty > 0 ? (toCents(estSellPrice) - toCents(basePrice)) * profitQty : null,
  };
}
