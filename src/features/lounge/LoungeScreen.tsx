import React, { useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { colors, radius, space, type } from '../../shared/theme/tokens';
import { useLoungeStore } from './loungeStore';
import { StylistCard, StylistCardSkeleton } from './StylistCard';

const SKELETONS = [0, 1, 2];

export function LoungeScreen() {
  const items = useLoungeStore((s) => s.items);
  const status = useLoungeStore((s) => s.status);
  const error = useLoungeStore((s) => s.error);
  const load = useLoungeStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const header = (
    <Animated.View entering={FadeInDown.duration(650).springify()} style={styles.header}>
      <LinearGradient colors={[colors.black, '#514239']} style={styles.hero}>
        <Text style={styles.kicker}>THE LOUNGE · YOUR MOMENT</Text>
        <Text style={styles.display}>A little time{"\n"}for yourself.</Text>
        <Text style={styles.heroSub}>Meet your people. Book your chair.</Text>
        <View style={styles.heroMark}>
          <Text style={styles.heroMarkText}>FF</Text>
        </View>
      </LinearGradient>
      <View style={styles.sectionRow}>
        <View>
          <Text style={styles.sectionTitle}>Meet the artists</Text>
          <Text style={styles.sub}>Choose a time that works for you.</Text>
        </View>
        {items.length > 0 ? <Text style={styles.count}>{String(items.length).padStart(2, '0')} ARTISTS</Text> : null}
      </View>
    </Animated.View>
  );

  if (status === 'loading' && items.length === 0) {
    return (
      <View style={styles.pad}>
        {header}
        <View style={styles.gap}>
          {SKELETONS.map((i) => (
            <StylistCardSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  }

  if (status === 'error' && items.length === 0) {
    return (
      <View style={[styles.pad, styles.gap]}>
        {header}
        <Text style={styles.error}>{error ?? 'Could not load the lounge.'}</Text>
        <PrimaryButton label="Try again" onPress={() => load({ force: true })} />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(s) => s.id}
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={status === 'refreshing'}
          onRefresh={() => load({ force: true })}
          tintColor={colors.black}
        />
      }
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInUp.delay(index * 85).springify()}>
          <StylistCard stylist={item} />
        </Animated.View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: space.sm, paddingBottom: space.xl },
  hero: { minHeight: 204, padding: space.xl, justifyContent: 'center', overflow: 'hidden', borderRadius: radius.lg },
  kicker: { ...type.label, color: '#D8C5B2', marginBottom: space.md },
  display: { ...type.display, fontFamily: 'serif', color: colors.white, fontSize: 35, lineHeight: 39 },
  heroSub: { ...type.body, color: '#E5DCD2', fontSize: 13, marginTop: space.sm },
  heroMark: { position: 'absolute', width: 142, height: 142, borderRadius: 71, right: -28, bottom: -44, borderWidth: 1, borderColor: 'rgba(255,252,248,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroMarkText: { color: 'rgba(255,252,248,0.14)', fontFamily: 'serif', fontSize: 76, fontWeight: '500' },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: space.xl },
  sectionTitle: { ...type.title, fontFamily: 'serif', fontSize: 24, lineHeight: 29 },
  sub: { ...type.body, color: colors.slate, fontSize: 13, marginTop: 3 },
  count: { ...type.label, color: colors.terracotta, marginBottom: 3 },
  list: { paddingHorizontal: space.xl, paddingBottom: 140 },
  pad: { paddingHorizontal: space.xl },
  gap: { gap: space.md },
  error: { ...type.body, color: colors.danger },
});
