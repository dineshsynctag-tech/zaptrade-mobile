import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { lookupSymbol } from '@/api/endpoints';
import { radius, spacing, TOUCH_TARGET } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import {
  normalizeSymbol,
  previewOrder,
  resolveProfitPct,
  validateOrderForm,
  type FormErrors,
  type OrderFormValues,
} from '@/utils/order-form';
import { formatUsd } from '@/utils/price';
import { formatTradeDate } from '@/utils/time';
import { AppText } from './app-text';
import { PillButton } from './pill-button';
import { TargetModeToggle } from './target-mode-toggle';
import { UnderlineInput } from './underline-input';

type SymbolCheck = { state: 'idle' | 'checking' | 'ok' | 'unknown'; name?: string; for?: string };

interface OrderFormProps {
  initial: OrderFormValues;
  /** 'sellOnly' once shares are bought: only the profit target is editable. */
  editability: 'full' | 'sellOnly';
  /** Actual buy fill price; the sell is computed from this when bought. */
  fillPrice?: string | null;
  filledQty?: number;
  tradeDates: string[];
  submitLabel: string;
  submitting: boolean;
  serverError?: string | null;
  onSubmit: (values: OrderFormValues, profitPct: string) => void;
}

/** Accept "," from locale keyboards as the decimal separator. */
const decimal = (t: string) => t.replace(',', '.').replace(/[^\d.]/g, '');

