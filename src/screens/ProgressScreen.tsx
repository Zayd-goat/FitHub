import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Card, Input, SectionTitle, useTheme } from '../components/UI';
import { exerciseLibrary } from '../data/exerciseLibrary';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';
import { formatDistance, formatWeight, kgToDisplay, kmToDisplay } from '../lib/units';

type PrEvent = { exercise: string; weight: number; reps: number; score: number; date: string };
type Badge = { key: string; icon: string; title: string; detail: string; unlocked: boolean };
type GraphPoint = { x: number; y: number; date: string; label: string };
export type ProgressFocus = 'overview' | 'prs' | 'badges' | 'streaks';

const dateKey = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function ProgressScreen({ profile, focus = 'overview', onBack }: { profile: Profile; focus?: ProgressFocus; onBack: () => void }) {
  const { colors, weightUnit, distanceUnit } = useTheme();
  const styles = createStyles(colors);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [foods, setFoods] = useState<any[]>([]);
  const [tracked, setTracked] = useState<string[]>([]);
  const [manage, setManage] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [mode, setMode] = useState<ProgressFocus>(focus);
  useEffect(() => { setMode(focus); }, [focus]);

  const load = async () => {
    const [s, w, f, t] = await Promise.all([
      supabase.from('workout_sessions').select('id,summary,started_at,ended_at').eq('user_id', profile.id).eq('completed', true).order('ended_at', { ascending: false }).limit(500),
      supabase.from('workout_sets').select('exercise_name,weight_kg,reps,distance_km,duration_min,created_at,session_id,set_number').eq('user_id', profile.id).order('created_at', { ascending: true }).limit(5000),
      supabase.from('food_logs').select('logged_at,calories,protein_g').eq('user_id', profile.id).order('logged_at', { ascending: false }).limit(2500),
      supabase.from('tracked_pr_exercises').select('exercise_name').eq('user_id', profile.id).order('created_at', { ascending: true }),
    ]);
    setSessions(s.data ?? []);
    setSets(w.data ?? []);
    setFoods(f.data ?? []);
    if (!t.error) {
      const names = (t.data ?? []).map((x: any) => x.exercise_name);
      setTracked(names);
      Storage.setItem(`fithub_pr_lifts_${profile.id}`, JSON.stringify(names)).catch(() => {});
    } else {
      Storage.getItem(`fithub_pr_lifts_${profile.id}`).then((v) => { if (v) setTracked(JSON.parse(v)); }).catch(() => {});
    }
  };
  useEffect(() => { load(); }, [profile.id]);

  const prEvents = useMemo(() => {
    const byExercise = new Map<string, any[]>();
    for (const row of sets) {
      const weight = Number(row.weight_kg ?? 0), reps = Number(row.reps ?? 0);
      if (weight <= 0 || reps <= 0) continue;
      const arr = byExercise.get(row.exercise_name) ?? [];
      arr.push(row);
      byExercise.set(row.exercise_name, arr);
    }
    const out: Record<string, PrEvent[]> = {};
    byExercise.forEach((rows, name) => {
      let best = -Infinity;
      const events: PrEvent[] = [];
      rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).forEach((r) => {
        const weight = Number(r.weight_kg), reps = Number(r.reps), score = weight * (1 + reps / 30);
        if (score > best + 0.01) {
          best = score;
          events.push({ exercise: name, weight, reps, score, date: r.created_at });
        }
      });
      out[name] = events.reverse();
    });
    return out;
  }, [sets]);

  const allPrCount = (Object.values(prEvents) as PrEvent[][]).reduce((n, x) => n + x.length, 0);

  const nutritionDays = useMemo(() => {
    if ((profile.age ?? 0) < 18 || !profile.maintenance_calories || !profile.protein_target_g) return { calorie: 0, protein: 0, both: 0 };
    const days: Record<string, { calories: number; protein: number }> = {};
    for (const row of foods) {
      const k = dateKey(row.logged_at);
      days[k] ??= { calories: 0, protein: 0 };
      days[k].calories += Number(row.calories ?? 0);
      days[k].protein += Number(row.protein_g ?? 0);
    }
    let calorie = 0, protein = 0, both = 0;
    Object.values(days).forEach((d) => {
      const c = d.calories >= profile.maintenance_calories! * 0.9 && d.calories <= profile.maintenance_calories! * 1.1;
      const p = d.protein >= profile.protein_target_g!;
      if (c) calorie++;
      if (p) protein++;
      if (c && p) both++;
    });
    return { calorie, protein, both };
  }, [foods, profile.age, profile.maintenance_calories, profile.protein_target_g]);

  const badges: Badge[] = useMemo(() => {
    const adult = (profile.age ?? 0) >= 18;
    const workoutCount = sessions.length;
    const mealCount = foods.length;
    return [
      { key: 'login3', icon: '🔥', title: '3-day login streak', detail: 'Open FitHub 3 days in a row', unlocked: profile.login_streak >= 3 },
      { key: 'login7', icon: '🔥', title: '7-day login streak', detail: 'Open FitHub 7 days in a row', unlocked: profile.login_streak >= 7 },
      { key: 'login30', icon: '⚡', title: '30-day login streak', detail: 'A full month of check-ins', unlocked: profile.login_streak >= 30 },
      { key: 'workout1', icon: '✓', title: 'First workout', detail: 'Complete your first workout', unlocked: workoutCount >= 1 },
      { key: 'workout10', icon: '🏋', title: '10 workouts', detail: 'Complete 10 workouts', unlocked: workoutCount >= 10 },
      { key: 'workout50', icon: '🏆', title: '50 workouts', detail: 'Complete 50 workouts', unlocked: workoutCount >= 50 },
      { key: 'streak3', icon: '⚡', title: '3-workout streak', detail: 'Build a 3-day workout streak', unlocked: profile.workout_streak >= 3 },
      { key: 'streak7', icon: '💪', title: '7-workout streak', detail: 'Build a 7-day workout streak', unlocked: profile.workout_streak >= 7 },
      { key: 'meals5', icon: '🍽', title: 'Meal logger', detail: 'Log 5 meals', unlocked: mealCount >= 5 },
      { key: 'meals25', icon: '🍽', title: 'Meal journal', detail: 'Log 25 meals', unlocked: mealCount >= 25 },
      { key: 'calories', icon: '◎', title: 'Daily energy target', detail: adult ? 'Reach your adult energy target for a day' : 'Adult nutrition targets only', unlocked: adult && nutritionDays.calorie >= 1 },
      { key: 'protein', icon: 'P', title: 'Protein target', detail: adult ? 'Reach your adult protein target for a day' : 'Adult nutrition targets only', unlocked: adult && nutritionDays.protein >= 1 },
      { key: 'pr1', icon: '★', title: 'First PR', detail: 'Set your first strength personal record', unlocked: allPrCount >= 1 },
      { key: 'pr10', icon: '★', title: '10 PRs', detail: 'Record 10 strength personal records', unlocked: allPrCount >= 10 },
    ];
  }, [profile.login_streak, profile.workout_streak, profile.age, sessions.length, foods.length, nutritionDays, allPrCount]);

  const recordedExerciseNames = useMemo(() => {
    const names = new Set<string>();
    sets.forEach((row) => {
      if (row.exercise_name && (Number(row.weight_kg ?? 0) > 0 || Number(row.reps ?? 0) > 0 || Number(row.distance_km ?? 0) > 0 || Number(row.duration_min ?? 0) > 0)) names.add(row.exercise_name);
    });
    return Array.from(names).sort();
  }, [sets]);

  const availableNames = useMemo(() => recordedExerciseNames.filter((n) => n.toLowerCase().includes(search.toLowerCase())), [recordedExerciseNames, search]);
  const earned = badges.filter((b) => b.unlocked).length;

  const toggleTracked = async (name: string) => {
    const next = tracked.includes(name) ? tracked.filter((x) => x !== name) : [...tracked, name];
    setTracked(next);
    Storage.setItem(`fithub_pr_lifts_${profile.id}`, JSON.stringify(next)).catch(() => {});
    if (tracked.includes(name)) await supabase.from('tracked_pr_exercises').delete().eq('user_id', profile.id).eq('exercise_name', name);
    else await supabase.from('tracked_pr_exercises').upsert({ user_id: profile.id, exercise_name: name }, { onConflict: 'user_id,exercise_name' });
  };

  if (selectedExercise) {
    const ex = exerciseLibrary.find((item) => item.name === selectedExercise);
    const rows = sets.filter((row) => row.exercise_name === selectedExercise);
    const metricType = ex?.metric_type ?? (rows.some((r) => Number(r.distance_km ?? 0) > 0 || Number(r.duration_min ?? 0) > 0) ? 'distance' : 'strength');
    const points = graphPoints(rows, metricType, weightUnit, distanceUnit);
    const strength = metricType === 'strength';
    const timeOnly = metricType === 'time';
    const graphTitle = strength ? 'Weight vs reps' : timeOnly ? 'Duration by session' : 'Time vs distance';
    const xLabel = strength ? `Weight (${weightUnit})` : timeOnly ? 'Session' : 'Time (min)';
    const yLabel = strength ? 'Reps' : timeOnly ? 'Duration (min)' : `Distance (${distanceUnit})`;
    return <ScrollView contentContainerStyle={styles.wrap}>
      <Header title="PR Progress" subtitle="Switch exercises to compare your recorded performances" onBack={() => { setSelectedExercise(null); setSelectedPoint(null); }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exerciseTabs}>
        {(tracked.length ? tracked : recordedExerciseNames).map((name) => <Pressable key={name} onPress={() => { setSelectedExercise(name); setSelectedPoint(null); }} style={[styles.exerciseTab, selectedExercise === name && styles.exerciseTabActive]}><Text style={[styles.exerciseTabText, selectedExercise === name && styles.exerciseTabTextActive]}>{name}</Text></Pressable>)}
      </ScrollView>
      <Card>
        <Text style={styles.chartTitle}>{selectedExercise}</Text>
        <Text style={styles.chartSub}>{graphTitle}</Text>
        {points.length ? <ProgressGraph points={points} xLabel={xLabel} yLabel={yLabel} selected={selectedPoint} onSelect={setSelectedPoint} /> : <Text style={styles.emptyGraph}>Not enough recorded data for this graph yet.</Text>}
        {selectedPoint != null && points[selectedPoint] ? <View style={styles.pointDetail}><Text style={styles.pointValue}>{points[selectedPoint].label}</Text><Text style={styles.meta}>{new Date(points[selectedPoint].date).toLocaleDateString()}</Text></View> : points.length ? <Text style={styles.tapHint}>Tap a point to see the exact result and date.</Text> : null}
      </Card>
      {strength ? <Card><SectionTitle title="PR improvements" subtitle="Best strength performances recorded over time." />{(prEvents[selectedExercise] ?? []).map((x, i) => <View key={`${x.date}-${i}`} style={styles.prHistoryRow}><View style={styles.prNumber}><Text style={styles.prNumberText}>{(prEvents[selectedExercise] ?? []).length - i}</Text></View><View style={{ flex: 1 }}><Text style={styles.prWeight}>{formatWeight(x.weight, weightUnit)} × {x.reps} reps</Text><Text style={styles.meta}>{new Date(x.date).toLocaleDateString()}</Text></View>{i === 0 ? <Text style={styles.currentTag}>CURRENT</Text> : null}</View>)}</Card> : null}
    </ScrollView>;
  }

  const prSection = <>
    <SectionTitle title="My PR exercises" subtitle="Pin strength or cardio exercises. Tap one to open its progress graph." />
    {tracked.length ? tracked.map((name) => {
      const ex = exerciseLibrary.find((item) => item.name === name);
      const history = sets.filter((row) => row.exercise_name === name);
      const last = history.at(-1);
      const summary = ex?.metric_type === 'strength' ? (last ? `${formatWeight(Number(last.weight_kg ?? 0), weightUnit)} × ${Number(last.reps ?? 0)} reps` : 'No sets yet') : ex?.metric_type === 'time' ? (last ? `${Number(last.duration_min ?? 0)} min` : 'No cardio yet') : last ? `${formatDistance(Number(last.distance_km ?? 0), distanceUnit)} • ${Number(last.duration_min ?? 0)} min` : 'No cardio yet';
      return <Pressable key={name} onPress={() => setSelectedExercise(name)}><Card style={styles.prCard}><View style={{ flex: 1 }}><Text style={styles.prName}>{name}</Text><Text style={styles.meta}>{summary}</Text></View><Text style={styles.chevron}>›</Text></Card></Pressable>;
    }) : <Card><Text style={styles.meta}>No PR exercises pinned yet. Choose from exercises you have already logged.</Text></Card>}
    <Pressable onPress={() => setManage(!manage)} style={styles.manageButton}><Text style={styles.manageText}>{manage ? 'Done choosing exercises' : '+ Choose PR exercises'}</Text></Pressable>
    {manage ? <Card><Input value={search} onChangeText={setSearch} placeholder="Search your recorded exercises…" />{availableNames.length ? availableNames.slice(0, 80).map((name) => <Pressable key={name} onPress={() => toggleTracked(name)} style={styles.pickRow}><Text style={styles.pickName}>{name}</Text><Text style={[styles.pickState, tracked.includes(name) && { color: colors.green }]}>{tracked.includes(name) ? '✓ Pinned' : '＋ Add'}</Text></Pressable>) : <Text style={styles.meta}>Complete an exercise first and it will appear here.</Text>}</Card> : null}
  </>;

  const badgeSection = <>
    <SectionTitle title="Badges & achievements" subtitle="Unlocked badges stay visible here as your history grows." />
    <View style={styles.badgeGrid}>{badges.map((b) => <View key={b.key} style={[styles.badge, b.unlocked ? styles.badgeUnlocked : styles.badgeLocked]}><Text style={[styles.badgeIcon, !b.unlocked && { opacity: 0.35 }]}>{b.icon}</Text><Text style={styles.badgeTitle}>{b.title}</Text><Text style={styles.badgeDetail}>{b.unlocked ? 'ACHIEVED' : b.detail}</Text></View>)}</View>
    {(profile.age ?? 0) >= 18 ? <Card><SectionTitle title="Nutrition achievements" subtitle="Based on your current adult targets." /><Info label="Energy-target days" value={`${nutritionDays.calorie}`} /><Info label="Protein-target days" value={`${nutritionDays.protein}`} /><Info label="Both targets in one day" value={`${nutritionDays.both}`} /></Card> : null}
  </>;

  const streakSection = <>
    <SectionTitle title="Streaks" subtitle="Your current consistency across FitHub and completed training days." />
    <View style={styles.stats}>
      <Summary label="Login streak" value={`${profile.login_streak}`} sub="days in a row" />
      <Summary label="Workout streak" value={`${profile.workout_streak}`} sub="training days" />
    </View>
    <Card><SectionTitle title="Streak milestones" subtitle="Streak-related achievements from your badge history." />{badges.filter((b) => b.key.startsWith('login') || b.key.startsWith('streak')).map((b) => <View key={b.key} style={styles.streakRow}><Text style={styles.streakRowIcon}>{b.icon}</Text><View style={{ flex: 1 }}><Text style={styles.prName}>{b.title}</Text><Text style={styles.meta}>{b.unlocked ? 'Achieved' : b.detail}</Text></View><Text style={[styles.pickState, { color: b.unlocked ? colors.green : colors.muted }]}>{b.unlocked ? '✓' : '○'}</Text></View>)}</Card>
  </>;

  return <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
    <Header title={mode === 'prs' ? 'Personal Records' : mode === 'badges' ? 'Achievements' : mode === 'streaks' ? 'Streaks' : 'Progress'} subtitle={mode === 'overview' ? 'Badges, streaks and personal-record analytics' : mode === 'prs' ? 'Choose an exercise to open its performance graph' : mode === 'badges' ? 'Your earned and upcoming FitHub milestones' : 'Your login and workout consistency'} onBack={onBack} />
    <View style={styles.modeTabs}>
      {([['overview','Overview'],['prs','PRs'],['badges','Badges'],['streaks','Streaks']] as [ProgressFocus,string][]).map(([key,label]) => <Pressable key={key} onPress={() => setMode(key)} style={[styles.modeTab, mode === key && styles.modeTabActive]}><Text style={[styles.modeTabText, mode === key && styles.modeTabTextActive]}>{label}</Text></Pressable>)}
    </View>

    {mode === 'overview' ? <>
      <View style={styles.stats}>
        <Pressable style={styles.summaryPress} onPress={() => setMode('badges')}><Summary label="Badges" value={`${earned}`} sub="earned" /></Pressable>
        <Pressable style={styles.summaryPress} onPress={() => setMode('streaks')}><Summary label="Login streak" value={`${profile.login_streak}`} sub="days" /></Pressable>
        <View style={styles.summaryPress}><Summary label="Workouts" value={`${sessions.length}`} sub="completed" /></View>
        <Pressable style={styles.summaryPress} onPress={() => setMode('prs')}><Summary label="PRs" value={`${allPrCount}`} sub="recorded" /></Pressable>
      </View>
      {prSection}
      {badgeSection}
    </> : mode === 'prs' ? prSection : mode === 'badges' ? badgeSection : streakSection}
  </ScrollView>;
}

