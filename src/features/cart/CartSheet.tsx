import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { colors, loungeColors, radius, space, type } from '../../shared/theme/tokens';
import { formatMoney, formatTime } from '../../shared/utils/format';
import type { CartItem } from '../../shared/types/domain';
import { useCartStore } from './cartStore';
import { supabase } from '../../shared/api/client';
import { useLoungeStore } from '../lounge/loungeStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSignIn: () => void;
  lounge?: boolean;
}

export function CartSheet({ visible, onClose, onSignIn, lounge = false }: Props) {
  const palette = lounge ? loungeColors : colors;
  const items = useCartStore((s) => s.items);
  const remove = useCartStore((s) => s.remove);
  const activeItems = items.filter((item) => lounge ? item.kind === 'salon' : item.kind === 'product');
  const subtotal = activeItems.reduce((sum, item) => sum + item.unit_price_minor * item.quantity, 0);
  const currency = activeItems[0]?.currency ?? 'TZS';
  const [checkout, setCheckout] = useState(false);
  const [payment, setPayment] = useState('M-Pesa');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const refreshLounge = useLoungeStore((state) => state.load);

  useEffect(() => {
    if (visible && activeItems.length > 0) {
      setCheckout(false);
      setOrderPlaced(false);
      setBookingError('');
    }
  }, [visible, activeItems.length]);

  const confirmBooking = async () => {
    const appointment = activeItems.find((item) => item.kind === 'salon');
    if (!appointment || appointment.kind !== 'salon') return;
    if (!supabase) {
      setBookingError('Live booking requires the Fashion Floor Supabase project to be configured.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        setBookingError('Sign in to reserve this appointment.');
        return;
      }

      const { data, error } = await supabase.rpc('reserve_service_slot', {
        p_slot_id: appointment.slot_id,
        p_customer_notes: customerNotes.trim(),
      });
      if (error) throw error;

      setBookingId(data);
      remove(appointment.id);
      setOrderPlaced(true);
      void refreshLounge({ force: true });
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Could not reserve this appointment.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} surfaceColor={palette.white} backdropColor={palette.black} handleColor={palette.sand}>
      <View style={[styles.content, { backgroundColor: palette.white }]}>
        <View style={styles.heading}>
          <View>
            <Text style={[styles.kicker, { color: palette.terracotta }]}>{lounge ? 'THE LOUNGE' : 'FASHION FLOOR'}</Text>
            <Text style={[styles.title, { color: palette.black }]}>{orderPlaced ? 'You’re all set' : checkout ? 'Checkout' : lounge ? 'Your bookings' : 'Your bag'}</Text>
          </View>
          <Text style={[styles.count, { color: palette.slate }]}>{orderPlaced ? (lounge ? 'CONFIRMED' : 'PREVIEW') : `${activeItems.length} ${activeItems.length === 1 ? (lounge ? 'BOOKING' : 'ITEM') : (lounge ? 'BOOKINGS' : 'ITEMS')}`}</Text>
        </View>
        {orderPlaced ? (
          <View style={[styles.empty, { backgroundColor: palette.offWhite }]}>
            <Text style={[styles.emptyMark, { color: palette.terracotta }]}>✓</Text>
            <Text style={[styles.emptyTitle, { color: palette.black }]}>{lounge ? 'Your appointment is confirmed.' : 'Your preview order is ready.'}</Text>
            <Text style={[styles.emptyCopy, { color: palette.slate }]}>{lounge ? `Confirmation reference ${bookingId}` : 'This preview does not submit payment or create a real order.'}</Text>
          </View>
        ) : activeItems.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: palette.offWhite }]}>
            <Text style={[styles.emptyMark, { color: palette.terracotta }]}>{lounge ? '◷' : 'FF'}</Text>
            <Text style={[styles.emptyTitle, { color: palette.black }]}>{lounge ? 'Your appointments will appear here.' : 'A little room for something lovely.'}</Text>
            <Text style={[styles.emptyCopy, { color: palette.slate }]}>{lounge ? 'Choose a service and appointment time at a studio.' : 'Your selected pieces and appointments will live here.'}</Text>
          </View>
        ) : checkout ? (
          <ScrollView style={styles.items} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => setCheckout(false)} style={styles.backButton}>
              <Text style={[styles.backText, { color: palette.terracotta }]}>‹  Back to {lounge ? 'bookings' : 'bag'}</Text>
            </Pressable>
            <Text style={[styles.formLabel, { color: palette.terracotta }]}>{lounge ? 'APPOINTMENT DETAILS' : 'DELIVERY DETAILS'}</Text>
            {!lounge ? <TextInput placeholder="Full name" placeholderTextColor={palette.slate} style={[styles.input, { borderColor: palette.offWhite, color: palette.black }]} /> : null}
            {!lounge ? <TextInput placeholder="Mobile number · +255" placeholderTextColor={palette.slate} keyboardType="phone-pad" style={[styles.input, { borderColor: palette.offWhite, color: palette.black }]} /> : null}
            {!lounge ? <TextInput placeholder="Delivery address in Tanzania" placeholderTextColor={palette.slate} style={[styles.input, { borderColor: palette.offWhite, color: palette.black }]} /> : (
              <TextInput value={customerNotes} onChangeText={setCustomerNotes} placeholder="Appointment notes (optional)" placeholderTextColor={palette.slate} multiline style={[styles.input, styles.notesInput, { borderColor: palette.offWhite, color: palette.black }]} />
            )}
            {!lounge ? <Text style={[styles.formLabel, { color: palette.terracotta, marginTop: space.lg }]}>PAYMENT METHOD</Text> : null}
            {!lounge ? ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Pay on delivery'].map((method) => (
              <Pressable key={method} onPress={() => setPayment(method)} style={styles.paymentOption}>
                <View style={[styles.radio, { borderColor: palette.slate }, payment === method && { borderColor: palette.terracotta }]}>
                  {payment === method ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={[styles.paymentName, { color: palette.black }]}>{method}</Text>
                {method === 'M-Pesa' ? <Text style={[styles.recommended, { color: palette.terracotta }]}>POPULAR</Text> : null}
              </Pressable>
            )) : null}
            {!lounge ? <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: palette.slate }]}>Delivery</Text>
              <Text style={[styles.total, { color: palette.black }]}>TZS 5,000</Text>
            </View> : null}
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: palette.slate }]}>{lounge ? 'Appointment price' : 'Total'}</Text>
              <Text style={[styles.total, { color: palette.black }]}>{formatMoney(subtotal + (lounge ? 0 : 500000), currency)}</Text>
            </View>
            {bookingError ? <Text accessibilityRole="alert" style={[styles.note, { color: palette.terracotta }]}>{bookingError}</Text> : null}
            {bookingError.includes('Sign in') ? (
              <Pressable onPress={onSignIn} style={[styles.signInButton, { backgroundColor: palette.black }]}>
                <Text style={styles.signInText}>Open account</Text>
              </Pressable>
            ) : null}
            {!lounge ? <Text style={[styles.note, { color: palette.slate }]}>Payment is a preview only. No money will be charged.</Text> : null}
          </ScrollView>
        ) : (
          <ScrollView style={styles.items} showsVerticalScrollIndicator={false}>
            {activeItems.map((item) => (
              <CartRow key={item.id} item={item} onRemove={() => remove(item.id)} palette={palette} />
            ))}
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: palette.slate }]}>Subtotal</Text>
              <Text style={[styles.total, { color: palette.black }]}>{formatMoney(subtotal, currency)}</Text>
            </View>
            <Text style={[styles.note, { color: palette.slate }]}>Taxes and any delivery costs are calculated at checkout.</Text>
          </ScrollView>
        )}
        {activeItems.length > 0 && !orderPlaced ? (
          checkout
            ? <PrimaryButton label={bookingLoading ? 'Reserving appointment…' : lounge ? 'Confirm appointment' : `Place preview order · ${payment}`} onPress={() => { if (lounge) void confirmBooking(); else { setOrderPlaced(true); } }} disabled={bookingLoading} backgroundColor={palette.black} textColor={palette.white} />
            : <PrimaryButton label={lounge ? 'Continue with booking' : 'Proceed to checkout'} trailing={formatMoney(subtotal, currency)} onPress={() => setCheckout(true)} backgroundColor={palette.black} textColor={palette.white} />
        ) : (
          <PrimaryButton label="Continue browsing" onPress={() => { setCheckout(false); setOrderPlaced(false); onClose(); }} variant="secondary" backgroundColor={palette.offWhite} textColor={palette.black} />
        )}
      </View>
    </BottomSheet>
  );
}

