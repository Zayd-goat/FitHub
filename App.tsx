import './src/lib/notifications';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, SafeAreaView, StyleSheet, Text } from 'react-native';
import { supabase } from './src/lib/supabase';
import { Profile } from './src/lib/types';
import { recordDailyCheckIn } from './src/lib/streaks';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import MainApp from './src/screens/MainApp';
import { ThemeProvider, useTheme } from './src/components/UI';
import { registerFriendPushToken } from './src/lib/notifications';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import { establishAuthSessionFromUrl, isPasswordRecoveryUrl } from './src/lib/authLinks';
import { profileAge } from './src/lib/profileAge';
import FitHubAlertProvider from './src/components/FitHubAlertProvider';

function AppContent() {
  const { colors, syncUserPreferences } = useTheme();
  const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    loading: { color: colors.text, marginTop: 12, fontSize: 16 }
  });
  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const refreshProfile = async (userId?: string) => {
    const id = userId ?? sessionUserId;
    if (!id) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (!error && data) {
      const calculatedAge = profileAge(data);
      const next = { ...data, age: calculatedAge ?? data.age } as Profile;
      setProfile(next);
      if (data.date_of_birth && calculatedAge != null && calculatedAge !== data.age) {
        try { await supabase.from('profiles').update({ age: calculatedAge }).eq('id', id); } catch {}
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    const applySession = async (id: string | null) => {
      if (!mounted) return;
      setSessionUserId(id);
      if (id) { await recordDailyCheckIn(id); await refreshProfile(id); }
      else setProfile(null);
    };

    const handleAuthUrl = async (url?: string | null) => {
      if (!url || (!url.startsWith('fithub://auth-confirmed') && !url.startsWith('fithub://reset-password'))) return;
      const recovery = isPasswordRecoveryUrl(url);
      if (recovery && mounted) setPasswordRecovery(true);
      try {
        const session = await establishAuthSessionFromUrl(url);
        if (session) await applySession(session.user.id);
        if (!recovery && session) Alert.alert('Email confirmed', 'Your FitHub profile is ready.');
      } catch (error: any) {
        if (mounted) setPasswordRecovery(false);
        Alert.alert('Email link problem', error?.message ?? 'Request a new email and try again.');
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' && mounted) setPasswordRecovery(true);
      const id = session?.user.id ?? null;
      await applySession(id);
      setLoading(false);
    });

    const linkSubscription = Linking.addEventListener('url', ({ url }) => { handleAuthUrl(url).catch(() => {}); });
    const initialize = async () => {
      const initialUrl = await Linking.getInitialURL().catch(() => null);
      await handleAuthUrl(initialUrl);
      const { data } = await supabase.auth.getSession();
      await applySession(data.session?.user.id ?? null);
      if (mounted) setLoading(false);
    };
    initialize().catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; listener.subscription.unsubscribe(); linkSubscription.remove(); };
  }, []);


  useEffect(() => {
    if (sessionUserId) { syncUserPreferences(sessionUserId).catch(() => {}); registerFriendPushToken(sessionUserId).catch(()=>{}); }
  }, [sessionUserId]);

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loading}>Opening FitHub…</Text></SafeAreaView>;
  if (passwordRecovery && sessionUserId) return <ResetPasswordScreen onComplete={() => setPasswordRecovery(false)} />;
  if (!sessionUserId) return <AuthScreen />;
  if (!profile) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loading}>Loading your account…</Text></SafeAreaView>;
  if (!profile.onboarding_complete) return <OnboardingScreen profile={profile} onComplete={() => refreshProfile()} />;
  return <MainApp profile={profile} onProfileChanged={() => refreshProfile()} />;
}

export default function App() {
  return <ThemeProvider><FitHubAlertProvider><AppContent /></FitHubAlertProvider></ThemeProvider>;
}
