import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { formatMoney } from '../../shared/utils/format';
import { selectCount, selectCurrency, selectSubtotal, useCartStore } from './cartStore';

interface Props {
  onPress?: () => void;
}

/** Unified bag bar: products and appointments are one count, one total. */
export function CartBar({ onPress }: Props) {
  const insets = useSafeAreaInsets();
  const count = useCartStore(selectCount);
  const subtotal = useCartStore(selectSubtotal);
  const currency = useCartStore(selectCurrency);

  if (count === 0) return null;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown.duration(200)}
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}
    >
      <PrimaryButton
        label={`View bag · ${count}`}
        trailing={formatMoney(subtotal, currency)}
        onPress={onPress ?? (() => {})}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 24, right: 24 },
});
