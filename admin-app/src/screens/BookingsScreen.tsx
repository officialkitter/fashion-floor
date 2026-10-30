import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '../shared/components/PressableScale';
import { Card, Empty, Heading, Label, NoAccess, Segmented, StatusPill } from '../shared/components/ui';
import { colors, radius, space, type } from '../shared/theme/tokens';
import { dayLabel, maskEmail, money, timeLabel } from '../lib/utils';
import { useAccess, useStore } from '../store/useStore';

type Filter = 'upcoming' | 'pending' | 'past';

export function BookingsScreen() {
  const { can, own, scope } = useAccess();
  const bookings = useStore((state) => state.bookings);
  const setBookingStatus = useStore((state) => state.setBookingStatus);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [savingId, setSavingId] = useState<string | null>(null);

  if (!can('bookings.view')) return <NoAccess what="appointments" />;

  const now = Date.now();
  const changeStatus = async (id: string, status: string) => {
    setSavingId(id);
    try {
      await setBookingStatus(id, status);
    } finally {
      setSavingId(null);
    }
  };
  const list = own(bookings).filter((booking) => {
    const future = new Date(booking.startsAt).getTime() >= now;
    if (filter === 'upcoming') return future && ['booked', 'confirmed', 'pending'].includes(booking.status);
    if (filter === 'pending') return booking.status === 'pending';
    return !future && booking.status !== 'cancelled';
  });
  if (filter === 'past') list.sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  let lastDay = '';

  return (
    <View style={{ gap: space.lg }}>
      <Heading title="Appointments" subtitle="Review bookings and confirm or cancel when permitted." />
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'pending', label: 'To confirm' },
          { value: 'past', label: 'Past' },
        ]}
      />
      {list.length === 0 ? <Empty title="No appointments" hint="There are no bookings in this view." /> : null}
      {list.slice(0, 50).map((booking, index) => {
        const day = booking.startsAt.slice(0, 10);
        const header = day !== lastDay;
        lastDay = day;
        const editable = can('bookings.manage') && (booking.status === 'pending' || booking.status === 'booked' || booking.status === 'confirmed');
        return (
          <View key={booking.id} style={{ gap: 10 }}>
            {header ? <Label>{dayLabel(booking.startsAt)}</Label> : null}
            <Card index={index} style={{ gap: 12 }}>
              <View style={styles.row}>
                <View style={styles.time}>
                  <Text style={styles.timeText}>{timeLabel(booking.startsAt)}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.title}>{booking.service} · {money(booking.price, booking.currency)}</Text>
                  <Text style={styles.meta} numberOfLines={3}>
                    {booking.customer.name}{booking.customer.email ? ` (${scope === 'own' ? maskEmail(booking.customer.email) : booking.customer.email})` : ''}
                    {booking.stylistName ? ` with ${booking.stylistName}` : ''}
                    {scope === 'all' && booking.partnerName ? ` · ${booking.partnerName}` : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <StatusPill status={booking.status} />
                {editable ? (
                  <View style={styles.btns}>
                    {booking.status === 'pending' ? (
                      <PressableScale
                        disabled={savingId === booking.id}
                        style={[styles.btn, { backgroundColor: colors.success }]}
                        accessibilityRole="button"
                        accessibilityLabel="Confirm appointment"
                        onPress={() => void changeStatus(booking.id, 'confirmed')}
                      >
                        <Text style={[styles.btnText, { color: colors.white }]}>Confirm</Text>
                      </PressableScale>
                    ) : null}
                    <PressableScale
                      disabled={savingId === booking.id}
                      style={[styles.btn, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.danger }]}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel appointment"
                      onPress={() => void changeStatus(booking.id, 'cancelled')}
                    >
                      <Text style={[styles.btnText, { color: colors.danger }]}>Cancel</Text>
                    </PressableScale>
                  </View>
                ) : null}
              </View>
            </Card>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  time: { backgroundColor: colors.espresso, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8 },
  timeText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  title: { ...type.body, fontWeight: '700', color: colors.espresso },
  meta: { fontSize: 12, lineHeight: 18, color: colors.slate },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  btns: { flexDirection: 'row', gap: 8 },
  btn: { minHeight: 40, paddingHorizontal: 16, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
});
