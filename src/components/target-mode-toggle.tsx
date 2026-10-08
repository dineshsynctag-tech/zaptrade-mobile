import type { TargetMode } from '@/utils/order-form';
import { SegmentedControl, type SegmentOption } from './segmented-control';

const OPTIONS: SegmentOption<TargetMode>[] = [
  { value: 'pct', label: 'Profit %' },
  { value: 'sell', label: 'Sell Price' },
];

export function TargetModeToggle({
  value,
  onChange,
}: {
  value: TargetMode;
  onChange: (mode: TargetMode) => void;
}) {
  return <SegmentedControl options={OPTIONS} value={value} onChange={onChange} />;
}
