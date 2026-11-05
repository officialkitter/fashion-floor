import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Empty, Heading, NoAccess, Segmented, StatusPill } from '../shared/components/ui';
import { PressableScale } from '../shared/components/PressableScale';
import { colors, radius, space, type } from '../shared/theme/tokens';
import { money } from '../lib/utils';
import { useAccess, useStore } from '../store/useStore';

type CatalogSection = 'products' | 'services';
type Filter = 'all' | 'pending' | 'low' | 'out';

export function ProductsScreen() {
  const { can, own } = useAccess();
  const products = own(useStore((state) => state.products));
  const services = own(useStore((state) => state.services));
  const loading = useStore((state) => state.refreshing);
  const reviewProduct = useStore((state) => state.reviewProduct);
  const reviewService = useStore((state) => state.reviewService);
  const [section, setSection] = useState<CatalogSection>('products');
  const [filter, setFilter] = useState<Filter>('all');
  const [actionId, setActionId] = useState<string | null>(null);

  if (!can('catalog.view')) return <NoAccess what="products and services" />;

  const visibleProducts = products.filter((product) => {
    if (filter === 'pending') return product.approvalStatus === 'pending';
    if (filter === 'out') return product.stock <= 0;
    if (filter === 'low') return product.stock > 0 && product.stock <= 3;
    return true;
  });
  const visibleServices = services.filter((service) => filter !== 'pending' || service.approvalStatus === 'pending');

  async function onReview(kind: CatalogSection, id: string, decision: 'published' | 'rejected') {
    setActionId(id);
    try {
      const success = kind === 'products'
        ? await reviewProduct(id, decision)
        : await reviewService(id, decision);
      return success;
    } finally {
      setActionId(null);
    }
  }

  return (
    <View style={{ gap: space.lg }}>
      <Heading title="Products and services" subtitle="Review submissions, check current stock, and manage live listings." />
      <Segmented<CatalogSection>
        value={section}
        onChange={(value) => { setSection(value); setFilter('all'); }}
        items={[
          { value: 'products', label: `Products (${products.filter((item) => item.approvalStatus === 'pending').length} to review)` },
          { value: 'services', label: `Services (${services.filter((item) => item.approvalStatus === 'pending').length} to review)` },
        ]}
      />
      {section === 'products' ? (
        <>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Review' },
              { value: 'low', label: 'Low stock' },
              { value: 'out', label: 'Out of stock' },
            ]}
          />
          {visibleProducts.length === 0 ? <Empty title={loading ? 'Loading products…' : 'No products found'} hint={filter === 'pending' ? 'New and updated listings will appear here for approval.' : 'Try another inventory filter or refresh live data.'} /> : null}
          {visibleProducts.map((product, index) => {
            const canPublish = Boolean(
              product.images.length && product.description.trim() && product.stock > 0
              && product.price > 0 && product.priceConfirmed && product.category.trim()
              && product.brandPartnershipStatus === 'verified' && product.brandApprovalStatus === 'published'
              && product.storeApprovalStatus === 'published' && product.partnerStatus === 'approved',
            );
            const canReview = can('catalog.approve') && product.approvalStatus === 'pending';
            const busy = actionId === product.id;
            return (
              <Card key={product.id} index={index} style={styles.card}>
                {product.images[0] ? (
                  <Image source={{ uri: product.images[0] }} style={styles.image} contentFit="cover" transition={200} />
                ) : (
                  <View style={[styles.image, styles.imageFallback]}>
                    <MaterialCommunityIcons name="image-off-outline" size={23} color={colors.slate} />
                    <Text style={styles.photoHint}>Photo needed</Text>
                  </View>
                )}
                <View style={styles.details}>
                  <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{[product.category, product.status === 'in_stock' ? 'In stock' : product.status.replaceAll('_', ' ')].join(' · ')}</Text>
                  <View style={styles.statusRow}>
                    <StatusPill status={product.approvalStatus} />
                    <Text style={styles.meta}>{product.stock} on hand{product.stockTarget > 0 ? ` · ${product.stockTarget} target` : ''}</Text>
                  </View>
                  <Text style={styles.description} numberOfLines={3}>{product.description || 'Add a full product description before requesting approval.'}</Text>
                  <Text style={styles.price}>{money(product.price, product.currency)}{!product.priceConfirmed ? ' · Proposed' : ''}</Text>
                  {canReview ? (
                    <View style={styles.actions}>
                      <ReviewButton label="Approve" icon="check" disabled={!canPublish || busy} loading={busy} onPress={() => void onReview('products', product.id, 'published')} />
                      <ReviewButton label="Decline" icon="close" danger disabled={busy} loading={false} onPress={() => void onReview('products', product.id, 'rejected')} />
                    </View>
                  ) : null}
                  {canReview && !canPublish ? <Text style={styles.validation}>Approval needs a photo, description, category, confirmed price, verified brand and store, approved partner, and received stock.</Text> : null}
                </View>
              </Card>
            );
          })}
        </>
      ) : (
        <>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'all', label: 'All services' },
              { value: 'pending', label: 'Awaiting review' },
            ]}
          />
          {visibleServices.length === 0 ? <Empty title={loading ? 'Loading services…' : 'No services found'} hint="Service listings need a description, price, duration, and business photo before approval." /> : null}
          {visibleServices.map((service, index) => {
            const canPublish = Boolean(
              service.coverUrl && service.description.trim() && service.price > 0
              && service.priceConfirmed && service.durationMinutes > 0
              && service.businessApprovalStatus === 'published' && service.partnerStatus === 'approved',
            );
            const canReview = can('catalog.approve') && service.approvalStatus === 'pending';
            const busy = actionId === service.id;
            return (
              <Card key={service.id} index={index} style={styles.card}>
                {service.coverUrl ? (
                  <Image source={{ uri: service.coverUrl }} style={styles.image} contentFit="cover" transition={200} />
                ) : (
                  <View style={[styles.image, styles.imageFallback]}>
                    <MaterialCommunityIcons name="image-off-outline" size={23} color={colors.slate} />
                    <Text style={styles.photoHint}>Photo needed</Text>
                  </View>
                )}
                <View style={styles.details}>
                  <Text style={styles.title} numberOfLines={2}>{service.name}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{[service.businessName, service.category].filter(Boolean).join(' · ')}</Text>
                  <View style={styles.statusRow}>
                    <StatusPill status={service.approvalStatus} />
                    <Text style={styles.meta}>{service.durationMinutes} minutes</Text>
                  </View>
                  <Text style={styles.description} numberOfLines={3}>{service.description || 'Add service details before requesting approval.'}</Text>
                  <Text style={styles.price}>{money(service.price, service.currency)}{!service.priceConfirmed ? ' · Proposed' : ''}</Text>
                  {canReview ? (
                    <View style={styles.actions}>
                      <ReviewButton label="Approve" icon="check" disabled={!canPublish || busy} loading={busy} onPress={() => void onReview('services', service.id, 'published')} />
                      <ReviewButton label="Decline" icon="close" danger disabled={busy} loading={false} onPress={() => void onReview('services', service.id, 'rejected')} />
                    </View>
                  ) : null}
                  {canReview && !canPublish ? <Text style={styles.validation}>Approval needs a verified provider, business photo, description, confirmed price, and service duration.</Text> : null}
                </View>
              </Card>
            );
          })}
        </>
      )}
    </View>
  );
}

