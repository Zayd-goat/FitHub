import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionTitle, colors } from '../../components/UI';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { bmi, bmiLabel } from '../../lib/health';

export default function DashboardTab({ profile }: { profile: Profile }) {
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [weekWorkouts, setWeekWorkouts] = useState(0);
  const [allTime, setAllTime] = useState({ checkins: 0, workouts: 0 });
  const [badges, setBadges] = useState<string[]>([]);
  const locked = (profile.age ?? 0) < 18;

  useEffect(() => {
    const load = async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const week = new Date(); week.setDate(week.getDate() - 6); week.setHours(0,0,0,0);
      if (!locked) {
        const { data: logs } = await supabase.from('food_logs').select('calories,protein_g,carbs_g,fat_g').eq('user_id', profile.id).gte('logged_at', today.toISOString());
        setTotals((logs ?? []).reduce((a: any, x: any) => ({ calories: a.calories + Number(x.calories), protein: a.protein + Number(x.protein_g), carbs: a.carbs + Number(x.carbs_g), fat: a.fat + Number(x.fat_g) }), { calories: 0, protein: 0, carbs: 0, fat: 0 }));
      }
      const { count } = await supabase.from('workout_sessions').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('completed', true).gte('ended_at', week.toISOString());
      setWeekWorkouts(count ?? 0);
      const [{ count: totalWorkoutCount }, { count: totalCheckinCount }] = await Promise.all([
        supabase.from('workout_sessions').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('completed', true),
        supabase.from('daily_checkins').select('*', { count: 'exact', head: true }).eq('user_id', profile.id)
      ]);
      setAllTime({ workouts: totalWorkoutCount ?? 0, checkins: totalCheckinCount ?? 0 });
      const { data: achievements } = await supabase.from('user_achievements').select('achievement_key').eq('user_id', profile.id).order('unlocked_at', { ascending: false }).limit(6);
      setBadges((achievements ?? []).map((x: any) => x.achievement_key));
    };
    load();
  }, [profile.id, profile.tokens]);

  const currentBmi = profile.weight_kg && profile.height_cm ? bmi(profile.weight_kg, profile.height_cm) : null;
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.kicker}>TODAY</Text>
      <Text style={styles.title}>Keep the streak alive.</Text>
      <Text style={styles.sub}>Your weekly target is {profile.workout_days_target} training days.</Text>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}><Text style={styles.stat}>{profile.login_streak}</Text><Text style={styles.statLabel}>login streak 🔥</Text></Card>
        <Card style={styles.statCard}><Text style={styles.stat}>{profile.workout_streak}</Text><Text style={styles.statLabel}>workout streak ⚡</Text></Card>
        <Card style={styles.statCard}><Text style={styles.stat}>{profile.tokens}</Text><Text style={styles.statLabel}>tokens ✦</Text></Card>
      </View>

      <Card>
        <SectionTitle title="All-time activity" subtitle={`${allTime.checkins} app day${allTime.checkins === 1 ? '' : 's'} logged · ${allTime.workouts} workout${allTime.workouts === 1 ? '' : 's'} completed.`} />
      </Card>

      <Card>
        <SectionTitle title="Weekly training" subtitle={`${weekWorkouts} of ${profile.workout_days_target} planned workouts logged in the last 7 days.`} />
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, (weekWorkouts / Math.max(1, profile.workout_days_target)) * 100)}%` }]} /></View>
      </Card>

      {locked ? (
        <Card>
          <SectionTitle title="Nutrition targets are locked" subtitle="FitHub's calorie and macro calculator is designed for adults 18+. Workout logging, friends, challenges, streaks and badges remain available." />
        </Card>
      ) : (
        <Card>
          <SectionTitle title="Nutrition snapshot" subtitle="Today's logged intake compared with your adult maintenance estimate." />
          <View style={styles.macroRow}>
            <Macro label="Calories" value={`${Math.round(totals.calories)}`} target={`${profile.maintenance_calories ?? '—'}`} />
            <Macro label="Protein" value={`${Math.round(totals.protein)}g`} target={`${profile.protein_target_g ?? '—'}g`} />
            <Macro label="Carbs" value={`${Math.round(totals.carbs)}g`} />
            <Macro label="Fat" value={`${Math.round(totals.fat)}g`} />
          </View>
        </Card>
      )}

      {currentBmi && (profile.age ?? 0) >= 20 ? (
        <Card>
          <SectionTitle title="BMI screening" subtitle="BMI is one screening measure and does not directly measure body fat." />
          <Text style={styles.bmi}>{currentBmi.toFixed(1)}</Text>
          <Text style={styles.sub}>{bmiLabel(currentBmi)} for adults. Consider other health factors too.</Text>
        </Card>
      ) : null}

      <Card>
        <SectionTitle title="Achievements" subtitle="Tokens and badges unlock as you stay consistent." />
        {badges.length ? <View style={styles.badgeWrap}>{badges.map(b => <View key={b} style={styles.badge}><Text style={styles.badgeText}>🏅 {b.replaceAll('_',' ')}</Text></View>)}</View> : <Text style={styles.sub}>Log your first workout to start unlocking badges.</Text>}
      </Card>
    </ScrollView>
  );
}

function Macro({ label, value, target }: { label: string; value: string; target?: string }) {
  return <View style={styles.macro}><Text style={styles.macroValue}>{value}</Text><Text style={styles.macroLabel}>{label}</Text>{target ? <Text style={styles.macroTarget}>target {target}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 30 }, kicker: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 3 }, sub: { color: colors.muted, lineHeight: 19, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 15 }, statCard: { flex: 1, padding: 12 }, stat: { color: colors.text, fontSize: 25, fontWeight: '900' }, statLabel: { color: colors.muted, fontSize: 10, marginTop: 2 },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: colors.panel2, overflow: 'hidden', marginTop: 8 }, progressFill: { height: '100%', backgroundColor: colors.green },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, macro: { width: '48%', backgroundColor: colors.panel2, borderRadius: 16, padding: 12 }, macroValue: { color: colors.text, fontSize: 22, fontWeight: '900' }, macroLabel: { color: colors.blue, fontWeight: '800' }, macroTarget: { color: colors.muted, fontSize: 11, marginTop: 3 },
  bmi: { color: colors.text, fontSize: 36, fontWeight: '900' }, badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, badge: { borderRadius: 999, backgroundColor: colors.goldSoft, paddingHorizontal: 12, paddingVertical: 8 }, badgeText: { color: colors.text, fontWeight: '800', textTransform: 'capitalize' }
});
