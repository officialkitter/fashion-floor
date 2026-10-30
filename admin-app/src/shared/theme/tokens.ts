import type { TextStyle } from 'react-native';

/** Fashion Floor coffee palette. Status colors are reserved for status and feedback. */
export const colors = {
  black: '#684A38',
  espresso: '#30231D',
  coffee: '#5D4033',
  caramel: '#9A6B4F',
  cream: '#E8D8C8',
  white: '#FFFFFF', // primary canvas
  charcoal: '#45352D',
  slate: '#70635C',
  offWhite: '#F7F2ED',
  success: '#26734D',
  warning: '#9A5A0A',
  danger: '#A33B32',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 10, md: 16, lg: 24, sheet: 28, pill: 999 } as const;

/** High-contrast scale: heavy, tight headers; airy, tracked labels and prices. */
export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8, color: colors.black },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2, color: colors.black },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400', color: colors.charcoal },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: colors.slate },
  price: { fontSize: 15, lineHeight: 20, fontWeight: '500', letterSpacing: 0.6, color: colors.charcoal },
} as const satisfies Record<string, TextStyle>;

/** Spring configs. All consumed by Reanimated worklets (UI thread). */
export const springs = {
  press: { damping: 14, stiffness: 420, mass: 0.6 },
  page: { damping: 24, stiffness: 220, mass: 0.9 },
  sheet: { damping: 22, stiffness: 190, mass: 0.9 },
  sweep: { damping: 16, stiffness: 110, mass: 1 },
} as const;
