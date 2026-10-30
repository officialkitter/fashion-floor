import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STATUS_META } from '../theme/status';
import { colors, radius } from '../theme/tokens';
import type { Status } from '../types/domain';

interface Props {
  status: Status;
  /** Override the default label (e.g. "Fully booked"). */
  label?: string;
  accentColor?: string;
  surfaceColor?: string;
  textColor?: string;
}

export function StatusPill({ status, label, accentColor, surfaceColor, textColor }: Props) {
  const meta = STATUS_META[status];
  return (
    <View style={[styles.pill, surfaceColor ? { backgroundColor: surfaceColor } : null]}>
      <View style={[styles.dot, { backgroundColor: accentColor ?? meta.color }]} />
      <Text style={[styles.text, textColor ? { color: textColor } : null]}>{label ?? meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: colors.charcoal },
});
