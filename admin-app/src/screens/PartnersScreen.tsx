import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BottomSheet } from '../shared/components/BottomSheet';
import { Card, Empty, Heading, Label, NoAccess, Segmented, StatusPill } from '../shared/components/ui';
import { colors, radius, space, type } from '../shared/theme/tokens';
import type { Partner, PartnerType } from '../lib/data';
import { useAccess, useStore } from '../store/useStore';

type Filter = 'all' | PartnerType | 'pending';

export function PartnersScreen() {
  const { can } = useAccess();
  const partners = useStore((state) => state.partners);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  if (!can('partners.view')) return <NoAccess what="suppliers and service providers" />;

  const list = partners.filter((partner) => (
    filter === 'all' ? true : filter === 'pending' ? partner.status === 'pending' : partner.type === filter
  ));
  const open: Partner | undefined = partners.find((partner) => partner.id === openId);

  return (
    <View style={{ gap: space.lg }}>
      <Heading title="Partners" subtitle="Suppliers and service providers on Fashion Floor." />
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'all', label: 'All' },
          { value: 'supplier', label: 'Suppliers' },
          { value: 'provider', label: 'Providers' },
          { value: 'pending', label: 'Pending' },
        ]}
      />
      {list.length === 0 ? <Empty title="No partners found" hint="Try another filter or refresh live data." /> : null}
      {list.map((partner, index) => (
        <Card key={partner.id} index={index} onPress={() => setOpenId(partner.id)} style={{ padding: 0, overflow: 'hidden' }}>
          {partner.cover ? <Image source={{ uri: partner.cover }} style={styles.cover} contentFit="cover" /> : null}
          <View style={styles.cardBody}>
            {partner.logo ? <Image source={{ uri: partner.logo }} style={styles.logo} contentFit="cover" /> : <View style={styles.logoFallback}><Text style={styles.initial}>{partner.name.slice(0, 1)}</Text></View>}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name}>{partner.name}</Text>
              <Text style={styles.meta}>{partner.type === 'supplier' ? 'Supplier' : 'Service provider'}{partner.city ? ` · ${partner.city}` : ''}</Text>
            </View>
            <StatusPill status={partner.status} />
          </View>
        </Card>
      ))}

      <BottomSheet visible={!!open} onClose={() => setOpenId(null)}>
        {open ? (
          <>
            {open.cover ? <Image source={{ uri: open.cover }} style={styles.bigCover} contentFit="cover" /> : null}
            <View style={{ gap: 6 }}>
              <Text style={type.title}>{open.name}</Text>
              <StatusPill status={open.status} />
            </View>
            <View style={styles.info}>
              {[
                ['Type', open.type === 'supplier' ? 'Supplier' : 'Service provider'],
                ['Owner', open.owner],
                ['Email', open.email],
                ['Phone', open.phone],
                ['City', open.city],
                ...(open.commission ? [['Commission', `${open.commission}%`]] : []),
              ].filter(([, value]) => !!value).map(([label, value]) => (
                <View key={label} style={styles.infoRow}>
                  <Text style={styles.meta}>{label}</Text>
                  <Text style={styles.infoVal}>{value}</Text>
                </View>
              ))}
            </View>
            {open.docs.length ? (
              <View style={{ gap: 8 }}>
                <Label>Documents</Label>
                {open.docs.map((document) => (
                  <View key={document.label} style={styles.infoRow}>
                    <Text style={type.body}>{document.label}</Text>
                    <Text style={styles.meta}>{document.ok ? 'Verified' : 'Not verified'}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={styles.meta}>Partner changes are managed through the platform administration service.</Text>
          </>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 84 },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  logo: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.cream },
  logoFallback: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 20, color: colors.espresso, fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '800', color: colors.espresso },
  meta: { fontSize: 12, color: colors.slate, lineHeight: 18 },
  bigCover: { width: '100%', height: 120, borderRadius: radius.lg },
  info: { backgroundColor: colors.offWhite, borderRadius: radius.md, paddingHorizontal: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, gap: 12 },
  infoVal: { fontSize: 14, fontWeight: '700', color: colors.espresso, flexShrink: 1, textAlign: 'right' },
});
