import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Button, Card, Input, useTheme } from '../components/UI';

export default function AuthScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password || (mode === 'signup' && !username.trim())) {
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
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const cleanUsername = username.trim().replace(/\s+/g, '_');
        const { data: existing } = await supabase.rpc('find_profile', { search_text: cleanUsername });
        if ((existing ?? []).some((x: any) => String(x.username).toLowerCase() === cleanUsername.toLowerCase())) {
          Alert.alert('Username taken', 'Choose a different username.');
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: cleanUsername } }
        });
        if (error) throw error;
        if (!data.session) {
          Alert.alert('Check your email', 'Your FitHub account was created. Open the confirmation email to verify your address, then sign in.');
          setMode('signin');
        }
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
            <Text style={styles.heading}>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</Text>
            <Text style={styles.muted}>{mode === 'signin' ? 'Sign in to continue your streak.' : 'Your account syncs across devices.'}</Text>
            {mode === 'signup' && <Input autoCapitalize="none" value={username} onChangeText={setUsername} placeholder="Username" />}
            <Input autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Email" />
            <Input secureTextEntry value={password} onChangeText={setPassword} placeholder="Password (8+ characters)" />
            <Button title={busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submit} disabled={busy} />
            <Button title={mode === 'signin' ? 'Create an account' : 'I already have an account'} onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} secondary />
          </Card>
          <Text style={styles.foot}>FitHub fitness estimates are informational and are not medical advice.</Text>
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
  foot: { color: colors.muted, fontSize: 12, textAlign: 'center', maxWidth: 340, lineHeight: 17 }
});
