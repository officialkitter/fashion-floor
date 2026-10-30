import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { colors, radius, space, type } from '../../shared/theme/tokens';

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400',
    label: 'A WORLD OF STYLE',
    title: 'Find your\nfashion floor.',
    copy: 'Discover considered pieces from the brands and boutiques you love.',
  },
  {
    image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1400',
    label: 'MADE FOR YOUR MOMENTS',
    title: 'Wear what\nmoves you.',
    copy: 'New arrivals, thoughtful edits, and pieces for every version of you.',
  },
  {
    image: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1400',
    label: 'MEET YOU AT THE LOUNGE',
    title: 'Style is also\nself-care.',
    copy: 'Find your artist, book your moment, and make a little time for you.',
  },
];

interface Props {
  onEnter: () => void;
}

export function WelcomeExperience({ onEnter }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [auth, setAuth] = useState(false);
  const [mode, setMode] = useState<'sign-in' | 'join'>('join');
  const split = width >= 720;
  const slide = slides[page];

  if (auth) {
    return (
      <View style={[styles.authRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }, split && styles.authSplit]}>
        <StatusBar style="dark" />
        <View style={[styles.authImageWrap, { height: split ? height : height * 0.5 }, split && styles.authImageSplit]}>
          <Image source={{ uri: slides[0].image }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['rgba(24,19,16,0.08)', 'rgba(24,19,16,0.76)']} style={StyleSheet.absoluteFill} />
          <View style={styles.authImageContent}>
            <Text style={styles.authEyebrow}>FASHION FLOOR · TANZANIA</Text>
            <Text style={styles.authImageTitle}>Your style.{'\n'}Your people.</Text>
            <Text style={styles.authImageCopy}>One considered place for the things and experiences you love.</Text>
          </View>
        </View>
        <ScrollView
          style={styles.authScroll}
          contentContainerStyle={styles.authForm}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => setAuth(false)} style={styles.back} accessibilityRole="button">
            <Text style={styles.backText}>‹  Back</Text>
          </Pressable>
          <Text style={styles.authLabel}>WELCOME IN</Text>
          <Text style={styles.authTitle}>{mode === 'join' ? 'Make it yours.' : 'Good to see you.'}</Text>
          <Text style={styles.authCopy}>Sign in or create an account to save your favorites and bookings.</Text>
          {mode === 'join' ? <TextInput placeholder="Your name" placeholderTextColor={colors.slate} style={styles.input} /> : null}
          <TextInput placeholder="Email address" placeholderTextColor={colors.slate} keyboardType="email-address" autoCapitalize="none" style={styles.input} />
          <TextInput placeholder="Password" placeholderTextColor={colors.slate} secureTextEntry style={styles.input} />
          <Pressable onPress={onEnter} style={styles.primary} accessibilityRole="button">
            <Text style={styles.primaryText}>{mode === 'join' ? 'Create account' : 'Sign in'} · preview</Text>
          </Pressable>
          <Pressable onPress={() => setMode(mode === 'join' ? 'sign-in' : 'join')} style={styles.textButton}>
            <Text style={styles.textButtonText}>{mode === 'join' ? 'Already have an account? Sign in' : 'New to Fashion Floor? Join us'}</Text>
          </Pressable>
          <Pressable onPress={onEnter} style={styles.guestButton}>
            <Text style={styles.guestText}>Continue as a guest</Text>
          </Pressable>
          <Text style={styles.disclaimer}>Frontend preview only. Account access will be connected when backend services are ready.</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />
      <Image source={{ uri: slide.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} />
      <LinearGradient colors={['rgba(24,19,16,0.08)', 'rgba(24,19,16,0.18)', 'rgba(24,19,16,0.88)']} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />
      <Animated.View key={page} entering={FadeIn.duration(450)} style={styles.topLine}>
        <Text style={styles.wordmark}>FASHION FLOOR</Text>
        <Pressable onPress={() => setAuth(true)} accessibilityRole="button">
          <Text style={styles.signIn}>Sign in</Text>
        </Pressable>
      </Animated.View>
      <Animated.View key={`copy-${page}`} entering={FadeInUp.duration(550)} style={styles.welcomeCopy}>
        <Text style={styles.eyebrow}>{slide.label}</Text>
        <Text style={styles.welcomeTitle}>{slide.title}</Text>
        <Text style={styles.welcomeBody}>{slide.copy}</Text>
      </Animated.View>
      <View style={styles.bottom}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <Pressable key={index} onPress={() => setPage(index)} accessibilityRole="button" accessibilityLabel={`Welcome page ${index + 1}`}>
              <View style={[styles.dot, page === index && styles.activeDot]} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => page < slides.length - 1 ? setPage(page + 1) : setAuth(true)} style={styles.primary} accessibilityRole="button">
          <Text style={styles.primaryText}>{page < slides.length - 1 ? 'Continue' : 'Get started'}  →</Text>
        </Pressable>
        <Pressable onPress={onEnter} style={styles.guestButton}>
          <Text style={styles.guestText}>Explore as a guest</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black, justifyContent: 'space-between', paddingHorizontal: space.xl },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space.md },
  wordmark: { color: colors.white, fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  signIn: { color: colors.white, fontSize: 13, fontWeight: '700', padding: space.sm },
  welcomeCopy: { paddingBottom: space.lg },
  eyebrow: { color: '#D8C5B2', fontSize: 10, fontWeight: '800', letterSpacing: 2.2, marginBottom: space.md },
  welcomeTitle: { color: colors.white, fontFamily: 'serif', fontSize: 52, lineHeight: 56, letterSpacing: -1.5 },
  welcomeBody: { color: '#F1E9E0', fontSize: 15, lineHeight: 22, marginTop: space.md, maxWidth: 320 },
  bottom: { paddingBottom: space.lg, gap: space.md },
  pagination: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: space.sm },
  dot: { width: 7, height: 7, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.45)' },
  activeDot: { width: 24, backgroundColor: colors.white },
  primary: { minHeight: 54, borderRadius: radius.pill, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.black, fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  guestButton: { alignItems: 'center', paddingVertical: space.sm },
  guestText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  authRoot: { flex: 1, backgroundColor: colors.white },
  authSplit: { flexDirection: 'row' },
  authImageWrap: { width: '100%', justifyContent: 'flex-end', overflow: 'hidden' },
  authImageSplit: { width: '75%', height: '100%' },
  authImageContent: { padding: space.xl, paddingBottom: space.xxl },
  authEyebrow: { color: '#D8C5B2', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  authImageTitle: { color: colors.white, fontFamily: 'serif', fontSize: 40, lineHeight: 44, marginTop: space.md },
  authImageCopy: { color: '#F1E9E0', fontSize: 13, lineHeight: 19, marginTop: space.sm, maxWidth: 300 },
  authScroll: { flex: 1, width: '100%' },
  authForm: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xl, gap: space.md },
  back: { alignSelf: 'flex-start', paddingVertical: space.xs },
  backText: { color: colors.slate, fontSize: 14, fontWeight: '700' },
  authLabel: { ...type.label, color: colors.terracotta, marginTop: space.sm },
  authTitle: { ...type.display, fontFamily: 'serif', fontSize: 32, lineHeight: 38 },
  authCopy: { ...type.body, fontSize: 13, color: colors.slate, marginBottom: space.sm },
  input: { height: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.offWhite, paddingHorizontal: space.lg, color: colors.black, fontSize: 14, backgroundColor: colors.white },
  textButton: { alignItems: 'center', padding: space.sm },
  textButtonText: { color: colors.terracotta, fontSize: 12, fontWeight: '700' },
  disclaimer: { color: colors.slate, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: space.xs },
});
