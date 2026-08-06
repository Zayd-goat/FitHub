import React, { useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Input, SectionTitle, colors } from '../../components/UI';
import { presetExercises, PresetExercise } from '../../data/presets';
import { Exercise, Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { progressionSuggestion } from '../../lib/progression';
import { recordWorkoutDay } from '../../lib/streaks';

type Pending = {
  exercise: Exercise;
  sets: number;
  weight_kg: number;
  reps: number;
  distance_km: number;
  duration_min: number;
};

export default function WorkoutTab({ profile, onProfileChanged }: { profile: Profile; onProfileChanged: () => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('10');
  const [sets, setSets] = useState('3');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState({ name: '', category: '', equipment: '', metric: 'strength' as 'strength'|'distance'|'time' });
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    supabase.from('exercises').select('id,name,category,equipment,metric_type,icon_emoji,rep_min,rep_max').eq('owner_id', profile.id).order('created_at', { ascending: false })
      .then(({ data }) => setCustomExercises((data ?? []) as Exercise[]));
  }, [profile.id]);

  const allExercises = useMemo(() => {
    const all = [...customExercises, ...presetExercises];
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(x => `${x.name} ${x.category} ${x.equipment}`.toLowerCase().includes(q));
  }, [query, customExercises]);

  const choose = async (ex: Exercise) => {
    setSelected(ex); setSuggestion('');
    setWeight(''); setReps(String(ex.rep_max ? Math.min(10, ex.rep_max) : 10)); setSets('3'); setDistance(''); setDuration('');
    if (ex.metric_type === 'strength') {
      const { data } = await supabase.from('workout_sets').select('weight_kg,reps,created_at').eq('user_id', profile.id).eq('exercise_name', ex.name).not('weight_kg', 'is', null).order('created_at', { ascending: false }).limit(2);
      if (data?.length) {
        const chronological = [...data].reverse().map((x: any) => ({ weight_kg: Number(x.weight_kg), reps: Number(x.reps) }));
        setSuggestion(progressionSuggestion(chronological, ex.rep_min ?? 8, ex.rep_max ?? 12));
      } else setSuggestion('Log this exercise twice before FitHub suggests a progression.');
    }
  };

  const addPending = () => {
    if (!selected) return;
    const s = Math.max(1, Number(sets) || 1);
    if (selected.metric_type === 'strength') {
      const w = Number(weight), r = Number(reps);
      if (!Number.isFinite(w) || w < 0 || !r || r < 1) return Alert.alert('Check the set', 'Enter a valid weight and reps. Use 0 kg for bodyweight-only movements if needed.');
      setPending([...pending, { exercise: selected, sets: s, weight_kg: w, reps: r, distance_km: 0, duration_min: 0 }]);
    } else if (selected.metric_type === 'distance') {
      const d = Number(distance), min = Number(duration || 0);
      if (!d || d <= 0) return Alert.alert('Check distance', 'Enter the distance completed in km.');
      setPending([...pending, { exercise: selected, sets: 1, weight_kg: 0, reps: 0, distance_km: d, duration_min: min }]);
    } else {
      const min = Number(duration);
      if (!min || min <= 0) return Alert.alert('Check duration', 'Enter the duration in minutes.');
      setPending([...pending, { exercise: selected, sets: 1, weight_kg: 0, reps: 0, distance_km: 0, duration_min: min }]);
    }
    setSelected(null); setSuggestion('');
  };

  const saveCustom = async () => {
    if (!custom.name.trim()) return Alert.alert('Exercise name', 'Give your custom exercise a name.');
    const payload = { owner_id: profile.id, name: custom.name.trim(), category: custom.category.trim() || 'Custom', equipment: custom.equipment.trim() || 'Custom', metric_type: custom.metric, icon_emoji: custom.metric === 'distance' ? '🏃' : custom.metric === 'time' ? '⏱️' : '💪', rep_min: custom.metric === 'strength' ? 8 : null, rep_max: custom.metric === 'strength' ? 12 : null, public: false };
    const { data, error } = await supabase.from('exercises').insert(payload).select('id,name,category,equipment,metric_type,icon_emoji,rep_min,rep_max').single();
    if (error) return Alert.alert('Could not add exercise', error.message);
    setCustomExercises([data as Exercise, ...customExercises]);
    setCustom({ name: '', category: '', equipment: '', metric: 'strength' }); setCustomOpen(false);
  };

  const finishWorkout = async () => {
    if (!pending.length) return Alert.alert('Add an exercise', 'Add at least one exercise before finishing the workout.');
    setBusy(true);
    try {
      const summary = pending.map(p => p.exercise.name).join(', ');
      const { data: session, error } = await supabase.from('workout_sessions').insert({ user_id: profile.id, completed: true, ended_at: new Date().toISOString(), summary }).select('id').single();
      if (error) throw error;
      const rows: any[] = [];
      for (const p of pending) {
        for (let i=1; i<=p.sets; i++) rows.push({
          session_id: session.id, user_id: profile.id, exercise_id: p.exercise.id ?? null, exercise_name: p.exercise.name, set_number: i,
          weight_kg: p.exercise.metric_type === 'strength' ? p.weight_kg : null,
          reps: p.exercise.metric_type === 'strength' ? p.reps : null,
          distance_km: p.exercise.metric_type === 'distance' ? p.distance_km : null,
          duration_min: p.exercise.metric_type !== 'strength' ? p.duration_min : null
        });
      }
      const { error: setError } = await supabase.from('workout_sets').insert(rows); if (setError) throw setError;
      const { error: postError } = await supabase.from('workout_posts').insert({ user_id: profile.id, session_id: session.id, summary: `Completed: ${summary}` }); if (postError) throw postError;
      await recordWorkoutDay(profile.id);
      await supabase.rpc('apply_workout_to_challenges', { p_session_id: session.id });
      const { count } = await supabase.from('workout_sessions').select('*', { head: true, count: 'exact' }).eq('user_id', profile.id).eq('completed', true);
      const achievements: string[] = [];
      if ((count ?? 0) >= 1) achievements.push('first_workout');
      if ((count ?? 0) >= 5) achievements.push('five_workouts');
      if ((count ?? 0) >= 10) achievements.push('ten_workouts');
      for (const key of achievements) await supabase.from('user_achievements').upsert({ user_id: profile.id, achievement_key: key }, { onConflict: 'user_id,achievement_key' });
      setPending([]);
      Alert.alert('Workout logged ⚡', `Nice work. You earned 10 FitHub tokens.${achievements.length ? ' Badge progress updated too.' : ''}`);
      onProfileChanged();
    } catch (e: any) { Alert.alert('Could not finish workout', e?.message ?? 'Please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Log a workout</Text>
        <Text style={styles.sub}>Choose machine, free-weight, bodyweight or cardio exercises. Add your own if it is missing.</Text>

        {pending.length ? <Card>
          <SectionTitle title="Current workout" subtitle={`${pending.length} exercise${pending.length === 1 ? '' : 's'} ready to log`} />
          {pending.map((p,i) => <View key={`${p.exercise.name}-${i}`} style={styles.pending}><Text style={styles.pendingName}>{p.exercise.icon_emoji} {p.exercise.name}</Text><Text style={styles.meta}>{p.exercise.metric_type === 'strength' ? `${p.sets} × ${p.reps} @ ${p.weight_kg} kg` : p.exercise.metric_type === 'distance' ? `${p.distance_km} km${p.duration_min ? ` · ${p.duration_min} min` : ''}` : `${p.duration_min} min`}</Text></View>)}
          <Button title={busy ? 'Saving workout…' : 'Finish & share workout'} onPress={finishWorkout} disabled={busy} />
        </Card> : null}

        {selected ? <Card>
          <SectionTitle title={selected.name} subtitle={`${selected.category} · ${selected.equipment}`} />
          {suggestion ? <View style={styles.tip}><Text style={styles.tipLabel}>PROGRESSION IDEA</Text><Text style={styles.tipText}>{suggestion}</Text></View> : null}
          {selected.metric_type === 'strength' ? <>
            <View style={styles.two}><Input style={{ flex: 1 }} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Weight kg" /><Input style={{ flex: 1 }} value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="Reps" /></View>
            <Input value={sets} onChangeText={setSets} keyboardType="number-pad" placeholder="Sets" />
          </> : selected.metric_type === 'distance' ? <>
            <Input value={distance} onChangeText={setDistance} keyboardType="decimal-pad" placeholder="Distance km" />
            <Input value={duration} onChangeText={setDuration} keyboardType="decimal-pad" placeholder="Minutes (optional)" />
          </> : <Input value={duration} onChangeText={setDuration} keyboardType="decimal-pad" placeholder="Minutes" />}
          <Button title="Add to workout" onPress={addPending} /><Button title="Cancel" onPress={() => setSelected(null)} secondary />
        </Card> : null}

        <Card>
          <Input value={query} onChangeText={setQuery} placeholder="Search exercise or machine…" />
          <Button title={customOpen ? 'Close custom exercise' : 'Add custom exercise'} onPress={() => setCustomOpen(!customOpen)} secondary />
          {customOpen ? <View style={{ marginTop: 10 }}>
            <Input value={custom.name} onChangeText={v => setCustom({ ...custom, name: v })} placeholder="Exercise name" />
            <Input value={custom.category} onChangeText={v => setCustom({ ...custom, category: v })} placeholder="Category, e.g. Shoulders" />
            <Input value={custom.equipment} onChangeText={v => setCustom({ ...custom, equipment: v })} placeholder="Equipment / machine" />
            <View style={styles.chips}>{(['strength','distance','time'] as const).map(v => <Chip key={v} label={v} active={custom.metric === v} onPress={() => setCustom({ ...custom, metric: v })} />)}</View>
            <Button title="Save custom exercise" onPress={saveCustom} />
          </View> : null}
        </Card>

        <SectionTitle title="Exercise library" subtitle="Illustrated cards include gym machines, free weights, bodyweight and cardio." />
        <View style={styles.grid}>
          {allExercises.map((ex: any, i) => <Pressable key={`${ex.id ?? ex.name}-${i}`} style={styles.exerciseCard} onPress={() => choose(ex)}>
            {ex.image ? <Image source={ex.image} style={styles.image} /> : <View style={styles.customImage}><Text style={{ fontSize: 44 }}>{ex.icon_emoji}</Text></View>}
            <View style={styles.exerciseText}><Text style={styles.exerciseName}>{ex.name}</Text><Text style={styles.meta}>{ex.equipment}</Text></View>
          </Pressable>)}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 }, title: { color: colors.text, fontSize: 29, fontWeight: '900' }, sub: { color: colors.muted, lineHeight: 19, marginTop: 4, marginBottom: 12 },
  pending: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }, pendingName: { color: colors.text, fontWeight: '900' }, meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  tip: { backgroundColor: '#0b2b3e', borderWidth: 1, borderColor: '#176078', borderRadius: 14, padding: 12, marginBottom: 12 }, tipLabel: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, tipText: { color: colors.text, lineHeight: 19, marginTop: 4 },
  two: { flexDirection: 'row', gap: 8 }, chips: { flexDirection: 'row', flexWrap: 'wrap' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  exerciseCard: { width: '48.5%', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: 'hidden' }, image: { width: '100%', height: 110, resizeMode: 'cover' }, customImage: { width: '100%', height: 110, backgroundColor: '#071b37', alignItems: 'center', justifyContent: 'center' }, exerciseText: { padding: 10 }, exerciseName: { color: colors.text, fontWeight: '900', fontSize: 14 }
});
