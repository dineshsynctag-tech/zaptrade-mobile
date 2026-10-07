/**
 * Design tokens for ZapTrade Mobile. Components read colors only from here —
 * never hard-code a hex value in a component.
 */
import type { LegStatus } from '@/types/order';

interface BadgeColors {
  bg: string;
  fg: string;
}

export interface ThemeColors {
  /** Diagonal brand gradient, top-left → bottom-right. */
  gradient: readonly [string, string];
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  textOnGradient: string;
  textOnGradientMuted: string;
  /** Small red field labels, links, focus underline. */
  accent: string;
  success: string;
  danger: string;
  /** Decorative circles on auth screens. */
  decorPrimary: string;
  decorSecondary: string;
  overlay: string;
  badge: Record<LegStatus, BadgeColors>;
}

const gradient = ['#C8102E', '#3B1C3F'] as const;

const light: ThemeColors = {
  gradient,
  background: '#F5F4F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F4F8',
  border: '#E6E5EC',
  text: '#1E1E2A',
  textMuted: '#8A8A99',
  textOnGradient: '#FFFFFF',
  textOnGradientMuted: 'rgba(255,255,255,0.72)',
  accent: '#C8102E',
  success: '#16794A',
  danger: '#C4320A',
  decorPrimary: 'rgba(200,16,46,0.14)',
  decorSecondary: 'rgba(138,138,153,0.12)',
  overlay: 'rgba(16,10,20,0.45)',
  badge: {
    QUEUED: { bg: '#FFF2D6', fg: '#9A5B00' },
    WORKING: { bg: '#E2ECFF', fg: '#1D4FD8' },
    FILLED: { bg: '#DCF4E6', fg: '#13703F' },
    CANCELLED: { bg: '#EDEDF2', fg: '#5B5B6B' },
    REJECTED: { bg: '#FDE3E0', fg: '#B42318' },
  },
};

const dark: ThemeColors = {
  gradient,
  background: '#121218',
  surface: '#1D1C26',
  surfaceMuted: '#17161F',
  border: '#2D2C3A',
  text: '#F2F1F7',
  textMuted: '#9C9BAE',
  textOnGradient: '#FFFFFF',
  textOnGradientMuted: 'rgba(255,255,255,0.72)',
  accent: '#FF5A73',
  success: '#45C985',
  danger: '#FF7A66',
  decorPrimary: 'rgba(255,90,115,0.16)',
  decorSecondary: 'rgba(156,155,174,0.10)',
  overlay: 'rgba(0,0,0,0.6)',
  badge: {
    QUEUED: { bg: 'rgba(255,184,0,0.16)', fg: '#FFC94D' },
    WORKING: { bg: 'rgba(80,140,255,0.18)', fg: '#8DB4FF' },
    FILLED: { bg: 'rgba(69,201,133,0.16)', fg: '#6FDBA2' },
    CANCELLED: { bg: 'rgba(156,155,174,0.16)', fg: '#B9B8C9' },
    REJECTED: { bg: 'rgba(255,90,90,0.18)', fg: '#FF8F85' },
  },
};

export const colors = { light, dark };

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export type FontWeight = keyof typeof fonts;

export const typography = {
  display: { fontSize: 28, lineHeight: 36 },
  title: { fontSize: 22, lineHeight: 30 },
  heading: { fontSize: 17, lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  card: 16,
  /** Top corners of a sheet overlapping the gradient header. */
  sheet: 30,
  pill: 999,
} as const;

/** Minimum touch target (px). */
export const TOUCH_TARGET = 44;

export interface Theme {
  scheme: 'light' | 'dark';
  colors: ThemeColors;
}
