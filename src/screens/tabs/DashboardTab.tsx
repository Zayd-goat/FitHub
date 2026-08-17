import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, contrastText, useTheme } from '../../components/UI';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { estimateActivityEnergyBySession } from '../../lib/calories';
import { exerciseLibrary, figureImages } from '../../data/exerciseLibrary';
import { kgToDisplay } from '../../lib/units';

export type HomeProgressFocus = 'overview' | 'prs' | 'badges' | 'streaks';
export type DailyActivityFocus = 'volume' | 'energy';

type Props = {
  profile: Profile;
  onStartWorkout: () => void;
  onViewProgress: (focus?: HomeProgressFocus) => void;
  onViewWorkouts: (sessionId?: string) => void;
  onViewDailyActivity: (focus: DailyActivityFocus) => void;
  onOpenJourney: (period?: 'week' | 'month') => void;
};

export default function DashboardTab({ profile, onStartWorkout, onViewProgress, onViewWorkouts, onViewDailyActivity, onOpenJourney }: Props) {
  const { colors, hiddenFeatures, weightUnit } = useTheme();
  const styles = createStyles(colors);
  const [weekWorkouts, setWeekWorkouts] = useState(0);
  const [todayVolume, setTodayVolume] = useState(0);
  const [todayEnergy, setTodayEnergy] = useState(0);
  const [prCount, setPrCount] = useState(0);
  const [recent, setRecent] = useState<any[]>([]);
  const [dayKey, setDayKey] = useState(new Date().toDateString());
  const [todayPlan, setTodayPlan] = useState<string | null>(null);
  const [weekPrs, setWeekPrs] = useState(0);
  const [monthPrs, setMonthPrs] = useState(0);
  const locked = (profile.age ?? 0) < 18;

  useEffect(() => {
    const id = setInterval(() => {
      const next = new Date().toDateString();
      setDayKey((prev) => prev === next ? prev : next);
    }, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const week = new Date(now); week.setDate(now.getDate() - 6); week.setHours(0, 0, 0, 0);
      const month = new Date(now); month.setDate(now.getDate() - 29); month.setHours(0,0,0,0);
      const [sessionRes, weekSetRes, allStrengthRes, prRes, splitRes] = await Promise.all([
        supabase.from('workout_sessions').select('id,summary,started_at,ended_at').eq('user_id', profile.id).eq('completed', true).order('ended_at', { ascending: false }).limit(50),
        supabase.from('workout_sets').select('session_id,exercise_name,weight_kg,reps,distance_km,duration_min,created_at').eq('user_id', profile.id).gte('created_at', week.toISOString()).limit(3000),
        supabase.from('workout_sets').select('exercise_name,weight_kg,reps').eq('user_id', profile.id).not('weight_kg', 'is', null).gt('weight_kg', 0).limit(3000),
        supabase.from('pr_events').select('achieved_at').eq('user_id', profile.id).gte('achieved_at', month.toISOString()).limit(1000),
        supabase.from('workout_split_days').select('label').eq('user_id', profile.id).eq('day_of_week', now.getDay()).maybeSingle(),
      ]);
      const prRows = prRes.data ?? [];
      setMonthPrs(prRows.length);
      setWeekPrs(prRows.filter((x:any)=>new Date(x.achieved_at)>=week).length);
      setTodayPlan(splitRes.data?.label ?? null);

      const sessions = sessionRes.data ?? [];
      const weekSets = weekSetRes.data ?? [];
      const weekSessions = sessions.filter((s: any) => new Date(s.ended_at ?? s.started_at) >= week);
      setWeekWorkouts(weekSessions.length);

      const todaySessions = sessions.filter((s: any) => new Date(s.ended_at ?? s.started_at) >= today);
      const todaySessionIds = new Set(todaySessions.map((s: any) => s.id));
      const todaySets = weekSets.filter((x: any) => todaySessionIds.has(x.session_id));
      setTodayVolume(Math.round(todaySets.reduce((sum: number, x: any) => sum + Number(x.weight_kg ?? 0) * Number(x.reps ?? 0), 0)));
      setPrCount(new Set((allStrengthRes.data ?? []).filter((x: any) => Number(x.reps ?? 0) > 0).map((x: any) => x.exercise_name)).size);

      if (!locked && profile.weight_kg) {
        setTodayEnergy(estimateActivityEnergyBySession(todaySessions, todaySets, profile.weight_kg).total);
      } else {
        setTodayEnergy(0);
      }

      const latest = sessions[0];
      const fresh = latest && (now.getTime() - new Date(latest.ended_at ?? latest.started_at).getTime()) <= 7 * 24 * 60 * 60 * 1000;
      setRecent(fresh ? sessions.slice(0, 3) : []);
    };
    load();
  }, [profile.id, profile.tokens, profile.weight_kg, profile.age, dayKey, locked]);

  const firstName = profile.username?.split(/[_\s]/)[0]?.toUpperCase() || profile.username?.toUpperCase();
  const recentFirstExercise = recent[0]?.summary?.split(',')?.[0]?.trim();
  const recentLib = recentFirstExercise ? exerciseLibrary.find((x) => x.name === recentFirstExercise) : undefined;
  const heroImage = recentLib?.visualKey ? figureImages[recentLib.visualKey] : figureImages.chest;
  const workoutTitle = todayPlan || (recent.length ? sessionTitle(recent[0]?.summary) : 'Start Training');
  const workoutGroups = todayPlan ? 'Your planned split for today' : (recentLib ? `${recentLib.targetArea} • ${recentLib.subsection}` : 'Choose exercises that fit your session');

  return <ScrollView contentContainerStyle={styles.wrap}>
    <View style={styles.header}>
      <View><Text style={styles.greeting}>Good morning,</Text><Text style={styles.name}>{firstName}</Text></View>
      <Pressable onPress={() => onViewProgress('streaks')} style={({ pressed }) => [styles.streak, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="View streak progress">
        <Text style={styles.streakValue}>🔥 {profile.workout_streak}</Text><Text style={styles.streakLabel}>WORKOUT STREAK  ›</Text>
      </Pressable>
    </View>

    <Card style={styles.heroCard}>
      <View style={styles.heroLeft}><Text style={styles.smallLabel}>Today's Workout</Text><Text style={styles.heroTitle}>{workoutTitle}</Text><Text style={styles.heroMeta}>{workoutGroups}</Text><Pressable onPress={onStartWorkout} style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}><Text style={[styles.startText,{color:contrastText(colors.primary)}]}>START WORKOUT  ›</Text></Pressable></View>
      <Image source={heroImage} style={styles.heroFigure}/>
    </Card>

    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Your Progress</Text><Pressable onPress={() => onViewProgress('overview')}><Text style={styles.viewAll}>View all</Text></Pressable></View>
    <View style={styles.statsRow}>
      <Stat label="Workouts" value={`${weekWorkouts}`} sub="This week" accent={colors.blue} icon="◒" onPress={() => onViewWorkouts()} />
      <Stat label="Volume" value={kgToDisplay(todayVolume, weightUnit) > 999 ? `${(kgToDisplay(todayVolume, weightUnit) / 1000).toFixed(1)}k` : `${Math.round(kgToDisplay(todayVolume, weightUnit))}`} sub={`${weightUnit} today`} accent={colors.blue} icon="↗" onPress={() => onViewDailyActivity('volume')} />
      {!hiddenFeatures.includes('activity') ? <Stat label="Activity" value={locked ? '—' : `~${todayEnergy}`} sub={locked ? '18+ estimate' : 'est. kcal today'} accent={colors.primary} icon="◉" onPress={locked ? undefined : () => onViewDailyActivity('energy')} /> : null}
      <Stat label="PR lifts" value={`${prCount}`} sub="Recorded" accent={colors.gold} icon="🏆" onPress={() => onViewProgress('prs')} />
    </View>


    {!hiddenFeatures.includes('journey') ? <>
      <View style={styles.sectionRow}><Text style={styles.sectionTitle}>My Fitness Journey</Text><Pressable onPress={() => onOpenJourney('week')}><Text style={styles.viewAll}>Open</Text></Pressable></View>
      <View style={styles.reportRow}>
        <Pressable onPress={() => onOpenJourney('week')} style={({pressed})=>[styles.reportCard,pressed&&styles.pressed]}><Text style={styles.reportEyebrow}>WEEKLY REPORT</Text><Text style={styles.reportTitle}>{weekWorkouts} workouts • {weekPrs} PR{weekPrs===1?'':'s'}</Text><Text style={styles.reportSub}>See lift highlights, consistency and recommendations ›</Text></Pressable>
        <Pressable onPress={() => onOpenJourney('month')} style={({pressed})=>[styles.reportCard,pressed&&styles.pressed]}><Text style={styles.reportEyebrow}>MONTHLY REPORT</Text><Text style={styles.reportTitle}>{monthPrs} PR{monthPrs===1?'':'s'} this month</Text><Text style={styles.reportSub}>Review improvements across the last 30 days ›</Text></Pressable>
      </View>
    </> : null}

    <Pressable onPress={() => onViewWorkouts()} style={({ pressed }) => pressed ? styles.pressed : undefined}>
      <Card><View style={styles.cardTitleRow}><Text style={styles.sectionTitle}>Weekly target</Text><Text style={styles.cardArrow}>›</Text></View><Text style={styles.goalText}>{weekWorkouts} of {profile.workout_days_target} planned training days complete.</Text><View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, (weekWorkouts / Math.max(1, profile.workout_days_target)) * 100)}%` }]} /></View></Card>
    </Pressable>
  </ScrollView>;
}

function sessionTitle(summary?: string | null) {
  if (!summary) return 'Workout';
  const names = summary.split(',').map((x) => x.trim()).filter(Boolean);
  return names.length > 1 ? `${names[0]} + ${names.length - 1} more` : (names[0] || 'Workout');
}
function durationText(s: any) {
  if (!s?.started_at || !s?.ended_at) return '';
  const min = Math.max(1, Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000));
  return `${min} min`;
}
function RecentWorkout({ session, onPress }: { session: any; onPress: () => void }) {
  const { colors } = useTheme(); const styles = createStyles(colors);
  return <Pressable onPress={onPress} style={({ pressed }) => pressed ? styles.pressed : undefined}><Card style={styles.recentCard}><View style={styles.recentIcon}><Image source={require('../../../assets/nav/workout.png')} style={[styles.recentIconImage, { tintColor: colors.text }]}/></View><View style={{ flex: 1 }}><Text style={styles.recentName}>{sessionTitle(session.summary)}</Text><Text style={styles.recentMeta}>{new Date(session.ended_at ?? session.started_at).toLocaleDateString()} {durationText(session) ? `• ${durationText(session)}` : ''}</Text></View><View style={styles.done}><Text style={styles.doneText}>✓</Text></View><Text style={styles.cardArrow}>›</Text></Card></Pressable>;
}
function Stat({ label, value, sub, accent, icon, onPress }: { label: string; value: string; sub: string; accent: string; icon: string; onPress?: () => void }) {
  const { colors } = useTheme(); const styles = createStyles(colors);
  const content = <View style={styles.stat}><View style={styles.statTop}><Text style={[styles.statIcon, { color: accent }]}>{icon}</Text>{onPress ? <Text style={styles.statArrow}>›</Text> : null}</View><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text><Text style={styles.statSub}>{sub}</Text></View>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [styles.statPress, pressed && styles.pressed]}>{content}</Pressable> : <View style={styles.statPress}>{content}</View>;
}

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingTop: 10, paddingBottom: 28 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }, greeting: { color: colors.muted, fontSize: 12 }, name: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 1, letterSpacing: -0.4 }, streak: { alignItems: 'center', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2 }, streakValue: { color: colors.text, fontWeight: '900', fontSize: 22 }, streakLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', marginTop: 1 },
  heroCard: { minHeight: 190, flexDirection: 'row', overflow: 'hidden', padding: 0 }, heroLeft: { flex: 1, padding: 16, zIndex: 2 }, smallLabel: { color: colors.text, fontWeight: '700', fontSize: 13 }, heroTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 20 }, heroMeta: { color: colors.muted, fontSize: 12, marginTop: 4 }, startButton: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, marginTop: 17 }, startText: { color: '#fff', fontWeight: '900', fontSize: 12 }, heroFigure: { width: 155, height: 190, resizeMode: 'contain', alignSelf: 'flex-end', marginRight: -3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, marginBottom: 9 }, sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' }, viewAll: { color: colors.blue, fontSize: 11, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: 7, marginBottom: 16 }, statPress: { flex: 1, minWidth: 0 }, stat: { flex: 1, minWidth: 0, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10 }, statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, statArrow: { color: colors.muted, fontSize: 15, fontWeight: '800' }, statIcon: { fontSize: 15, fontWeight: '900' }, statLabel: { color: colors.muted, fontSize: 9, marginTop: 6 }, statValue: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 2 }, statSub: { color: colors.muted, fontSize: 8, marginTop: 2 },
  recentCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }, recentIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' }, recentIconImage: { width: 20, height: 20, resizeMode: 'contain' }, recentName: { color: colors.text, fontWeight: '900', fontSize: 14 }, recentMeta: { color: colors.muted, fontSize: 10, marginTop: 3, lineHeight: 14 }, done: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, doneText: { color: '#fff', fontWeight: '900' },
  reportRow: { gap: 8, marginBottom: 14 }, reportCard: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 13 }, reportEyebrow: { color: colors.primary, fontWeight: '900', fontSize: 9 }, reportTitle: { color: colors.text, fontWeight: '900', fontSize: 15, marginTop: 5 }, reportSub: { color: colors.muted, fontSize: 10, marginTop: 4, lineHeight: 14 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cardArrow: { color: colors.muted, fontSize: 24, fontWeight: '500' }, goalText: { color: colors.muted, marginTop: 4, fontSize: 12 }, track: { height: 8, borderRadius: 999, backgroundColor: colors.panel2, overflow: 'hidden', marginTop: 12 }, fill: { height: '100%', backgroundColor: colors.green }, pressed: { opacity: 0.68 },
});
