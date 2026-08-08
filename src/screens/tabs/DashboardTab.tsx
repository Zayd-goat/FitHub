import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, useTheme } from '../../components/UI';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { exerciseLibrary, figureImages } from '../../data/exerciseLibrary';

export default function DashboardTab({ profile, onStartWorkout }: { profile: Profile; onStartWorkout: () => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [weekWorkouts, setWeekWorkouts] = useState(0);
  const [weekVolume, setWeekVolume] = useState(0);
  const [todayCalories, setTodayCalories] = useState(0);
  const [prCount, setPrCount] = useState(0);
  const [recent, setRecent] = useState<any | null>(null);
  const [recentExercise, setRecentExercise] = useState<string | null>(null);
  const locked = (profile.age ?? 0) < 18;

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const today = new Date(); today.setHours(0,0,0,0);
      const week = new Date(); week.setDate(now.getDate() - 6); week.setHours(0,0,0,0);
      const [sessions, sets, achievements] = await Promise.all([
        supabase.from('workout_sessions').select('id,summary,started_at,ended_at').eq('user_id', profile.id).eq('completed', true).order('ended_at', { ascending: false }).limit(20),
        supabase.from('workout_sets').select('weight_kg,reps,created_at').eq('user_id', profile.id).gte('created_at', week.toISOString()),
        supabase.from('user_achievements').select('achievement_key').eq('user_id', profile.id)
      ]);
      const weekSessions = (sessions.data ?? []).filter((s: any) => new Date(s.ended_at ?? s.started_at) >= week);
      setWeekWorkouts(weekSessions.length);
      setWeekVolume(Math.round((sets.data ?? []).reduce((sum: number, x: any) => sum + (Number(x.weight_kg ?? 0) * Number(x.reps ?? 0)), 0)));
      setPrCount((achievements.data ?? []).filter((x: any) => String(x.achievement_key).toLowerCase().includes('pr')).length);
      const r = sessions.data?.[0] ?? null;
      setRecent(r);
      if (r?.id) {
        const { data } = await supabase.from('workout_sets').select('exercise_name').eq('session_id', r.id).order('set_number', { ascending: true }).limit(1);
        setRecentExercise(data?.[0]?.exercise_name ?? null);
      }
      if (!locked) {
        const { data: food } = await supabase.from('food_logs').select('calories').eq('user_id', profile.id).gte('logged_at', today.toISOString());
        setTodayCalories(Math.round((food ?? []).reduce((s: number, x: any) => s + Number(x.calories ?? 0), 0)));
      }
    };
    load();
  }, [profile.id, profile.tokens]);

  const firstName = profile.username?.split(/[_\s]/)[0]?.toUpperCase() || profile.username?.toUpperCase();
  const recentLib = recentExercise ? exerciseLibrary.find((x) => x.name === recentExercise) : undefined;
  const heroImage = recentLib?.visualKey ? figureImages[recentLib.visualKey] : figureImages.chest;
  const workoutTitle = recent?.summary ? (recent.summary.split(',')[0] || 'Your Workout') : 'Start Training';
  const workoutGroups = recentLib ? `${recentLib.targetArea} • ${recentLib.subsection}` : 'Choose exercises that fit your session';
  const duration = useMemo(() => {
    if (!recent?.started_at || !recent?.ended_at) return '';
    const min = Math.max(1, Math.round((new Date(recent.ended_at).getTime() - new Date(recent.started_at).getTime()) / 60000));
    return `${min} min`;
  }, [recent]);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.header}>
        <View><Text style={styles.greeting}>Good morning,</Text><Text style={styles.name}>{firstName}</Text></View>
        <View style={styles.streak}><Text style={styles.streakValue}>🔥 {profile.login_streak}</Text><Text style={styles.streakLabel}>DAY STREAK</Text></View>
      </View>

      <Card style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.smallLabel}>Today's Workout</Text>
          <Text style={styles.heroTitle}>{workoutTitle}</Text>
          <Text style={styles.heroMeta}>{workoutGroups}</Text>
          <Pressable onPress={onStartWorkout} style={styles.startButton}><Text style={styles.startText}>START WORKOUT  ›</Text></Pressable>
        </View>
        <Image source={heroImage} style={styles.heroFigure} />
      </Card>

      <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Your Progress</Text><Text style={styles.viewAll}>View all</Text></View>
      <View style={styles.statsRow}>
        <Stat label="Workouts" value={`${weekWorkouts}`} sub="This week" accent={colors.blue} icon="◒" />
        <Stat label="Volume" value={weekVolume > 999 ? `${(weekVolume/1000).toFixed(1)}k` : `${weekVolume}`} sub="kg" accent={colors.blue} icon="↗" />
        <Stat label="Calories" value={locked ? '—' : `${todayCalories}`} sub={locked ? '18+ only' : 'kcal'} accent={colors.primary} icon="🔥" />
        <Stat label="PRs" value={`${prCount}`} sub="Unlocked" accent={colors.gold} icon="🏆" />
      </View>

      <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Recent Workout</Text><Text style={styles.viewAll}>View all</Text></View>
      <Card style={styles.recentCard}>
        <View style={styles.recentIcon}><Image source={require('../../../assets/nav/workout.png')} style={[styles.recentIconImage,{ tintColor: colors.text }]} /></View>
        <View style={{ flex: 1 }}><Text style={styles.recentName}>{recent ? workoutTitle : 'No workout yet'}</Text><Text style={styles.recentMeta}>{recent ? `Most recent${duration ? ` • ${duration}` : ''}` : 'Start your first session from Train.'}</Text></View>
        <View style={styles.done}><Text style={styles.doneText}>✓</Text></View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Weekly target</Text>
        <Text style={styles.goalText}>{weekWorkouts} of {profile.workout_days_target} planned training days complete.</Text>
        <View style={styles.track}><View style={[styles.fill,{ width: `${Math.min(100,(weekWorkouts/Math.max(1,profile.workout_days_target))*100)}%` }]} /></View>
      </Card>
    </ScrollView>
  );
}