function graphPoints(rows: any[], metricType: string, weightUnit: 'kg'|'lb', distanceUnit: 'km'|'mi'): GraphPoint[] {
  const bySession = new Map<string, any[]>();
  rows.forEach((row) => { const key = row.session_id ?? row.created_at; const arr = bySession.get(key) ?? []; arr.push(row); bySession.set(key, arr); });
  const sessions = Array.from(bySession.values()).sort((a, b) => new Date(a[0].created_at).getTime() - new Date(b[0].created_at).getTime());
  if (metricType === 'strength') {
    return sessions.map((group) => {
      const best = [...group].filter((r) => Number(r.weight_kg ?? 0) > 0 && Number(r.reps ?? 0) > 0).sort((a, b) => Number(b.weight_kg) * (1 + Number(b.reps) / 30) - Number(a.weight_kg) * (1 + Number(a.reps) / 30))[0];
      return best ? { x: kgToDisplay(Number(best.weight_kg), weightUnit), y: Number(best.reps), date: best.created_at, label: `${formatWeight(Number(best.weight_kg), weightUnit)} × ${Number(best.reps)} reps` } : null;
    }).filter(Boolean) as GraphPoint[];
  }
  if (metricType === 'time') {
    return sessions.map((group, index) => {
      const row = group.find((r) => Number(r.duration_min ?? 0) > 0);
      return row ? { x: index + 1, y: Number(row.duration_min), date: row.created_at, label: `${Number(row.duration_min)} min` } : null;
    }).filter(Boolean) as GraphPoint[];
  }
  return sessions.map((group) => {
    const row = group.find((r) => Number(r.distance_km ?? 0) > 0 && Number(r.duration_min ?? 0) > 0);
    return row ? { x: Number(row.duration_min), y: kmToDisplay(Number(row.distance_km), distanceUnit), date: row.created_at, label: `${formatDistance(Number(row.distance_km), distanceUnit)} in ${Number(row.duration_min)} min` } : null;
  }).filter(Boolean) as GraphPoint[];
}

