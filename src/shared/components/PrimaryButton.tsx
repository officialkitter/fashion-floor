import React from 'react';
import { StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PressableScale } from './PressableScale';
import { colors, radius } from '../theme/tokens';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  /** Right-aligned text, e.g. a running total. */
  trailing?: string;
}

export function PrimaryButton({ label, onPress, variant = 'primary', disabled, trailing }: Props) {
  const primary = variant === 'primary';
  const textColor = primary ? colors.white : colors.black;

  return (
    <PressableScale
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={trailing ? `${label}, ${trailing}` : label}
      style={[styles.base, primary ? styles.primary : styles.secondary, disabled && styles.disabled]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {trailing ? <Text style={[styles.label, { color: textColor }]}>{trailing}</Text> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primary: { backgroundColor: colors.black },
  secondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.black },
  disabled: { opacity: 0.4 },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: 0.6 },
});