function Stat({ label, value, sub, accent, icon }: { label: string; value: string; sub: string; accent: string; icon: string }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <View style={styles.stat}><Text style={[styles.statIcon,{ color: accent }]}>{icon}</Text><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text><Text style={styles.statSub}>{sub}</Text></View>;
}

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 28 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { color: colors.muted, fontSize: 12 }, name: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 1, letterSpacing: -.4 },
  streak: { alignItems: 'center' }, streakValue: { color: colors.text, fontWeight: '900', fontSize: 22 }, streakLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', marginTop: 1 },
  heroCard: { minHeight: 190, flexDirection: 'row', overflow: 'hidden', padding: 0 }, heroLeft: { flex: 1, padding: 16, zIndex: 2 }, smallLabel: { color: colors.text, fontWeight: '700', fontSize: 13 }, heroTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 20 }, heroMeta: { color: colors.muted, fontSize: 12, marginTop: 4 }, startButton: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, marginTop: 17 }, startText: { color: '#fff', fontWeight: '900', fontSize: 12 }, heroFigure: { width: 155, height: 190, resizeMode: 'contain', alignSelf: 'flex-end', marginRight: -3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, marginBottom: 9 }, sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' }, viewAll: { color: colors.blue, fontSize: 11, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 7, marginBottom: 16 }, stat: { flex: 1, minWidth: 0, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10 }, statIcon: { fontSize: 15, fontWeight: '900' }, statLabel: { color: colors.muted, fontSize: 9, marginTop: 6 }, statValue: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 2 }, statSub: { color: colors.muted, fontSize: 9, marginTop: 2 },
  recentCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }, recentIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' }, recentIconImage: { width: 20, height: 20, resizeMode: 'contain' }, recentName: { color: colors.text, fontWeight: '900', fontSize: 14 }, recentMeta: { color: colors.muted, fontSize: 10, marginTop: 3 }, done: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, doneText: { color: '#fff', fontWeight: '900' },
  goalText: { color: colors.muted, marginTop: 4, fontSize: 12 }, track: { height: 8, borderRadius: 999, backgroundColor: colors.panel2, overflow: 'hidden', marginTop: 12 }, fill: { height: '100%', backgroundColor: colors.green }
});
