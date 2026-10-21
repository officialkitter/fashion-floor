import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { Chip, ChipState } from '../../shared/components/Chip';
import { ImageCarousel } from '../../shared/components/Slider';
import { StatusPill } from '../../shared/components/StatusPill';
import { colors, space, type } from '../../shared/theme/tokens';
import type { Product } from '../../shared/types/domain';
import { formatMoney } from '../../shared/utils/format';
import { useCartStore } from '../cart/cartStore';
import { BrandTagBadge } from './BrandTagBadge';

interface Props {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
}

const LOW_STOCK_AT = 2;

/** Single-tap add: tapping a size adds it, flashes Mint Green, then the drawer closes itself. */
export function SizeSheet({ product, visible, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const addProduct = useCartStore((s) => s.addProduct);
  const [added, setAdded] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (visible) setAdded(null);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible]);

  const onPick = (size: string) => {
    if (!product || added) return;
    addProduct(product, size);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAdded(size);
    timer.current = setTimeout(onClose, 550);
  };

  const carouselHeight = Math.min(width * 1.1, height * 0.42);
  const anyLow = product?.sizes.some((s) => s.stock > 0 && s.stock <= LOW_STOCK_AT) ?? false;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {product ? (
        <View>
          <ImageCarousel
            images={product.images}
            width={width}
            height={carouselHeight}
            overlay={<BrandTagBadge brand_tag={product.brand_tag} />}
          />
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={2}>
                {product.title}
              </Text>
              <Text style={styles.price}>{formatMoney(product.price_minor, product.currency)}</Text>
            </View>
            {product.status !== 'in_stock' ? <StatusPill status={product.status} /> : null}

            <Text style={styles.label}>Tap a size to add</Text>
            <View style={styles.sizes}>
              {product.sizes.map(({ size, stock }) => {
                const state: ChipState = stock < 1 ? 'disabled' : added === size ? 'active' : 'default';
                return (
                  <Chip
                    key={size}
                    label={size}
                    state={state}
                    dotColor={stock > 0 && stock <= LOW_STOCK_AT ? colors.warning : undefined}
                    accessibilityLabel={
                      stock < 1 ? `Size ${size}, sold out` : `Add size ${size} to bag`
                    }
                    onPress={() => onPick(size)}
                  />
                );
              })}
            </View>
            {anyLow ? <Text style={styles.hint}>Amber dot means only a few left.</Text> : null}
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.xl, paddingTop: space.md, gap: space.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.md },
  title: { ...type.title, flex: 1 },
  price: { ...type.price, fontSize: 18, color: colors.black },
  label: { ...type.label, marginTop: space.sm },
  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hint: { fontSize: 12, color: colors.slate },
});
