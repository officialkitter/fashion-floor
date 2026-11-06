import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { liveModeError } from '../lib/supabase';
import { Field } from '../shared/components/ui';
import { PrimaryButton } from '../shared/components/PrimaryButton';
import { colors, radius, space, type } from '../shared/theme/tokens';
import { useStore } from '../store/useStore';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const loading = useStore((state) => state.loading);
  const error = useStore((state) => state.error);
  const signIn = useStore((state) => state.signIn);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>FASHION FLOOR</Text>
        <Text style={styles.eyebrow}>ADMIN</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in with your Fashion Floor account.</Text>
        {liveModeError ? <Text style={styles.error} accessibilityRole="alert">{liveModeError}</Text> : null}
        {error && !liveModeError ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <View style={styles.form}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            accessibilityLabel="Email address"
            editable={!loading && !liveModeError}
          />
          <View style={styles.passwordGroup}>
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              accessibilityLabel="Password"
              editable={!loading && !liveModeError}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityState={{ selected: showPassword }}
              onPress={() => setShowPassword((visible) => !visible)}
              style={styles.passwordToggle}
              hitSlop={8}
            >
              <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.caramel} />
              <Text style={styles.passwordToggleText}>{showPassword ? 'Hide password' : 'Show password'}</Text>
            </Pressable>
          </View>
          {loading ? <ActivityIndicator color={colors.caramel} accessibilityLabel="Signing in" /> : null}
          <PrimaryButton
            label="Sign in"
            disabled={loading || !!liveModeError || !email.trim() || !password}
            onPress={() => void signIn(email, password)}
          />
        </View>
        <Text style={styles.note}>Access to records is controlled by your account role and the server.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.espresso },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.xl, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' },
  brand: { color: colors.white, fontSize: 22, fontWeight: '800', letterSpacing: 4 },
  eyebrow: { alignSelf: 'flex-start', color: colors.white, backgroundColor: colors.caramel, fontSize: 10, fontWeight: '800', letterSpacing: 2, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden', marginTop: 10 },
  title: { ...type.display, color: colors.white, marginTop: 22 },
  subtitle: { ...type.body, color: colors.cream, marginBottom: 12 },
  form: { gap: 16, marginTop: 8 },
  passwordGroup: { gap: 8 },
  passwordToggle: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  passwordToggleText: { color: colors.cream, fontSize: 12, fontWeight: '700' },
  error: { color: '#FFDAD4', backgroundColor: '#60352E', borderRadius: radius.md, padding: 14, fontSize: 14, lineHeight: 20 },
  note: { color: colors.cream, fontSize: 12, lineHeight: 18, marginTop: 12 },
});