function ReviewButton({ label, icon, disabled, danger = false, loading, onPress }: {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  disabled: boolean;
  danger?: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      pressedScale={0.96}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.button, danger ? styles.dangerButton : styles.approveButton, disabled && styles.disabled]}
    >
      {loading ? <ActivityIndicator size="small" color={colors.white} /> : <MaterialCommunityIcons name={icon} size={16} color={danger ? colors.danger : colors.white} />}
      <Text style={[styles.buttonText, danger && { color: colors.danger }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12 },
  image: { width: 82, height: 110, borderRadius: radius.md, backgroundColor: colors.cream },
  imageFallback: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoHint: { fontSize: 9, fontWeight: '700', color: colors.slate, textAlign: 'center' },
  details: { flex: 1, gap: 6 },
  title: { ...type.body, fontWeight: '700', color: colors.espresso },
  meta: { fontSize: 11, color: colors.slate },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  description: { fontSize: 11, lineHeight: 16, color: colors.charcoal },
  price: { fontSize: 13, fontWeight: '700', color: colors.espresso },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  button: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderRadius: radius.pill },
  approveButton: { backgroundColor: colors.success },
  dangerButton: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.danger },
  buttonText: { fontSize: 11, fontWeight: '700', color: colors.white },
  disabled: { opacity: 0.45 },
  validation: { fontSize: 10, lineHeight: 14, color: colors.warning },
});
