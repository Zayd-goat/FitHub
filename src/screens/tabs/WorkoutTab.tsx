import React, { useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Input, SectionTitle, colors } from '../../components/UI';
import { exerciseTags, presetExercises, PresetExercise } from '../../data/presets';
import { Exercise, Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { progressionSuggestion } from '../../lib/progression';
import { recordWorkoutDay } from '../../lib/streaks';

type LibraryExercise = Exercise & Partial<Pick<PresetExercise, 'tags' | 'subgroup' | 'image_urls' | 'track_weight' | 'track_sets'>>;

type Pending = {
  exercise: LibraryExercise;
  sets: string;
  weight_kg: string;
  reps: string;
  distance_km: string;
  duration_min: string;
};

type SavedWorkout = { id: string; summary: string | null; ended_at: string | null; created_at: string };

const appIcon = require('../../../assets/icon.png');

function isBodyweight(ex: LibraryExercise) {
  return ex.equipment.toLowerCase().includes('bodyweight');
}

function defaultsFor(ex: LibraryExercise): Pending {
  const strength = ex.metric_type === 'strength';
  return {
    exercise: ex,
    sets: String(ex.track_sets === false ? 1 : strength || ex.track_sets ? 3 : 1),
    weight_kg: ex.track_weight === false ? '' : isBodyweight(ex) ? '0' : '',
    reps: strength ? String(ex.rep_max ? Math.min(10, ex.rep_max) : 10) : '',
    distance_km: '',
    duration_min: ''
  };
}

function pendingLabel(p: Pending) {
  const sets = Number(p.sets || 1);
  if (p.exercise.metric_type === 'strength') return `${sets} × ${p.reps || '—'} @ ${p.weight_kg || '—'} kg`;
  if (p.exercise.metric_type === 'distance') {
    const weight = p.exercise.track_weight ? ` · ${p.weight_kg || '—'} kg` : '';
    const duration = p.duration_min ? ` · ${p.duration_min} min` : '';
    return `${sets > 1 ? `${sets} sets · ` : ''}${p.distance_km || '—'} km${weight}${duration}`;
  }
  const timedWeight = p.exercise.track_weight ? ` · ${p.weight_kg || '—'} kg` : '';
  return `${p.duration_min || '—'} min${timedWeight}`;
}

function ExerciseThumbnail({ exercise }: { exercise: LibraryExercise }) {
  const [failed, setFailed] = useState(false);
  const uri = exercise.image_urls?.[0];
  if (!uri || failed) return <Image source={appIcon} style={styles.image} />;
  return <Image source={{ uri }} style={styles.image} onError={() => setFailed(true)} />;
}

function ExerciseMotionDemo({ exercise }: { exercise: LibraryExercise }) {
  const urls = exercise.image_urls ?? [];
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(false);

  React.useEffect(() => {
    setFrame(0);
    setFailed(false);
    if (urls.length < 2) return;
    const id = setInterval(() => setFrame(v => (v + 1) % Math.min(urls.length, 2)), 900);
    return () => clearInterval(id);
  }, [exercise.name]);

  if (!urls.length || failed) {
    return <Image source={appIcon} style={styles.demoImage} />;
  }
  return <Image source={{ uri: urls[frame] }} style={styles.demoImage} onError={() => setFailed(true)} />;
}

export default function WorkoutTab({ profile, onProfileChanged }: { profile: Profile; onProfileChanged: () => void }) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [pending, setPending] = useState<Pending[]>([]);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState({ name: '', category: '', equipment: '', metric: 'strength' as 'strength'|'distance'|'time' });
  const [customExercises, setCustomExercises] = useState<LibraryExercise[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);
  const [busy, setBusy] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);

  const loadCustomExercises = React.useCallback(async () => {
    const { data } = await supabase.from('exercises').select('id,name,category,equipment,metric_type,icon_emoji,rep_min,rep_max').eq('owner_id', profile.id).order('created_at', { ascending: false });
    setCustomExercises((data ?? []).map((x: any) => ({ ...x, tags: ['Custom'], track_weight: x.metric_type === 'strength', track_sets: x.metric_type === 'strength' })) as LibraryExercise[]);
  }, [profile.id]);

  const loadSavedWorkouts = React.useCallback(async () => {
    const { data } = await supabase.from('workout_sessions').select('id,summary,ended_at,created_at').eq('user_id', profile.id).eq('completed', true).order('ended_at', { ascending: false }).limit(6);
    setSavedWorkouts((data ?? []) as SavedWorkout[]);
  }, [profile.id]);

  React.useEffect(() => { loadCustomExercises(); loadSavedWorkouts(); }, [loadCustomExercises, loadSavedWorkouts]);

  const fullLibrary = useMemo<LibraryExercise[]>(() => [...customExercises, ...presetExercises], [customExercises]);

  const allExercises = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fullLibrary.filter(ex => {
      const tagMatch = activeTag === 'All' || ex.tags?.includes(activeTag) || ex.category === activeTag;
      const searchMatch = !q || `${ex.name} ${ex.category} ${ex.subgroup ?? ''} ${ex.equipment} ${(ex.tags ?? []).join(' ')}`.toLowerCase().includes(q);
      return tagMatch && searchMatch;
    });
  }, [query, activeTag, fullLibrary]);

  React.useEffect(() => setVisibleCount(40), [query, activeTag]);
  const visibleExercises = allExercises.slice(0, visibleCount);
  const editing = editingName ? pending.find(p => p.exercise.name === editingName) ?? null : null;

  const updatePending = (name: string, patch: Partial<Pending>) => {
    setPending(list => list.map(p => p.exercise.name === name ? { ...p, ...patch } : p));
  };

  const loadProgression = async (ex: LibraryExercise) => {
    setSuggestion('');
    if (ex.metric_type !== 'strength') return;
    const { data } = await supabase.from('workout_sets').select('weight_kg,reps,created_at').eq('user_id', profile.id).eq('exercise_name', ex.name).not('weight_kg', 'is', null).not('reps', 'is', null).order('created_at', { ascending: false }).limit(2);
    if (data?.length) {
      const chronological = [...data].reverse().map((x: any) => ({ weight_kg: Number(x.weight_kg), reps: Number(x.reps) }));
      setSuggestion(progressionSuggestion(chronological, ex.rep_min ?? 8, ex.rep_max ?? 12));
    } else {
      setSuggestion('After you log this movement a few times, FitHub can show a simple progression note based on your previous entries.');
    }
  };

  const selectExercise = async (ex: LibraryExercise) => {
    const existing = pending.find(p => p.exercise.name === ex.name);
    if (!existing) setPending(list => [...list, defaultsFor(ex)]);
    setEditingName(ex.name);
    await loadProgression(ex);
  };

  const removeExercise = (name: string) => {
    setPending(list => list.filter(p => p.exercise.name !== name));
    if (editingName === name) { setEditingName(null); setSuggestion(''); }
  };

  const saveCustom = async () => {
    if (!custom.name.trim()) return Alert.alert('Exercise name', 'Give your custom exercise a name.');
    const payload = {
      owner_id: profile.id,
      name: custom.name.trim(),
      category: custom.category.trim() || 'Custom',
      equipment: custom.equipment.trim() || 'Custom',
      metric_type: custom.metric,
      icon_emoji: custom.metric === 'distance' ? '🏃' : custom.metric === 'time' ? '⏱️' : '🏋️',
      rep_min: custom.metric === 'strength' ? 8 : null,
      rep_max: custom.metric === 'strength' ? 12 : null,
      public: false
    };
    const { data, error } = await supabase.from('exercises').insert(payload).select('id,name,category,equipment,metric_type,icon_emoji,rep_min,rep_max').single();
    if (error) return Alert.alert('Could not add exercise', error.message);
    const ex = { ...(data as Exercise), tags: ['Custom'], track_weight: custom.metric === 'strength', track_sets: custom.metric === 'strength' } as LibraryExercise;
    setCustomExercises(list => [ex, ...list]);
    setCustom({ name: '', category: '', equipment: '', metric: 'strength' });
    setCustomOpen(false);
  };

  const validateWorkout = () => {
    for (const p of pending) {
      const sets = Number(p.sets);
      if (!Number.isFinite(sets) || sets < 1) return `${p.exercise.name}: enter at least 1 set.`;
      if (p.exercise.metric_type === 'strength') {
        const w = Number(p.weight_kg), r = Number(p.reps);
        if (!Number.isFinite(w) || w < 0) return `${p.exercise.name}: enter the weight used (0 kg is fine for bodyweight).`;
        if (!Number.isFinite(r) || r < 1) return `${p.exercise.name}: enter the reps.`;
      }
      if (p.exercise.metric_type === 'distance') {
        const d = Number(p.distance_km);
        if (!Number.isFinite(d) || d <= 0) return `${p.exercise.name}: enter the distance.`;
        if (p.exercise.track_weight) {
          const w = Number(p.weight_kg);
          if (!Number.isFinite(w) || w < 0) return `${p.exercise.name}: enter the load used.`;
        }
        if (p.duration_min && Number(p.duration_min) <= 0) return `${p.exercise.name}: check the duration.`;
      }
      if (p.exercise.metric_type === 'time') {
        const m = Number(p.duration_min);
        if (!Number.isFinite(m) || m <= 0) return `${p.exercise.name}: enter the duration in minutes.`;
        if (p.exercise.track_weight) {
          const w = Number(p.weight_kg);
          if (!Number.isFinite(w) || w < 0) return `${p.exercise.name}: enter the load used.`;
        }
      }
    }
    return null;
  };

  const finishWorkout = async () => {
    if (!pending.length) return Alert.alert('Select exercises', 'Choose at least one exercise before completing the workout.');
    const validation = validateWorkout();
    if (validation) return Alert.alert('Complete the workout details', validation);

    setBusy(true);
    try {
      const summary = pending.map(p => p.exercise.name).join(', ');
      const { data: session, error } = await supabase.from('workout_sessions').insert({ user_id: profile.id, completed: true, ended_at: new Date().toISOString(), summary }).select('id').single();
      if (error) throw error;

      const rows: any[] = [];
      for (const p of pending) {
        const setCount = Math.max(1, Number(p.sets) || 1);
        for (let i = 1; i <= setCount; i++) {
          rows.push({
            session_id: session.id,
            user_id: profile.id,
            exercise_id: p.exercise.id ?? null,
            exercise_name: p.exercise.name,
            set_number: i,
            weight_kg: p.weight_kg === '' ? null : Number(p.weight_kg),
            reps: p.reps === '' ? null : Number(p.reps),
            distance_km: p.distance_km === '' ? null : Number(p.distance_km),
            duration_min: p.duration_min === '' ? null : Number(p.duration_min)
          });
        }
      }

      const { error: setError } = await supabase.from('workout_sets').insert(rows);
      if (setError) throw setError;
      const { error: postError } = await supabase.from('workout_posts').insert({ user_id: profile.id, session_id: session.id, summary: `Completed: ${summary}` });
      if (postError) throw postError;

      await recordWorkoutDay(profile.id);
      await supabase.rpc('apply_workout_to_challenges', { p_session_id: session.id });

      const { count } = await supabase.from('workout_sessions').select('*', { head: true, count: 'exact' }).eq('user_id', profile.id).eq('completed', true);
      const achievements: string[] = [];
      if ((count ?? 0) >= 1) achievements.push('first_workout');
      if ((count ?? 0) >= 5) achievements.push('five_workouts');
      if ((count ?? 0) >= 10) achievements.push('ten_workouts');
      for (const key of achievements) await supabase.from('user_achievements').upsert({ user_id: profile.id, achievement_key: key }, { onConflict: 'user_id,achievement_key' });

      setPending([]);
      setEditingName(null);
      setSuggestion('');
      await loadSavedWorkouts();
      Alert.alert('Workout saved ⚡', 'This workout is now saved in Repeat workouts, so you can load the same setup next time and edit anything that changed.');
      onProfileChanged();
    } catch (e: any) {
      Alert.alert('Could not complete workout', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const applyRepeatedWorkout = async (saved: SavedWorkout) => {
    const { data, error } = await supabase.from('workout_sets').select('exercise_id,exercise_name,set_number,weight_kg,reps,distance_km,duration_min').eq('session_id', saved.id).order('set_number');
    if (error) return Alert.alert('Could not repeat workout', error.message);
    if (!data?.length) return Alert.alert('No exercise details found', 'This saved workout does not contain any sets.');

    const grouped = new Map<string, any[]>();
    for (const row of data) grouped.set(row.exercise_name, [...(grouped.get(row.exercise_name) ?? []), row]);

    const repeated: Pending[] = [];
    for (const [name, rows] of grouped) {
      const known = fullLibrary.find(ex => ex.name === name);
      const first = rows[0];
      const metric: Exercise['metric_type'] = first.distance_km != null ? 'distance' : first.reps != null ? 'strength' : 'time';
      const ex: LibraryExercise = known ?? {
        id: first.exercise_id ?? undefined,
        name,
        category: 'Saved workout',
        equipment: 'Previously logged',
        metric_type: metric,
        icon_emoji: metric === 'time' ? '⏱️' : metric === 'distance' ? '🏃' : '🏋️',
        rep_min: metric === 'strength' ? 8 : null,
        rep_max: metric === 'strength' ? 12 : null,
        tags: ['Saved'],
        track_weight: first.weight_kg != null,
        track_sets: rows.length > 1 || metric === 'strength'
      };
      repeated.push({
        exercise: ex,
        sets: String(Math.max(...rows.map((r: any) => Number(r.set_number ?? 1)), rows.length)),
        weight_kg: first.weight_kg == null ? '' : String(first.weight_kg),
        reps: first.reps == null ? '' : String(first.reps),
        distance_km: first.distance_km == null ? '' : String(first.distance_km),
        duration_min: first.duration_min == null ? '' : String(first.duration_min)
      });
    }

    const apply = () => {
      setPending(repeated);
      setEditingName(repeated[0]?.exercise.name ?? null);
      setSuggestion('');
    };
    if (pending.length) {
      Alert.alert('Replace current workout?', 'Repeating a saved workout will replace the exercises currently selected.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: apply }
      ]);
    } else apply();
  };

  const dateLabel = (value: string | null, fallback: string) => {
    const d = new Date(value ?? fallback);
    return Number.isNaN(d.getTime()) ? 'Saved workout' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Workouts</Text>
        <Text style={styles.sub}>Select several exercises, fill in the details for each one, then complete the full workout together.</Text>

        {savedWorkouts.length ? <Card>
          <SectionTitle title="Repeat workouts" subtitle="Completed workouts are saved automatically. Load one, adjust it if needed, and go again." />
          {savedWorkouts.map(saved => (
            <View key={saved.id} style={styles.savedRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingName} numberOfLines={1}>{saved.summary || 'Workout'}</Text>
                <Text style={styles.meta}>{dateLabel(saved.ended_at, saved.created_at)}</Text>
              </View>
              <Pressable style={styles.smallAction} onPress={() => applyRepeatedWorkout(saved)}><Text style={styles.smallActionText}>Repeat</Text></Pressable>
            </View>
          ))}
        </Card> : null}

        {pending.length ? <Card>
          <SectionTitle title={`Current workout · ${pending.length} selected`} subtitle="Tap Edit on each exercise to enter its weight, reps, sets, distance or duration." />
          {pending.map(p => (
            <View key={p.exercise.name} style={styles.pending}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingName}>✓ {p.exercise.name}</Text>
                <Text style={styles.meta}>{pendingLabel(p)}</Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable style={styles.smallAction} onPress={() => { setEditingName(p.exercise.name); loadProgression(p.exercise); }}><Text style={styles.smallActionText}>Edit</Text></Pressable>
                <Pressable style={[styles.smallAction, styles.removeAction]} onPress={() => removeExercise(p.exercise.name)}><Text style={styles.removeText}>Remove</Text></Pressable>
              </View>
            </View>
          ))}
          <Button title={busy ? 'Saving workout…' : 'Complete workout'} onPress={finishWorkout} disabled={busy} />
        </Card> : null}

        {editing ? <Card>
          <SectionTitle title={editing.exercise.name} subtitle={`${editing.exercise.category}${editing.exercise.subgroup ? ` · ${editing.exercise.subgroup}` : ''} · ${editing.exercise.equipment}`} />
          <ExerciseMotionDemo exercise={editing.exercise} />
          {editing.exercise.image_urls?.length ? <Text style={styles.motionNote}>Movement preview alternates between the start and finish positions when both reference images are available.</Text> : null}
          {suggestion ? <View style={styles.tip}><Text style={styles.tipLabel}>PREVIOUS LOGS</Text><Text style={styles.tipText}>{suggestion}</Text></View> : null}

          {editing.exercise.metric_type === 'strength' ? <>
            <View style={styles.two}>
              <Input style={{ flex: 1 }} value={editing.weight_kg} onChangeText={v => updatePending(editing.exercise.name, { weight_kg: v })} keyboardType="decimal-pad" placeholder="Weight kg" />
              <Input style={{ flex: 1 }} value={editing.reps} onChangeText={v => updatePending(editing.exercise.name, { reps: v })} keyboardType="number-pad" placeholder="Reps" />
            </View>
            <Input value={editing.sets} onChangeText={v => updatePending(editing.exercise.name, { sets: v })} keyboardType="number-pad" placeholder="Sets" />
          </> : editing.exercise.metric_type === 'distance' ? <>
            {editing.exercise.track_weight ? <Input value={editing.weight_kg} onChangeText={v => updatePending(editing.exercise.name, { weight_kg: v })} keyboardType="decimal-pad" placeholder="Load / weight kg" /> : null}
            <Input value={editing.distance_km} onChangeText={v => updatePending(editing.exercise.name, { distance_km: v })} keyboardType="decimal-pad" placeholder="Distance km" />
            <Input value={editing.duration_min} onChangeText={v => updatePending(editing.exercise.name, { duration_min: v })} keyboardType="decimal-pad" placeholder="Duration minutes (optional)" />
            {editing.exercise.track_sets ? <Input value={editing.sets} onChangeText={v => updatePending(editing.exercise.name, { sets: v })} keyboardType="number-pad" placeholder="Sets / rounds" /> : null}
          </> : <>
            {editing.exercise.track_weight ? <Input value={editing.weight_kg} onChangeText={v => updatePending(editing.exercise.name, { weight_kg: v })} keyboardType="decimal-pad" placeholder="Load / weight kg" /> : null}
            <Input value={editing.duration_min} onChangeText={v => updatePending(editing.exercise.name, { duration_min: v })} keyboardType="decimal-pad" placeholder="Duration minutes" />
          </>}
          <Button title="Done editing" onPress={() => { setEditingName(null); setSuggestion(''); }} />
        </Card> : null}

        <Card>
          <Input value={query} onChangeText={setQuery} placeholder="Search exercise, muscle group or machine…" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagStrip}>
            {exerciseTags.map(tag => <Chip key={tag} label={tag} active={activeTag === tag} onPress={() => setActiveTag(tag)} />)}
          </ScrollView>
          <Button title={customOpen ? 'Close custom exercise' : 'Add custom exercise'} onPress={() => setCustomOpen(!customOpen)} secondary />
          {customOpen ? <View style={{ marginTop: 10 }}>
            <Input value={custom.name} onChangeText={v => setCustom({ ...custom, name: v })} placeholder="Exercise name" />
            <Input value={custom.category} onChangeText={v => setCustom({ ...custom, category: v })} placeholder="Category, e.g. Shoulders" />
            <Input value={custom.equipment} onChangeText={v => setCustom({ ...custom, equipment: v })} placeholder="Equipment / machine" />
            <View style={styles.chips}>{(['strength','distance','time'] as const).map(v => <Chip key={v} label={v} active={custom.metric === v} onPress={() => setCustom({ ...custom, metric: v })} />)}</View>
            <Button title="Save custom exercise" onPress={saveCustom} />
          </View> : null}
        </Card>

        <SectionTitle title="Exercise library" subtitle={`${allExercises.length} matching exercises · tap cards to add several to the same workout.`} />
        <View style={styles.grid}>
          {visibleExercises.map((ex, i) => {
            const selected = pending.some(p => p.exercise.name === ex.name);
            return <Pressable key={`${ex.id ?? ex.name}-${i}`} style={[styles.exerciseCard, selected && styles.exerciseSelected]} onPress={() => selectExercise(ex)}>
              <ExerciseThumbnail exercise={ex} />
              {selected ? <View style={styles.selectedBadge}><Text style={styles.selectedBadgeText}>✓ SELECTED</Text></View> : null}
              <View style={styles.exerciseText}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <Text style={styles.meta}>{ex.equipment}</Text>
                <Text style={styles.tagText}>{(ex.tags ?? [ex.category]).slice(0, 2).join(' · ')}</Text>
              </View>
            </Pressable>;
          })}
        </View>
        {visibleCount < allExercises.length ? <Button title={`Show more exercises (${allExercises.length - visibleCount} remaining)`} onPress={() => setVisibleCount(v => v + 40)} secondary /> : null}
        <Text style={styles.sourceNote}>Exercise reference images use the public-domain Free Exercise DB when a matching movement is available. FitHub falls back to its own artwork if an online reference cannot be loaded.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900' },
  sub: { color: colors.muted, lineHeight: 19, marginTop: 4, marginBottom: 12 },
  pending: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingName: { color: colors.text, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  tagText: { color: colors.cyan, fontSize: 10, fontWeight: '800', marginTop: 5 },
  tip: { backgroundColor: '#0b2b3e', borderWidth: 1, borderColor: '#176078', borderRadius: 14, padding: 12, marginBottom: 12 },
  tipLabel: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  tipText: { color: colors.text, lineHeight: 19, marginTop: 4 },
  two: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  tagStrip: { paddingBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  exerciseCard: { width: '48.5%', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: 'hidden', position: 'relative' },
  exerciseSelected: { borderColor: colors.cyan, borderWidth: 2, backgroundColor: '#09223c' },
  image: { width: '100%', height: 128, resizeMode: 'cover', backgroundColor: '#061124' },
  demoImage: { width: '100%', height: 230, resizeMode: 'contain', borderRadius: 16, backgroundColor: '#020817', marginBottom: 8 },
  motionNote: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 12 },
  exerciseText: { padding: 10 },
  exerciseName: { color: colors.text, fontWeight: '900', fontSize: 14 },
  selectedBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#063c49', borderColor: colors.cyan, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  selectedBadgeText: { color: colors.cyan, fontWeight: '900', fontSize: 9 },
  rowActions: { flexDirection: 'row', gap: 6 },
  smallAction: { borderRadius: 10, borderWidth: 1, borderColor: '#235a83', backgroundColor: '#0a2444', paddingHorizontal: 10, paddingVertical: 8 },
  smallActionText: { color: colors.cyan, fontSize: 11, fontWeight: '900' },
  removeAction: { backgroundColor: '#33131b', borderColor: '#7f1d2d' },
  removeText: { color: '#fda4af', fontSize: 11, fontWeight: '900' },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  sourceNote: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 16, textAlign: 'center' }
});
