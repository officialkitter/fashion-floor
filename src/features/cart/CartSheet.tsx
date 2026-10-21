import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { colors, radius, space, type } from '../../shared/theme/tokens';
import { formatMoney, formatTime } from '../../shared/utils/format';
import type { CartItem } from '../../shared/types/domain';
import { selectCurrency, selectSubtotal, useCartStore } from './cartStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CartSheet({ visible, onClose }: Props) {
  const items = useCartStore((s) => s.items);
  const remove = useCartStore((s) => s.remove);
  const subtotal = useCartStore(selectSubtotal);
  const currency = useCartStore(selectCurrency);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <View style={styles.heading}>
          <View>
            <Text style={styles.kicker}>FASHION FLOOR</Text>
            <Text style={styles.title}>Your bag</Text>
          </View>
          <Text style={styles.count}>{items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'}</Text>
        </View>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyMark}>FF</Text>
            <Text style={styles.emptyTitle}>A little room for something lovely.</Text>
            <Text style={styles.emptyCopy}>Your selected pieces and appointments will live here.</Text>
          </View>
        ) : (
          <ScrollView style={styles.items} showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <CartRow key={item.id} item={item} onRemove={() => remove(item.id)} />
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.total}>{formatMoney(subtotal, currency)}</Text>
            </View>
            <Text style={styles.note}>Taxes and any delivery costs are calculated at checkout.</Text>
          </ScrollView>
        )}
        <PrimaryButton label="Continue browsing" onPress={onClose} variant="secondary" />
      </View>
    </BottomSheet>
  );
}

function CartRow({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
  const isProduct = item.kind === 'product';
  const detail = isProduct
    ? `Size ${item.size}${item.quantity > 1 ? ` · Qty ${item.quantity}` : ''}`
    : `${new Date(item.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${formatTime(item.starts_at)}`;

  return (
    <View style={styles.row}>
      {isProduct ? (
        <Image source={{ uri: item.image_url }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={styles.bookingImage}>
          <Text style={styles.bookingMark}>FF</Text>
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.brand} numberOfLines={1}>
          {isProduct ? item.brand_tag.label : 'THE LOUNGE'}
        </Text>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.detail} numberOfLines={1}>{detail}</Text>
      </View>
      <View style={styles.itemEnd}>
        <Text style={styles.price}>{formatMoney(item.unit_price_minor * item.quantity, item.currency)}</Text>
        <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${item.title}`}>
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, paddingTop: 38, paddingBottom: space.md, gap: space.lg },
  heading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  kicker: { ...type.label, color: colors.terracotta, marginBottom: 4 },
  title: { ...type.display, fontFamily: 'serif', fontSize: 34, lineHeight: 40 },
  count: { ...type.label, color: colors.slate, marginBottom: 6 },
  items: { flexGrow: 0, maxHeight: 400 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.offWhite },
  image: { width: 58, height: 70, borderRadius: radius.sm, backgroundColor: colors.offWhite },
  bookingImage: { width: 58, height: 70, borderRadius: radius.sm, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center' },
  bookingMark: { fontFamily: 'serif', color: colors.terracotta, fontSize: 22 },
  itemInfo: { flex: 1, gap: 3 },
  brand: { ...type.label, fontSize: 9, color: colors.terracotta },
  itemTitle: { ...type.body, fontWeight: '600', color: colors.black },
  detail: { ...type.body, fontSize: 12, color: colors.slate },
  itemEnd: { alignItems: 'flex-end', gap: 7 },
  price: { ...type.price, fontSize: 13, color: colors.black },
  remove: { color: colors.slate, fontSize: 11, textDecorationLine: 'underline' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: space.lg },
  totalLabel: { ...type.body, fontWeight: '600', color: colors.black },
  total: { ...type.title, fontSize: 17 },
  note: { ...type.body, color: colors.slate, fontSize: 12, marginTop: 4, marginBottom: space.sm },
  empty: { alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.xl, backgroundColor: colors.offWhite, borderRadius: radius.lg },
  emptyMark: { fontFamily: 'serif', color: colors.terracotta, fontSize: 38, marginBottom: space.md },
  emptyTitle: { ...type.title, fontFamily: 'serif', textAlign: 'center', fontSize: 22, lineHeight: 28 },
  emptyCopy: { ...type.body, color: colors.slate, textAlign: 'center', fontSize: 13, marginTop: space.sm },
});
