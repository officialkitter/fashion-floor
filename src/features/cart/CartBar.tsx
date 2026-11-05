import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { loungeColors } from '../../shared/theme/tokens';
import { formatMoney } from '../../shared/utils/format';
import { useCartStore } from './cartStore';

interface Props {
  onPress?: () => void;
  bottomOffset?: number;
  lounge?: boolean;
}

/** Shows the cart total for the active department only. */
export function CartBar({ onPress, bottomOffset = 12, lounge = false }: Props) {
  const insets = useSafeAreaInsets();
  const cartItems = useCartStore((state) => state.items);
  const items = useMemo(
    () => cartItems.filter((item) => lounge ? item.kind === 'salon' : item.kind === 'product'),
    [cartItems, lounge],
  );
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + item.unit_price_minor * item.quantity, 0);
  const currency = items[0]?.currency ?? 'TZS';

  if (count === 0) return null;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown.duration(200)}
      style={[styles.wrap, { bottom: Math.max(insets.bottom, bottomOffset) }]}
    >
      <PrimaryButton
        label={`${lounge ? 'View bookings' : 'View bag'} · ${count}`}
        trailing={formatMoney(subtotal, currency)}
        onPress={onPress ?? (() => {})}
        backgroundColor={lounge ? loungeColors.black : undefined}
        textColor={lounge ? loungeColors.white : undefined}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 24, right: 24 },
});
