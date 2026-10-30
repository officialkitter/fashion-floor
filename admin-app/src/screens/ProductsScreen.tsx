import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Card, Empty, Heading, NoAccess, Segmented, StatusPill } from '../shared/components/ui';
import { colors, radius, space, type } from '../shared/theme/tokens';
import { money } from '../lib/utils';
import { useAccess, useStore } from '../store/useStore';

type Filter = 'all' | 'low' | 'out';

export function ProductsScreen() {
  const { can, own } = useAccess();
  const products = own(useStore((state) => state.products));
  const partners = useStore((state) => state.partners);
  const [filter, setFilter] = useState<Filter>('all');

  if (!can('catalog.view')) return <NoAccess what="products" />;

  const visible = products.filter((product) => {
    if (filter === 'out') return product.stock <= 0;
    if (filter === 'low') return product.stock > 0 && product.stock <= 3;
    return true;
  });

  return (
    <View style={{ gap: space.lg }}>
      <Heading title="Products" subtitle="Live product listings and inventory." />
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'all', label: 'All' },
          { value: 'low', label: 'Low stock' },
          { value: 'out', label: 'Out of stock' },
        ]}
      />
      {visible.length === 0 ? <Empty title="No products found" hint="Try another inventory filter or refresh live data." /> : null}
      {visible.map((product, index) => {
        const partner = partners.find((item) => item.id === product.partnerId);
        const image = product.images[0];
        return (
          <Card key={product.id} index={index} style={styles.row}>
            {image ? (
              <Image source={{ uri: image }} style={styles.image} contentFit="cover" />
            ) : (
              <View style={[styles.image, styles.imageFallback]}><Text style={styles.initial}>{product.title.slice(0, 1)}</Text></View>
            )}
            <View style={styles.details}>
              <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
              <Text style={styles.meta} numberOfLines={1}>{[product.category, partner?.name].filter(Boolean).join(' · ')}</Text>
              <View style={styles.stockRow}>
                <StatusPill status={product.status} />
                <Text style={styles.meta}>{product.stock} in stock</Text>
              </View>
            </View>
            <Text style={styles.price}>{money(product.price, product.currency)}</Text>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  image: { width: 68, height: 68, borderRadius: radius.md, backgroundColor: colors.cream },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 24, fontWeight: '700', color: colors.espresso },
  details: { flex: 1, gap: 5 },
  title: { ...type.body, fontWeight: '700', color: colors.espresso },
  meta: { fontSize: 12, color: colors.slate },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  price: { fontSize: 14, fontWeight: '700', color: colors.espresso },
});
