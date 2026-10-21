import type { TextStyle } from 'react-native';

/** Fashion Floor's warm editorial palette. Status colors are utility-only. */
export const colors = {
  black: '#211C18', // headers, active elements, primary buttons
  white: '#FFFCF8', // primary canvas
  charcoal: '#3B332D',
  slate: '#8A8076',
  offWhite: '#F1EBE3', // card backings
  sand: '#E6D9C9',
  terracotta: '#A9684D',
  success: '#00C781', // success / active booking / paid
  warning: '#FF9500', // pending / processing / low stock
  danger: '#FF3B30', // cancelled / out of stock / error
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 10, md: 18, lg: 26, sheet: 30, pill: 999 } as const;

/** High-contrast scale: heavy, tight headers; airy, tracked labels and prices. */
export const type = {
  display: { fontSize: 38, lineHeight: 44, fontWeight: '500', letterSpacing: -1, color: colors.black },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2, color: colors.black },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400', color: colors.charcoal },
  label: { fontSize: 10, lineHeight: 14, fontWeight: '700', letterSpacing: 1.7, textTransform: 'uppercase', color: colors.slate },
  price: { fontSize: 15, lineHeight: 20, fontWeight: '500', letterSpacing: 0.6, color: colors.charcoal },
} as const satisfies Record<string, TextStyle>;

/** Spring configs. All consumed by Reanimated worklets (UI thread). */
export const springs = {
  press: { damping: 14, stiffness: 420, mass: 0.6 },
  page: { damping: 24, stiffness: 220, mass: 0.9 },
  sheet: { damping: 22, stiffness: 190, mass: 0.9 },
  sweep: { damping: 16, stiffness: 110, mass: 1 },
} as const;