export function OrderForm({
  initial,
  editability,
  fillPrice,
  filledQty,
  tradeDates,
  submitLabel,
  submitting,
  serverError,
  onSubmit,
}: OrderFormProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [v, setV] = useState<OrderFormValues>(initial);
  const [touched, setTouched] = useState(false);
  const [symbolCheck, setSymbolCheck] = useState<SymbolCheck>({
    state: initial.symbol ? 'ok' : 'idle',
    for: initial.symbol,
  });

  const sellOnly = editability === 'sellOnly';
  const basePrice = sellOnly && fillPrice ? fillPrice : v.buyPrice;
  const errors: FormErrors = validateOrderForm(v, sellOnly ? (fillPrice ?? undefined) : undefined);
  if (symbolCheck.state === 'unknown' && symbolCheck.for === v.symbol) {
    errors.symbol = `Unknown symbol "${v.symbol}"`;
  }
  const preview = previewOrder(v, basePrice, sellOnly ? filledQty : undefined);
  const set = <K extends keyof OrderFormValues>(k: K, value: OrderFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: value }));

  /** Returns false only when the server says the symbol doesn't exist. */
  async function checkSymbol(symbol: string): Promise<boolean> {
    if (!symbol || (symbolCheck.for === symbol && symbolCheck.state === 'ok')) return true;
    setSymbolCheck({ state: 'checking', for: symbol });
    try {
      const info = await qc.fetchQuery({
        queryKey: ['symbol', symbol],
        queryFn: () => lookupSymbol(symbol),
        staleTime: Infinity,
      });
      setSymbolCheck({ state: 'ok', name: info.name, for: symbol });
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setSymbolCheck({ state: 'unknown', for: symbol });
        return false;
      }
      // Lookup unavailable: let the server validate on submit.
      setSymbolCheck({ state: 'idle', for: symbol });
      return true;
    }
  }

  async function submit() {
    setTouched(true);
    if (Object.keys(errors).length) return;
    if (!sellOnly && !(await checkSymbol(v.symbol))) return;
    const pct = resolveProfitPct(v, basePrice);
    if (pct) onSubmit(v, pct);
  }

  const show = (k: keyof OrderFormValues) => (touched ? errors[k] : undefined);

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
      {sellOnly ? (
        <View style={[styles.summary, { backgroundColor: colors.surfaceMuted }]}>
          <AppText variant="heading" weight="bold">
            {v.symbol} · {filledQty} bought @ {formatUsd(fillPrice ?? v.buyPrice)}
          </AppText>
          <AppText variant="caption" tone="muted">
            The buy has filled, so only the profit target can change. The GTC sell is replaced and
            recalculated from the actual fill.
          </AppText>
        </View>
      ) : (
        <>
          <UnderlineInput
            label="Symbol"
            value={v.symbol}
            onChangeText={(t) => set('symbol', normalizeSymbol(t))}
            onBlur={() => checkSymbol(v.symbol)}
            valid={symbolCheck.state === 'ok' && symbolCheck.for === v.symbol}
            error={show('symbol') ?? (symbolCheck.state === 'unknown' ? errors.symbol : null)}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            placeholder="AXON"
          />
          {symbolCheck.state === 'ok' && symbolCheck.name && symbolCheck.for === v.symbol ? (
            <AppText variant="caption" tone="muted" style={styles.hint}>
              {symbolCheck.name}
            </AppText>
          ) : null}

          <View style={styles.field}>
            <AppText variant="caption" weight="semibold" tone="accent">
              Date
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {tradeDates.map((d, i) => {
                const selected = d === v.tradeDate;
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => set('tradeDate', d)}
                    style={[
                      styles.chip,
                      { borderColor: selected ? colors.accent : colors.border },
                      selected && { backgroundColor: colors.accent },
                    ]}>
                    <AppText
                      variant="label"
                      weight="semibold"
                      style={{ color: selected ? colors.textOnGradient : colors.text }}>
                      {i === 0 ? `Next · ${formatTradeDate(d)}` : formatTradeDate(d)}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.row}>
            <View style={styles.flex}>
              <UnderlineInput
                label="Qty"
                value={v.qty}
                onChangeText={(t) => set('qty', t.replace(/\D/g, ''))}
                error={show('qty')}
                keyboardType="number-pad"
                placeholder="1"
              />
            </View>
            <View style={styles.flex}>
              <UnderlineInput
                label="Buy Price ($)"
                value={v.buyPrice}
                onChangeText={(t) => set('buyPrice', decimal(t))}
                error={show('buyPrice')}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
          </View>
        </>
      )}

      <View style={styles.field}>
        <AppText variant="caption" weight="semibold" tone="accent">
          Target
        </AppText>
        <TargetModeToggle value={v.targetMode} onChange={(m) => set('targetMode', m)} />
      </View>

      {v.targetMode === 'pct' ? (
        <UnderlineInput
          label="Profit %"
          value={v.profitPct}
          onChangeText={(t) => set('profitPct', decimal(t))}
          error={show('profitPct')}
          keyboardType="decimal-pad"
          placeholder="0.25"
        />
      ) : (
        <UnderlineInput
          label="Sell Price ($)"
          value={v.sellPrice}
          onChangeText={(t) => set('sellPrice', decimal(t))}
          error={show('sellPrice')}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
      )}

      {/* Live preview */}
      <View style={[styles.preview, { backgroundColor: colors.surfaceMuted }]}>
        <PreviewRow
          label={sellOnly ? 'Sell price (from actual fill)' : 'Est. sell price (from planned buy)'}
          value={preview.estSellPrice ? formatUsd(preview.estSellPrice) : '—'}
          strong
        />
        {preview.impliedPct ? <PreviewRow label="Stored as profit %" value={`${preview.impliedPct}%`} /> : null}
        {!sellOnly ? (
          <PreviewRow
            label="Est. cost"
            value={preview.estCostCents !== null ? formatUsd(preview.estCostCents) : '—'}
          />
        ) : null}
        <PreviewRow
          label="Est. profit"
          value={preview.estProfitCents !== null ? formatUsd(preview.estProfitCents, { signed: true }) : '—'}
        />
        <AppText variant="caption" tone="muted" style={styles.rules}>
          {sellOnly
            ? 'The sell is good-till-cancelled and fills when the price reaches it.'
            : 'The buy is a day order: if it isn’t filled by the close it is cancelled. Once bought, a good-till-cancelled sell is placed from the actual fill price.'}
        </AppText>
      </View>

      {serverError ? (
        <AppText variant="label" tone="danger" accessibilityLiveRegion="polite">
          {serverError}
        </AppText>
      ) : null}

      <PillButton title={submitLabel} onPress={submit} loading={submitting} />
    </ScrollView>
  );
}

function PreviewRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.previewRow}>
      <AppText variant="label" tone="muted" style={styles.flex}>
        {label}
      </AppText>
      <AppText variant={strong ? 'heading' : 'label'} weight={strong ? 'bold' : 'semibold'}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  hint: {
    marginTop: -spacing.md,
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    minHeight: TOUCH_TARGET - 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  summary: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  preview: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rules: {
    marginTop: spacing.xs,
  },
});
