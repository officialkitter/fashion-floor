import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BottomSheet } from '../shared/components/BottomSheet';
import { PrimaryButton } from '../shared/components/PrimaryButton';
import { Avatar, Card, Empty, Heading, Label, NoAccess, Segmented, StatusPill } from '../shared/components/ui';
import { colors, radius, space, type } from '../shared/theme/tokens';
import { OrderStatus } from '../lib/data';
import { dayLabel, maskEmail, money, statusLabel, timeLabel } from '../lib/utils';
import { useAccess, useStore } from '../store/useStore';

type Filter = 'all' | OrderStatus;
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: 'processing', label: 'Start processing' },
};

export function OrdersScreen() {
  const { can, own, scope } = useAccess();
  const orders = useStore((s) => s.orders);
  const setOrderStatus = useStore((s) => s.setOrderStatus);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!can('orders.view')) return <NoAccess what="orders" />;

  const list = own(orders).filter((o) => filter === 'all' || o.status === filter);
  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    ...Array.from(new Set(own(orders).map((order) => order.status))).map((status) => ({ value: status, label: statusLabel(status) })),
  ];
  const open = orders.find((o) => o.id === openId);
  const close = () => {
    setOpenId(null);
    setConfirm(false);
  };
  const updateStatus = async (id: string, status: string) => {
    setSaving(true);
    try {
      if (await setOrderStatus(id, status)) close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: space.lg }}>
      <Heading title="Orders" subtitle="Review orders and their current status." />
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'all', label: 'All' },
          ...filters.slice(1),
        ]}
      />
      {list.length === 0 ? (
        <Empty title="No orders here" hint="Try another filter." />
      ) : (
        list.slice(0, 30).map((o, i) => (
          <Card key={o.id} index={i} onPress={() => setOpenId(o.id)} style={styles.row}>
            {o.items[0]?.image ? (
              <Image source={{ uri: o.items[0].image }} style={styles.thumb} contentFit="cover" transition={200} />
            ) : <View style={[styles.thumb, styles.thumbEmpty]} />}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.title} numberOfLines={1}>
                {o.items.length ? `${o.items[0].title}${o.items.length > 1 ? ` + ${o.items.length - 1} items` : ` × ${o.items[0].qty}`}` : 'Order details'}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {o.displayId} · {o.customer.name}
              </Text>
              <StatusPill status={o.status} />
            </View>
            <Text style={styles.price}>{money(o.total, o.currency)}</Text>
          </Card>
        ))
      )}

      <BottomSheet visible={!!open} onClose={close}>
        {open ? (
          <>
            <View style={{ gap: 4 }}>
              <Text style={type.title}>Order {open.displayId}</Text>
              <Text style={styles.meta}>
                {dayLabel(open.createdAt)} at {timeLabel(open.createdAt)}
              </Text>
            </View>
            <StatusPill status={open.status} />
            {open.items.map((it, index) => (
              <View key={`${it.title}-${index}`} style={styles.itemRow}>
                <Image source={{ uri: it.image }} style={styles.thumb} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{it.title}</Text>
                  <Text style={styles.meta}>
                    Size {it.size} · Qty {it.qty}
                  </Text>
                </View>
                <Text style={styles.price}>{money(it.price * it.qty, open.currency)}</Text>
              </View>
            ))}
            <View style={styles.customer}>
              <Label>Customer</Label>
              <View style={styles.customerRow}>
                <Avatar uri={open.customer.avatar} size={40} />
                <View>
                  <Text style={styles.title}>{open.customer.name}</Text>
                  {open.customer.email ? <Text style={styles.meta}>{scope === 'own' ? maskEmail(open.customer.email) : open.customer.email}</Text> : null}
                </View>
              </View>
              {scope === 'own' ? <Text style={styles.meta}>Contact details are partly hidden to protect customers.</Text> : null}
            </View>

            {can('orders.manage') ? (
              <View style={{ gap: 10 }}>
                {NEXT[open.status] ? (
                  <PrimaryButton
                    label={saving ? 'Updating order…' : NEXT[open.status]!.label}
                    disabled={saving}
                    onPress={() => void updateStatus(open.id, NEXT[open.status]!.to)}
                  />
                ) : null}
                {open.status === 'pending' || open.status === 'processing' ? (
                  <PrimaryButton
                    variant="secondary"
                    label={saving ? 'Updating order…' : confirm ? 'Tap again to cancel this order' : 'Cancel order'}
                    disabled={saving}
                    onPress={() => {
                      if (!confirm) return setConfirm(true);
                      void updateStatus(open.id, 'cancelled');
                    }}
                  />
                ) : null}
              </View>
            ) : (
              <Text style={styles.meta}>Your role can look at orders but not change them.</Text>
            )}
          </>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  thumb: { width: 60, height: 60, borderRadius: radius.md, backgroundColor: colors.white },
  thumbEmpty: { backgroundColor: colors.cream },
  title: { ...type.body, fontWeight: '700', color: colors.black },
  meta: { fontSize: 12, color: colors.slate },
  price: { fontSize: 15, fontWeight: '700', color: colors.black },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.offWhite, borderRadius: radius.md, padding: 10 },
  customer: { gap: 10, backgroundColor: colors.offWhite, borderRadius: radius.md, padding: 14 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
