import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Skeleton } from '../../shared/components/Skeleton';
import { StatusPill } from '../../shared/components/StatusPill';
import { colors, radius, space, type } from '../../shared/theme/tokens';
import type { Stylist } from '../../shared/types/domain';
import { formatMoney } from '../../shared/utils/format';
import { SlotChip } from './SlotChip';

export const StylistCard = memo(function StylistCard({ stylist }: { stylist: Stylist }) {
  const open = stylist.slots.filter((s) => s.status === 'available');
  const from = open.length ? Math.min(...open.map((s) => s.price_minor)) : null;
  const currency = stylist.slots[0]?.currency ?? 'USD';

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Image source={{ uri: stylist.avatar_url }} style={styles.avatar} contentFit="cover" transition={200} />
        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={1}>
            {stylist.name}
          </Text>
          <Text style={styles.role} numberOfLines={1}>
            {stylist.role} · ★ {stylist.rating.toFixed(1)}
            {from !== null ? ` · from ${formatMoney(from, currency)}` : ''}
          </Text>
        </View>
        {open.length > 0 ? (
          <StatusPill status="available" label={`${open.length} open`} />
        ) : (
          <StatusPill status="taken" label="Fully booked" />
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.slots}
        // Keep horizontal slot scrolling from fighting the page swipe.
        nestedScrollEnabled
      >
        {stylist.slots.map((slot) => (
          <SlotChip key={slot.id} stylist={stylist} slot={slot} />
        ))}
      </ScrollView>
    </View>
  );
});

export function StylistCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Skeleton width={56} height={56} radius={28} />
        <View style={styles.meta}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="80%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
      <View style={styles.slots}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={72} height={44} radius={radius.pill} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, paddingVertical: space.lg, gap: space.lg, borderWidth: 1, borderColor: colors.offWhite },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.white },
  meta: { flex: 1 },
  name: { ...type.title, fontSize: 18 },
  role: { ...type.body, fontSize: 13, color: colors.slate, marginTop: 2 },
  slots: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg },
});
