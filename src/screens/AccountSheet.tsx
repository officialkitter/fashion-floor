import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { BottomSheet } from '../shared/components/BottomSheet';
import { colors, loungeColors, radius, space, type } from '../shared/theme/tokens';
import { useAppSettingsStore } from '../shared/state/appSettingsStore';
import { signIn, signOut, signUp } from '../shared/api/auth';
import { supabase } from '../shared/api/client';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAuthChange?: () => void;
  lounge?: boolean;
}

const accountLinks = [
  ['Personal information', 'Name, email and phone'],
  ['Addresses', 'Delivery and saved locations'],
  ['Payments & billing', 'Manage preferred payment methods'],
  ['Orders & bookings', 'Receipts, tracking and appointments'],
  ['Reviews', 'Your notes and recommendations'],
  ['Help center', 'We are here whenever you need us'],
  ['Terms & privacy', 'How Fashion Floor looks after your data'],
];

export function AccountSheet({ visible, onClose, onAuthChange, lounge = false }: Props) {
  const palette = lounge ? loungeColors : colors;
  const [activeLink, setActiveLink] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const profileName = useAppSettingsStore((state) => state.profileName);
  const setProfileName = useAppSettingsStore((state) => state.setProfileName);
  const profileImageUri = useAppSettingsStore((state) => state.profileImageUri);
  const setProfileImageUri = useAppSettingsStore((state) => state.setProfileImageUri);
  const locationLabel = useAppSettingsStore((state) => state.locationLabel);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const language = useAppSettingsStore((state) => state.language);
  const setLanguage = useAppSettingsStore((state) => state.setLanguage);
  const notifications = useAppSettingsStore((state) => state.notificationsEnabled);
  const setNotifications = useAppSettingsStore((state) => state.setNotificationsEnabled);

  useEffect(() => {
    if (!visible) return;
    if (!supabase) {
      setAuthenticated(false);
      setAuthError('Connect this app to Supabase to use a customer account.');
      return;
    }

    let active = true;
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;
        setAuthenticated(Boolean(data.session));
        setEmail(data.session?.user.email ?? '');
        const displayName = data.session?.user.user_metadata?.display_name;
        if (typeof displayName === 'string' && displayName.trim()) setProfileName(displayName);
        setAuthError('');
      } catch (error) {
        if (active) setAuthError(error instanceof Error ? error.message : 'Could not load your account.');
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session));
      setEmail(session?.user.email ?? '');
      onAuthChange?.();
      const displayName = session?.user.user_metadata?.display_name;
      if (typeof displayName === 'string' && displayName.trim()) setProfileName(displayName);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [onAuthChange, setProfileName, visible]);

  const submitAuthentication = async () => {
    setAuthLoading(true);
    setAuthError('');
    setAuthMessage('');
    try {
      if (creatingAccount) {
        const result = await signUp(email, password, profileName);
        if (!result.session) {
          setAuthMessage('Check your email to confirm your account, then sign in.');
        } else {
          setAuthenticated(true);
          setAuthMessage('Your account is ready.');
        }
      } else {
        await signIn(email, password);
        setAuthenticated(true);
        setPassword('');
        setAuthMessage('You are signed in.');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not complete sign in.');
    } finally {
      setAuthLoading(false);
    }
  };

  const submitSignOut = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      await signOut();
      setPassword('');
      setAuthMessage('You are signed out.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sign out.');
    } finally {
      setAuthLoading(false);
    }
  };

  const selectProfileImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera access needed', 'Allow camera access to take a profile photo.');
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Photo access needed', 'Allow photo library access to choose a profile photo.');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets[0]?.uri) setProfileImageUri(result.assets[0].uri);
    } catch (error) {
      Alert.alert('Could not update photo', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Profile photo', 'Choose how to add your photo.', [
      { text: 'Take a photo', onPress: () => { void selectProfileImage(true); } },
      { text: 'Choose from gallery', onPress: () => { void selectProfileImage(false); } },
      ...(profileImageUri ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => setProfileImageUri(null) }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} surfaceColor={palette.white} backdropColor={palette.black} handleColor={palette.sand}>
      <ScrollView style={[styles.scroll, { backgroundColor: palette.white }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profile}>
          <Pressable onPress={showPhotoOptions} accessibilityRole="button" accessibilityLabel="Change profile photo">
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={[styles.avatar, { backgroundColor: palette.offWhite }]} contentFit="cover" />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: palette.offWhite }]}>
                <Text style={[styles.avatarInitial, { color: palette.black }]}>{profileName.trim().charAt(0).toUpperCase() || 'U'}</Text>
                <Text style={[styles.avatarEdit, { color: palette.terracotta }]}>EDIT</Text>
              </View>
            )}
          </Pressable>
          <View style={styles.profileText}>
            <Text style={[styles.kicker, { color: palette.terracotta }]}>YOUR PROFILE</Text>
            <Text style={[styles.name, { color: palette.black }]}>{profileName}</Text>
            <Text style={[styles.description, { color: palette.slate }]}>{locationLabel}</Text>
          </View>
        </View>
        <View style={[styles.authPanel, { backgroundColor: palette.offWhite }]}>
          <Text style={[styles.detailTitle, { color: palette.black }]}>
            {authenticated ? 'CUSTOMER ACCOUNT' : creatingAccount ? 'CREATE YOUR ACCOUNT' : 'SIGN IN'}
          </Text>
          {authenticated ? (
            <>
              <Text style={[styles.linkDetail, { color: palette.slate }]}>{email}</Text>
              <Pressable disabled={authLoading} onPress={() => { void submitSignOut(); }} style={[styles.saveButton, { backgroundColor: palette.black }]}>
                <Text style={styles.saveButtonText}>{authLoading ? 'Please wait…' : 'Sign out'}</Text>
              </Pressable>
            </>
          ) : (
            <>
              {creatingAccount ? (
                <TextInput value={profileName} onChangeText={setProfileName} placeholder="Full name" autoCapitalize="words" style={[styles.detailInput, { borderColor: palette.sand, color: palette.black }]} />
              ) : null}
              <TextInput value={email} onChangeText={setEmail} placeholder="Email address" autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={[styles.detailInput, { borderColor: palette.sand, color: palette.black }]} />
              <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry autoComplete={creatingAccount ? 'new-password' : 'current-password'} style={[styles.detailInput, { borderColor: palette.sand, color: palette.black }]} />
              {authError ? <Text accessibilityRole="alert" style={[styles.authMessage, { color: palette.terracotta }]}>{authError}</Text> : null}
              {authMessage ? <Text style={[styles.authMessage, { color: palette.slate }]}>{authMessage}</Text> : null}
              <Pressable disabled={authLoading} onPress={() => { void submitAuthentication(); }} style={[styles.saveButton, { backgroundColor: palette.black }]}>
                <Text style={styles.saveButtonText}>{authLoading ? 'Please wait…' : creatingAccount ? 'Create account' : 'Sign in'}</Text>
              </Pressable>
              <Pressable onPress={() => { setCreatingAccount(!creatingAccount); setAuthError(''); setAuthMessage(''); }}>
                <Text style={[styles.authToggle, { color: palette.terracotta }]}>
                  {creatingAccount ? 'Already have an account? Sign in' : 'New to Fashion Floor? Create an account'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
        <View style={[styles.summary, { backgroundColor: palette.offWhite }]}>
          <SummaryItem value="—" label="Orders" palette={palette} />
          <SummaryItem value="—" label="Booking" palette={palette} />
          <SummaryItem value="—" label="Lifetime spend" palette={palette} last />
        </View>
        <Text style={[styles.section, { color: palette.terracotta }]}>ACCOUNT & SUPPORT</Text>
        {accountLinks.map(([title, detail]) => (
          <Pressable key={title} onPress={() => { setActiveLink(activeLink === title ? null : title); setSaved(false); }} style={[styles.link, { borderBottomColor: palette.offWhite }]} accessibilityRole="button">
            <View style={styles.linkCopy}>
              <Text style={[styles.linkTitle, { color: palette.black }]}>{title}</Text>
              <Text style={[styles.linkDetail, { color: palette.slate }]}>{detail}</Text>
            </View>
            <Text style={[styles.arrow, { color: palette.slate }]}>{activeLink === title ? '⌄' : '›'}</Text>
          </Pressable>
        ))}
        {activeLink ? (
          <View style={[styles.detailPanel, { backgroundColor: palette.offWhite }]}>
            <Text style={[styles.detailTitle, { color: palette.black }]}>{activeLink}</Text>
            <Text style={[styles.linkDetail, { color: palette.slate }]}>
              {saved
                ? 'Your preview details are saved for this session.'
                : activeLink === 'Orders & bookings'
                ? 'Your orders, delivery tracking, bookings and downloadable receipts are ready to explore from the bottom navigation.'
                : activeLink === 'Addresses'
                  ? 'Add a home, work or preferred delivery location. Saved addresses will be available at checkout.'
                  : activeLink === 'Payments & billing'
                    ? 'Review your preferred payment methods and billing details before confirming an order.'
                    : activeLink === 'Personal information'
                      ? 'Update your profile name, email address and mobile number.'
                      : activeLink === 'Reviews'
                        ? 'See your product reviews and recommendations for local stores and artists.'
                        : activeLink === 'Help center'
                          ? 'Find answers about delivery, returns, appointments and payments.'
                          : 'Review the terms of use and privacy information for Fashion Floor.'}
            </Text>
            {activeLink === 'Personal information' ? (
              <>
                <TextInput value={profileName} onChangeText={setProfileName} placeholder="Full name" style={[styles.detailInput, { borderColor: palette.sand, color: palette.black }]} />
                <TextInput value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" style={[styles.detailInput, { borderColor: palette.sand, color: palette.black }]} />
                <TextInput value={phone} onChangeText={setPhone} placeholder="Mobile number" keyboardType="phone-pad" style={[styles.detailInput, { borderColor: palette.sand, color: palette.black }]} />
              </>
            ) : activeLink === 'Addresses' ? (
              <>
                <TextInput value={address} onChangeText={setAddress} placeholder="Add a delivery address" style={[styles.detailInput, { borderColor: palette.sand, color: palette.black }]} />
                <Text style={[styles.linkDetail, { color: palette.slate }]}>No saved address yet.</Text>
              </>
            ) : activeLink === 'Payments & billing' ? (
              <Text style={[styles.linkDetail, { color: palette.slate }]}>No payment method is saved. Payment details are collected only through a secure checkout.</Text>
            ) : null}
            {['Personal information', 'Addresses', 'Payments & billing'].includes(activeLink) ? (
              <Pressable onPress={() => { setProfileName(profileName.trim() || 'Fashion Floor member'); setSaved(true); }} style={[styles.saveButton, { backgroundColor: palette.black }]}>
                <Text style={styles.saveButtonText}>{saved ? 'Saved' : 'Save changes'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <Text style={[styles.section, { color: palette.terracotta }]}>PREFERENCES</Text>
        <View style={[styles.preference, { borderBottomColor: palette.offWhite }]}>
          <View style={styles.preferenceCopy}>
            <Text style={[styles.linkTitle, { color: palette.black }]}>Notifications</Text>
            <Text style={[styles.linkDetail, { color: palette.slate }]}>Offers, order and booking updates</Text>
          </View>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: palette.terracotta }} />
        </View>
        <View style={[styles.preference, { borderBottomColor: palette.offWhite }]}>
          <View style={styles.preferenceCopy}>
            <Text style={[styles.linkTitle, { color: palette.black }]}>Kiswahili</Text>
            <Text style={[styles.linkDetail, { color: palette.slate }]}>{language === 'sw' ? 'Lugha ya programu: Kiswahili' : 'App language: English'}</Text>
          </View>
          <Switch value={language === 'sw'} onValueChange={(value) => setLanguage(value ? 'sw' : 'en')} trackColor={{ true: palette.terracotta }} />
        </View>
        <Pressable onPress={onClose} style={[styles.close, { backgroundColor: palette.black }]}>
          <Text style={styles.closeText}>Done</Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
}

function SummaryItem({
  value,
  label,
  palette,
  last = false,
}: {
  value: string;
  label: string;
  palette: typeof colors | typeof loungeColors;
  last?: boolean;
}) {
  return (
    <View style={[styles.summaryItem, { borderRightColor: palette.sand }, last && styles.summaryItemLast]}>
      <Text style={[styles.summaryValue, { color: palette.black }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: palette.slate }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: space.xl, paddingTop: 42, paddingBottom: space.lg },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginBottom: space.lg },
  avatar: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.offWhite },
  avatarFallback: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 24, fontWeight: '700' },
  avatarEdit: { fontSize: 7, fontWeight: '800', letterSpacing: 0.5, marginTop: 1 },
  profileText: { flex: 1 },
  kicker: { ...type.label, color: colors.terracotta, fontSize: 9 },
  name: { ...type.title, fontFamily: 'serif', fontSize: 24, marginTop: 3 },
  description: { ...type.body, fontSize: 12, color: colors.slate, marginTop: 1 },
  summary: { flexDirection: 'row', backgroundColor: colors.offWhite, borderRadius: radius.md, paddingVertical: space.md, marginBottom: space.xl },
  summaryItem: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.sand },
  summaryItemLast: { borderRightWidth: 0 },
  summaryValue: { ...type.title, fontSize: 15 },
  summaryLabel: { ...type.body, color: colors.slate, fontSize: 9, marginTop: 2 },
  section: { ...type.label, color: colors.terracotta, marginTop: space.sm, marginBottom: space.xs },
  link: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.offWhite },
  linkCopy: { flex: 1 },
  linkTitle: { ...type.body, color: colors.black, fontWeight: '700', fontSize: 13 },
  linkDetail: { ...type.body, color: colors.slate, fontSize: 10, marginTop: 2 },
  arrow: { color: colors.slate, fontSize: 24, paddingLeft: space.md },
  preference: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.offWhite },
  preferenceCopy: { flex: 1 },
  detailPanel: { backgroundColor: colors.offWhite, borderRadius: radius.md, padding: space.md, marginTop: space.md, marginBottom: space.sm },
  authPanel: { borderRadius: radius.md, padding: space.md, marginBottom: space.lg },
  authMessage: { ...type.body, fontSize: 11, marginTop: space.xs },
  authToggle: { ...type.body, fontSize: 11, fontWeight: '700', textAlign: 'center', paddingTop: space.md },
  detailTitle: { ...type.body, color: colors.black, fontSize: 12, fontWeight: '800', marginBottom: 4 },
  detailInput: { minHeight: 40, borderWidth: 1, borderColor: colors.sand, borderRadius: radius.sm, paddingHorizontal: space.sm, marginTop: space.xs, color: colors.black, fontSize: 12 },
  saveButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black, borderRadius: radius.pill, marginTop: space.sm },
  saveButtonText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  close: { marginTop: space.lg, backgroundColor: colors.black, borderRadius: radius.pill, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.white, fontWeight: '700' },
});
