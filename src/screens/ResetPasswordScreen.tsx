import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card, Input, useTheme } from '../components/UI';
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen({ onComplete }: { onComplete: () => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (password.length < 8) return Alert.alert('Choose a stronger password', 'Your new password must contain at least 8 characters.');
    if (password !== confirmation) return Alert.alert('Passwords do not match', 'Enter the same new password in both fields.');
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Password updated', 'Your FitHub password has been changed successfully.', [
        { text: 'Continue to FitHub', onPress: onComplete },
      ]);
    } catch (error: any) {
      Alert.alert('Could not update password', error?.message ?? 'Request another reset email and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>FitHub</Text>
          <Card style={styles.card}>
            <Text style={styles.title}>Choose a new password</Text>
            <Text style={styles.copy}>Use a password you have not used for FitHub before.</Text>
            <Input secureTextEntry value={password} onChangeText={setPassword} placeholder="New password (8+ characters)" />
            <Input secureTextEntry value={confirmation} onChangeText={setConfirmation} placeholder="Confirm new password" />
            <Button title={busy ? 'Updating…' : 'Update password'} onPress={save} disabled={busy} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { color: colors.primary, fontSize: 34, fontWeight: '900', textAlign: 'center', marginBottom: 18 },
  card: { width: '100%' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 7, marginBottom: 18 },
});
