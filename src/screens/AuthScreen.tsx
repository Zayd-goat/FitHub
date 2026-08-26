import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Button, Card, Input, useTheme } from '../components/UI';
import { AUTH_CONFIRM_REDIRECT, PASSWORD_RESET_REDIRECT } from '../lib/authLinks';

export default function AuthScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'confirmation'>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const cleanEmail = email.trim().toLowerCase();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  const emailFailureMessage = (error: any) => {
    const message = String(error?.message ?? '');
    if (/rate limit/i.test(message)) return 'Too many email requests were made. Wait a few minutes, then try again.';
    if (/sending|smtp|email/i.test(message)) return 'FitHub’s email service could not send this message. The app owner must finish the Supabase Custom SMTP setup, then you can try again.';
    return message || 'Please check your connection and try again.';
  };

  const requestPasswordReset = async () => {
    if (!validEmail) return Alert.alert('Enter your email', 'Enter a complete email address, such as name@example.com.');
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: PASSWORD_RESET_REDIRECT });
      if (error) throw error;
      Alert.alert('Check your email', 'If a FitHub account uses that email address, password-reset instructions have been sent. Open the link on this phone.', [
        { text: 'Back to sign in', onPress: () => setMode('signin') },
      ]);
    } catch (error: any) {
      Alert.alert('Could not send reset email', emailFailureMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmation = async () => {
    if (!validEmail) return Alert.alert('Enter your email', 'Enter the complete email address used for FitHub.');
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: { emailRedirectTo: AUTH_CONFIRM_REDIRECT },
      });
      if (error) throw error;
      Alert.alert('Confirmation email sent', 'Open the newest FitHub confirmation email and tap the confirmation button.');
    } catch (error: any) {
      Alert.alert('Could not resend email', emailFailureMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!validEmail || !password || (mode === 'signup' && !username.trim())) {
      Alert.alert('Missing details', 'Please complete all required fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password', 'Use at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) {
          if (/confirm/i.test(error.message)) {
            setMode('confirmation');
            return;
          }
          throw error;
        }
      } else {
        const cleanUsername = username.trim().replace(/\s+/g, '_');
        if (!/^[A-Za-z0-9_]{3,24}$/.test(cleanUsername)) {
          Alert.alert('Choose a username', 'Use 3–24 letters, numbers or underscores.');
          return;
        }
        const { data: existing } = await supabase.rpc('find_profile', { search_text: cleanUsername });
        if ((existing ?? []).some((x: any) => String(x.username).toLowerCase() === cleanUsername.toLowerCase())) {
          Alert.alert('Username taken', 'Choose a different username.');
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { username: cleanUsername },
            emailRedirectTo: AUTH_CONFIRM_REDIRECT,
          }
        });
        if (error) throw error;
        if (data.session) await supabase.auth.signOut();
        setMode('confirmation');
      }
    } catch (e: any) {
      Alert.alert('FitHub', e?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>FitHub</Text>
          <Text style={styles.tag}>Train. Track. Connect.</Text>
          <Card style={{ width: '100%' }}>
            <Text style={styles.heading}>{mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Confirm your account'}</Text>
            <Text style={styles.muted}>{mode === 'signin' ? 'Sign in to continue your training.' : mode === 'signup' ? 'Your profile will sync securely across devices.' : mode === 'forgot' ? 'We will email you a secure link to choose a new password.' : `Check ${cleanEmail || 'your email address'} for the next step.`}</Text>

            {mode === 'confirmation' ? <>
              <Text style={styles.confirmationCopy}>If this is a new email address, open the newest FitHub message on this phone and tap “Confirm my FitHub account.” If the address already has an account, sign in or use Forgot password instead. FitHub never creates a second login for the same email.</Text>
              <Button title={busy ? 'Sending…' : 'Resend confirmation email'} onPress={resendConfirmation} disabled={busy} />
              <Button title="Reset password instead" onPress={() => setMode('forgot')} secondary />
              <Button title="Back to sign in" onPress={() => setMode('signin')} secondary />
            </> : <>
              {mode === 'signup' && <Input autoCapitalize="none" value={username} onChangeText={setUsername} placeholder="Username" />}
              <Input autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Email" />
              {mode !== 'forgot' && <Input secureTextEntry value={password} onChangeText={setPassword} placeholder="Password (8+ characters)" />}
              {mode === 'forgot'
                ? <Button title={busy ? 'Sending…' : 'Email reset instructions'} onPress={requestPasswordReset} disabled={busy} />
                : <Button title={busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submit} disabled={busy} />}
              {mode === 'signin' ? <Pressable onPress={() => setMode('forgot')} accessibilityRole="button"><Text style={styles.forgot}>Forgot password?</Text></Pressable> : null}
              <Button title={mode === 'signin' ? 'Create an account' : mode === 'signup' ? 'I already have an account' : 'Back to sign in'} onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} secondary />
            </>}
          </Card>
          <Text style={styles.foot}>FitHub fitness estimates are informational and are not medical advice.</Text>
          <Pressable onPress={() => Linking.openURL('https://platform.fatsecret.com')}>
            <Text style={styles.attribution}>Nutrition information powered by fatsecret Platform API</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { width: 130, height: 130, borderRadius: 30, marginBottom: 12 },
  title: { color: colors.text, fontSize: 38, fontWeight: '900', letterSpacing: -.8 },
  tag: { color: colors.cyan, fontWeight: '800', marginBottom: 24 },
  heading: { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  muted: { color: colors.muted, marginBottom: 16 },
  confirmationCopy: { color: colors.text, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  forgot: { color: colors.primary, fontSize: 13, fontWeight: '900', textAlign: 'center', paddingVertical: 12, textDecorationLine: 'underline' },
  foot: { color: colors.muted, fontSize: 12, textAlign: 'center', maxWidth: 340, lineHeight: 17 },
  attribution: { color: colors.blue, fontSize: 11, textAlign: 'center', marginTop: 10, textDecorationLine: 'underline' }
});