function ProgressGraph({ points, xLabel, yLabel, selected, onSelect }: { points: GraphPoint[]; xLabel: string; yLabel: string; selected: number | null; onSelect: (i: number) => void }) {
  const { colors } = useTheme();
  const W = 340, H = 230, left = 46, right = 16, top = 18, bottom = 42;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = maxX === minX ? 1 : (maxX - minX) * 0.08;
  const padY = maxY === minY ? 1 : (maxY - minY) * 0.12;
  const loX = Math.max(0, minX - padX), hiX = maxX + padX, loY = Math.max(0, minY - padY), hiY = maxY + padY;
  const sx = (x: number) => left + ((x - loX) / Math.max(0.001, hiX - loX)) * (W - left - right);
  const sy = (y: number) => H - bottom - ((y - loY) / Math.max(0.001, hiY - loY)) * (H - top - bottom);
  const poly = points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ');
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return <View style={{ width: '100%', marginTop: 12 }}>
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {ticks.map((t) => {
        const y = top + t * (H - top - bottom);
        const value = hiY - t * (hiY - loY);
        return <G key={`y-${t}`}><Line x1={left} y1={y} x2={W - right} y2={y} stroke={colors.border} strokeWidth="1" /><SvgText x={left - 7} y={y + 4} fill={colors.muted} fontSize="9" textAnchor="end">{formatAxis(value)}</SvgText></G>;
      })}
      {ticks.map((t) => {
        const x = left + t * (W - left - right);
        const value = loX + t * (hiX - loX);
        return <SvgText key={`x-${t}`} x={x} y={H - bottom + 18} fill={colors.muted} fontSize="9" textAnchor="middle">{formatAxis(value)}</SvgText>;
      })}
      <Line x1={left} y1={top} x2={left} y2={H - bottom} stroke={colors.muted} strokeWidth="1.2" />
      <Line x1={left} y1={H - bottom} x2={W - right} y2={H - bottom} stroke={colors.muted} strokeWidth="1.2" />
      {points.length > 1 ? <Polyline points={poly} fill="none" stroke={colors.primary} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /> : null}
      {points.map((p, i) => <Circle key={`${p.date}-${i}`} cx={sx(p.x)} cy={sy(p.y)} r={selected === i ? 7 : 5} fill={selected === i ? colors.green : colors.primary} stroke={colors.bg} strokeWidth="2" onPress={() => onSelect(i)} />)}
      <SvgText x={(left + W - right) / 2} y={H - 5} fill={colors.muted} fontSize="10" textAnchor="middle">{xLabel}</SvgText>
      <SvgText x={11} y={(top + H - bottom) / 2} fill={colors.muted} fontSize="10" textAnchor="middle" rotation="-90" origin={`11 ${(top + H - bottom) / 2}`}>{yLabel}</SvgText>
    </Svg>
  </View>;
}

