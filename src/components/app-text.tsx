import { Text, type TextProps } from 'react-native';

import { fonts, typography, type FontWeight, type TypographyVariant } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';

type Tone = 'default' | 'muted' | 'accent' | 'success' | 'danger' | 'onGradient' | 'onGradientMuted';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  weight?: FontWeight;
  tone?: Tone;
}

export function AppText({
  variant = 'body',
  weight = 'regular',
  tone = 'default',
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useAppTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    accent: colors.accent,
    success: colors.success,
    danger: colors.danger,
    onGradient: colors.textOnGradient,
    onGradientMuted: colors.textOnGradientMuted,
  }[tone];

  return (
    <Text
      {...rest}
      style={[typography[variant], { fontFamily: fonts[weight], color }, style]}
    />
  );
}