function CartRow({ item, onRemove, palette }: { item: CartItem; onRemove: () => void; palette: typeof colors | typeof loungeColors }) {
  const isProduct = item.kind === 'product';
  const detail = isProduct
    ? `Size ${item.size}${item.color ? ` · ${item.color}` : ''}${item.quantity > 1 ? ` · Qty ${item.quantity}` : ''}`
    : `${item.building_name ? `${item.building_name} · ` : ''}${new Date(item.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${formatTime(item.starts_at)}`;

  return (
    <View style={[styles.row, { borderBottomColor: palette.offWhite }]}>
      {isProduct ? (
        <Image source={{ uri: item.image_url }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.bookingImage, { backgroundColor: palette.offWhite }]}>
          <Text style={[styles.bookingMark, { color: palette.terracotta }]}>◷</Text>
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={[styles.brand, { color: palette.terracotta }]} numberOfLines={1}>
          {isProduct ? item.brand_tag.label : 'THE LOUNGE'}
        </Text>
        <Text style={[styles.itemTitle, { color: palette.black }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.detail, { color: palette.slate }]} numberOfLines={1}>{detail}</Text>
      </View>
      <View style={styles.itemEnd}>
        <Text style={[styles.price, { color: palette.black }]}>{formatMoney(item.unit_price_minor * item.quantity, item.currency)}</Text>
        <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${item.title}`}>
          <Text style={[styles.remove, { color: palette.terracotta }]}>Remove</Text>
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
  backButton: { paddingVertical: space.xs, alignSelf: 'flex-start' },
  backText: { color: colors.terracotta, fontSize: 12, fontWeight: '800' },
  formLabel: { ...type.label, color: colors.terracotta, marginBottom: space.xs },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.offWhite, borderRadius: radius.md, paddingHorizontal: space.md, marginBottom: space.sm, color: colors.black, fontSize: 13 },
  notesInput: { minHeight: 82, paddingTop: space.md, textAlignVertical: 'top' },
  signInButton: { minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, marginBottom: space.sm },
  signInText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  paymentOption: { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: space.md, borderBottomWidth: 1, borderBottomColor: colors.offWhite },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.slate, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.terracotta },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.terracotta },
  paymentName: { ...type.body, fontSize: 13, color: colors.black, flex: 1 },
  recommended: { ...type.label, color: colors.terracotta, fontSize: 8 },
  empty: { alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.xl, backgroundColor: colors.offWhite, borderRadius: radius.lg },
  emptyMark: { fontFamily: 'serif', color: colors.terracotta, fontSize: 38, marginBottom: space.md },
  emptyTitle: { ...type.title, fontFamily: 'serif', textAlign: 'center', fontSize: 22, lineHeight: 28 },
  emptyCopy: { ...type.body, color: colors.slate, textAlign: 'center', fontSize: 13, marginTop: space.sm },
});
