import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Skeleton } from '../../shared/components/Skeleton';
import { StatusPill } from '../../shared/components/StatusPill';
import { colors, loungeColors, radius, space, type } from '../../shared/theme/tokens';
import type { Stylist } from '../../shared/types/domain';
import { formatMoney } from '../../shared/utils/format';
import { SlotChip } from './SlotChip';
import { useFavoritesStore } from '../boutique/favoritesStore';

export const StylistCard = memo(function StylistCard({ stylist, buildingName, lounge = false }: { stylist: Stylist; buildingName?: string; lounge?: boolean }) {
  const palette = lounge ? loungeColors : colors;
  const favorite = useFavoritesStore((state) => state.stylistIds.includes(stylist.id));
  const toggleStylist = useFavoritesStore((state) => state.toggleStylist);
  const open = stylist.slots.filter((s) => s.status === 'available');
  const from = open.length ? Math.min(...open.map((s) => s.price_minor)) : null;
  const currency = stylist.slots[0]?.currency ?? 'USD';

  return (
    <View style={[styles.card, lounge && { backgroundColor: loungeColors.white, borderColor: loungeColors.offWhite }]}>
      <View style={styles.head}>
        <Image source={{ uri: stylist.avatar_url }} style={styles.avatar} contentFit="cover" transition={200} />
        <View style={styles.meta}>
          <Text style={[styles.name, lounge && { color: loungeColors.black }]} numberOfLines={1}>
            {stylist.name}
          </Text>
          <Text style={[styles.role, lounge && { color: loungeColors.slate }]} numberOfLines={1}>
            {stylist.role} · ★ {stylist.rating.toFixed(1)}
            {from !== null ? ` · from ${formatMoney(from, currency)}` : ''}
          </Text>
        </View>
        {open.length > 0 ? (
          <StatusPill
            status="available"
            label={`${open.length} open`}
            accentColor={palette.success}
            surfaceColor={palette.offWhite}
            textColor={palette.charcoal}
          />
        ) : (
          <StatusPill
            status="taken"
            label="Fully booked"
            surfaceColor={palette.offWhite}
            textColor={palette.charcoal}
          />
        )}
        <Pressable
          onPress={() => toggleStylist(stylist.id)}
          style={[styles.favorite, { backgroundColor: palette.offWhite }]}
          accessibilityRole="button"
          accessibilityLabel={favorite ? `Remove ${stylist.name} from favorites` : `Add ${stylist.name} to favorites`}
          hitSlop={8}
        >
          <Text style={[styles.favoriteIcon, { color: favorite ? palette.terracotta : palette.slate }]}>{favorite ? '♥' : '♡'}</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.slots}
        // Keep horizontal slot scrolling from fighting the page swipe.
        nestedScrollEnabled
      >
        {stylist.slots.map((slot) => (
          <SlotChip key={slot.id} stylist={stylist} slot={slot} buildingName={buildingName} />
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
  favorite: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center' },
  favoriteIcon: { color: colors.slate, fontSize: 18 },
  favoriteActive: { color: colors.terracotta },
  slots: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg },
});