function formatAxis(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(value < 10 ? 1 : 0); }
function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) { const { colors } = useTheme(); const s = createStyles(colors); return <View style={s.header}><Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable><View style={{ flex: 1 }}><Text style={s.title}>{title}</Text><Text style={s.headerSub}>{subtitle}</Text></View></View>; }
function Summary({ label, value, sub }: { label: string; value: string; sub: string }) { const { colors } = useTheme(); const s = createStyles(colors); return <View style={s.summary}><Text style={s.summaryLabel}>{label}</Text><Text style={s.summaryValue}>{value}</Text><Text style={s.meta}>{sub}</Text></View>; }
function Info({ label, value }: { label: string; value: string }) { const { colors } = useTheme(); const s = createStyles(colors); return <View style={s.info}><Text style={s.meta}>{label}</Text><Text style={s.infoValue}>{value}</Text></View>; }

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingTop: 10, paddingBottom: 34 }, header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }, back: { width: 34, height: 42, justifyContent: 'center' }, backText: { color: colors.text, fontSize: 36, fontWeight: '300' }, title: { color: colors.text, fontSize: 28, fontWeight: '900' }, headerSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  modeTabs: { flexDirection: 'row', gap: 6, marginBottom: 16 }, modeTab: { flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, borderRadius: 10, paddingVertical: 9, alignItems: 'center' }, modeTabActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, modeTabText: { color: colors.muted, fontSize: 10, fontWeight: '800' }, modeTabTextActive: { color: colors.primary },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }, summaryPress: { width: '48%' }, summary: { width: '100%', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 13 }, summaryLabel: { color: colors.muted, fontSize: 10 }, summaryValue: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 5 }, meta: { color: colors.muted, fontSize: 11, marginTop: 3, lineHeight: 16 },
  prCard: { flexDirection: 'row', alignItems: 'center', padding: 13 }, prName: { color: colors.text, fontWeight: '900', fontSize: 15 }, chevron: { color: colors.muted, fontSize: 26 }, manageButton: { borderWidth: 1.5, borderColor: colors.blue, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 14, backgroundColor: colors.panel }, manageText: { color: colors.blue, fontWeight: '900' }, pickRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 }, pickName: { color: colors.text, fontWeight: '800', flex: 1 }, pickState: { color: colors.blue, fontWeight: '900', fontSize: 11 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }, badge: { width: '48%', minHeight: 126, borderRadius: 15, padding: 13, borderWidth: 1 }, badgeUnlocked: { backgroundColor: colors.panel, borderColor: colors.gold }, badgeLocked: { backgroundColor: colors.panel2, borderColor: colors.border, opacity: 0.75 }, badgeIcon: { fontSize: 23 }, badgeTitle: { color: colors.text, fontWeight: '900', fontSize: 13, marginTop: 8 }, badgeDetail: { color: colors.muted, fontSize: 9, fontWeight: '800', marginTop: 5, lineHeight: 13 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, streakRowIcon: { fontSize: 19, width: 28, textAlign: 'center' },
  info: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border }, infoValue: { color: colors.text, fontWeight: '900' }, prHistoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, prNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' }, prNumberText: { color: colors.gold, fontWeight: '900' }, prWeight: { color: colors.text, fontWeight: '900', fontSize: 15 }, currentTag: { color: colors.green, fontWeight: '900', fontSize: 9, backgroundColor: colors.greenSoft, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7 },
  exerciseTabs: { gap: 7, paddingBottom: 12 }, exerciseTab: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }, exerciseTabActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, exerciseTabText: { color: colors.muted, fontWeight: '800', fontSize: 11 }, exerciseTabTextActive: { color: colors.primary }, chartTitle: { color: colors.text, fontSize: 19, fontWeight: '900' }, chartSub: { color: colors.muted, marginTop: 3, fontSize: 11 }, emptyGraph: { color: colors.muted, paddingVertical: 28, textAlign: 'center' }, pointDetail: { backgroundColor: colors.panel2, borderRadius: 10, padding: 10, marginTop: 4 }, pointValue: { color: colors.text, fontWeight: '900', fontSize: 14 }, tapHint: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 5 },
});
