import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BoutiqueScreen } from '../features/boutique/BoutiqueScreen';
import { CartBar } from '../features/cart/CartBar';
import { CartSheet } from '../features/cart/CartSheet';
import { LoungeScreen } from '../features/lounge/LoungeScreen';
import { DualZoneSlider } from '../shared/components/Slider';
import { colors } from '../shared/theme/tokens';

interface Props {
  onOpenCart?: () => void;
}

export function HomeScreen({ onOpenCart }: Props) {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <View style={styles.root}>
      <DualZoneSlider
        labels={['The Boutique', 'The Lounge']}
        left={<BoutiqueScreen />}
        right={<LoungeScreen />}
      />
      <CartBar onPress={onOpenCart ?? (() => setCartOpen(true))} />
      <CartSheet visible={cartOpen} onClose={() => setCartOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
});
