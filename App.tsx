import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';
import { supabase } from './src/lib/supabase';
import { Profile } from './src/lib/types';
import { recordDailyCheckIn } from './src/lib/streaks';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import MainApp from './src/screens/MainApp';
import { ThemeProvider, useTheme } from './src/components/UI';

function AppContent() {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    loading: { color: colors.text, marginTop: 12, fontSize: 16 }
  });
  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refreshProfile = async (userId?: string) => {
    const id = userId ?? sessionUserId;
    if (!id) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (!error && data) setProfile(data as Profile);
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const id = data.session?.user.id ?? null;
      setSessionUserId(id);
      if (id) { await recordDailyCheckIn(id); await refreshProfile(id); }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const id = session?.user.id ?? null;
      setSessionUserId(id);
      if (id) { await recordDailyCheckIn(id); await refreshProfile(id); }
      else setProfile(null);
      setLoading(false);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loading}>Opening FitHub…</Text></SafeAreaView>;
  if (!sessionUserId) return <AuthScreen />;
  if (!profile) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loading}>Loading your account…</Text></SafeAreaView>;
  if (!profile.onboarding_complete) return <OnboardingScreen profile={profile} onComplete={() => refreshProfile()} />;
  return <MainApp profile={profile} onProfileChanged={() => refreshProfile()} />;
}

export default function App() {
  return <ThemeProvider><AppContent /></ThemeProvider>;
}
