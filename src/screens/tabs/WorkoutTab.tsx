
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Input, SectionTitle, colors } from '../../components/UI';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { progressionSuggestion } from '../../lib/progression';
import { recordWorkoutDay } from '../../lib/streaks';
import { exerciseLibrary, figureImages, LibraryExercise, muscleGroupFilters, sectionFilters, summarizeTargets } from '../../data/exerciseLibrary';

type BuilderItem = {
  id: string;
  exercise: LibraryExercise;
  sets: string;
  reps: string;
  weight: string;
  distance: string;
  duration: string;
  suggestion?: string;
};

function newBuilder(exercise: LibraryExercise): BuilderItem {
  return {
    id: `${exercise.slug}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    exercise,
    sets: exercise.metric_type === 'strength' ? '3' : '1',
    reps: exercise.rep_max ? String(Math.min(10, exercise.rep_max)) : '10',
    weight: '',
    distance: '',
    duration: '',
  };
}

export default function WorkoutTab({ profile, onProfileChanged }: { profile: Profile; onProfileChanged: () => void }) {
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<(typeof muscleGroupFilters)[number]>('All');
  const [sectionFilter, setSectionFilter] = useState<(typeof sectionFilters)[number]>('All');
  const [builder, setBuilder] = useState<BuilderItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [lastWorkout, setLastWorkout] = useState<BuilderItem[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exerciseLibrary.filter((ex) => {
      if (muscleFilter !== 'All' && ex.targetArea !== muscleFilter) return false;
      if (sectionFilter !== 'All' && ex.section !== sectionFilter) return false;
      if (!q) return true;
      const blob = `${ex.name} ${ex.category} ${ex.equipment} ${ex.section} ${ex.subsection} ${ex.targetArea}`.toLowerCase();
      return blob.includes(q);
    });
  }, [query, muscleFilter, sectionFilter]);

  const visibleExercises = showAll ? filtered : filtered.slice(0, 50);

  const addExercise = async (exercise: LibraryExercise) => {
    const item = newBuilder(exercise);
    if (exercise.metric_type === 'strength') {
      const { data } = await supabase
        .from('workout_sets')
        .select('weight_kg,reps,created_at')
        .eq('user_id', profile.id)
        .eq('exercise_name', exercise.name)
        .not('weight_kg', 'is', null)
        .order('created_at', { ascending: false })
        .limit(2);
      if (data?.length) {
        const chronological = [...data].reverse().map((x: any) => ({ weight_kg: Number(x.weight_kg), reps: Number(x.reps) }));
        item.suggestion = progressionSuggestion(chronological, exercise.rep_min ?? 8, exercise.rep_max ?? 12);
      }
    }
    setBuilder((prev) => [...prev, item]);
  };

  const updateBuilder = (id: string, patch: Partial<BuilderItem>) => {
    setBuilder((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const removeBuilder = (id: string) => setBuilder((prev) => prev.filter((item) => item.id !== id));

  const loadLastWorkout = () => {
    if (!lastWorkout.length) return;
    setBuilder(lastWorkout.map((item) => ({ ...item, id: `${item.exercise.slug}-${Date.now()}-${Math.random().toString(36).slice(2,6)}` })));
  };

  useEffect(() => {
    const fetchLastWorkout = async () => {
      const { data: session } = await supabase
        .from('workout_sessions')
        .select('id,ended_at')
        .eq('user_id', profile.id)
        .eq('completed', true)
        .order('ended_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!session?.id) return setLastWorkout([]);
      const { data: sets } = await supabase
        .from('workout_sets')
        .select('exercise_name, weight_kg, reps, distance_km, duration_min')
        .eq('session_id', session.id)
        .order('set_number', { ascending: true });
      if (!sets?.length) return setLastWorkout([]);
      const byExercise = new Map<string, any[]>();
      sets.forEach((row: any) => {
        const list = byExercise.get(row.exercise_name) ?? [];
        list.push(row);
        byExercise.set(row.exercise_name, list);
      });
      const template: BuilderItem[] = [];
      for (const [exerciseName, rows] of byExercise.entries()) {
        const exercise = exerciseLibrary.find((ex) => ex.name === exerciseName);
        if (!exercise) continue;
        const top = rows[0];
        template.push({
          id: `${exercise.slug}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          exercise,
          sets: exercise.metric_type === 'strength' ? String(rows.length) : '1',
          reps: top?.reps ? String(top.reps) : '10',
          weight: top?.weight_kg != null ? String(top.weight_kg) : '',
          distance: top?.distance_km != null ? String(top.distance_km) : '',
          duration: top?.duration_min != null ? String(top.duration_min) : '',
        });
      }
      setLastWorkout(template);
    };
    fetchLastWorkout();
  }, [profile.id]);

  const finishWorkout = async () => {
    if (!builder.length) return Alert.alert('Add exercises', 'Choose at least one exercise before completing your workout.');
    for (const item of builder) {
      if (item.exercise.metric_type === 'strength') {
        if (!item.reps || !item.sets) return Alert.alert('Missing sets or reps', `Enter sets and reps for ${item.exercise.name}.`);
      }
      if (item.exercise.metric_type === 'strength' && item.weight === '') return Alert.alert('Missing weight', `Enter the weight used for ${item.exercise.name}. Use 0 for bodyweight movements.`);
      if (item.exercise.metric_type === 'distance' && !item.distance && !item.duration) return Alert.alert('Missing cardio details', `Enter a distance or duration for ${item.exercise.name}.`);
      if (item.exercise.metric_type === 'time' && !item.duration) return Alert.alert('Missing duration', `Enter the minutes completed for ${item.exercise.name}.`);
    }

    setBusy(true);
    try {
      const summary = builder.map((item) => item.exercise.name).join(', ');
      const { data: session, error } = await supabase
        .from('workout_sessions')
        .insert({ user_id: profile.id, completed: true, ended_at: new Date().toISOString(), summary })
        .select('id')
        .single();
      if (error) throw error;

      const rows: any[] = [];
      builder.forEach((item) => {
        const sets = Math.max(1, Number(item.sets) || 1);
        if (item.exercise.metric_type === 'strength') {
          for (let index = 1; index <= sets; index += 1) {
            rows.push({
              session_id: session.id,
              user_id: profile.id,
              exercise_id: null,
              exercise_name: item.exercise.name,
              set_number: index,
              weight_kg: Number(item.weight || 0),
              reps: Number(item.reps || 0),
              distance_km: null,
              duration_min: null,
            });
          }
        } else {
          rows.push({
            session_id: session.id,
            user_id: profile.id,
            exercise_id: null,
            exercise_name: item.exercise.name,
            set_number: 1,
            weight_kg: null,
            reps: null,
            distance_km: item.distance ? Number(item.distance) : null,
            duration_min: item.duration ? Number(item.duration) : null,
          });
        }
      });

      const { error: setsError } = await supabase.from('workout_sets').insert(rows);
      if (setsError) throw setsError;
      const { error: postError } = await supabase.from('workout_posts').insert({ user_id: profile.id, session_id: session.id, summary: `Completed: ${summary}` });
      if (postError) throw postError;
      await recordWorkoutDay(profile.id);
      await supabase.rpc('apply_workout_to_challenges', { p_session_id: session.id });
      setLastWorkout(builder);
      setBuilder([]);
      Alert.alert('Workout saved', 'Your workout has been logged and can be repeated next week from the Repeat workout button.');
      onProfileChanged();
    } catch (e: any) {
      Alert.alert('Could not save workout', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Workout builder</Text>
        <Text style={styles.sub}>Choose several exercises, enter the sets/reps/weight or time/distance, then complete the full workout at once.</Text>

        <Card>
          <SectionTitle title="Current workout" subtitle={builder.length ? `${builder.length} exercise${builder.length === 1 ? '' : 's'} selected` : 'Select exercises from the list below.'} />
          {lastWorkout.length ? <Button title="Repeat last workout" onPress={loadLastWorkout} secondary /> : null}
          {!builder.length ? <Text style={styles.emptyText}>No exercises added yet.</Text> : null}
          {builder.map((item) => (
            <View key={item.id} style={styles.builderCard}>
              <View style={styles.builderHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.builderName}>{item.exercise.name}</Text>
                  <Text style={styles.builderMeta}>{item.exercise.targetArea} • {item.exercise.subsection} • {item.exercise.equipment}</Text>
                </View>
                <Pressable onPress={() => removeBuilder(item.id)} style={styles.removeBtn}><Text style={styles.removeText}>Remove</Text></Pressable>
              </View>
              {item.suggestion ? <Text style={styles.suggestion}>{item.suggestion}</Text> : null}
              {item.exercise.metric_type === 'strength' ? (
                <>
                  <View style={styles.twoCols}>
                    <Input style={{ flex: 1 }} value={item.sets} onChangeText={(v) => updateBuilder(item.id, { sets: v })} keyboardType="number-pad" placeholder="Sets" />
                    <Input style={{ flex: 1 }} value={item.reps} onChangeText={(v) => updateBuilder(item.id, { reps: v })} keyboardType="number-pad" placeholder="Reps" />
                  </View>
                  <Input value={item.weight} onChangeText={(v) => updateBuilder(item.id, { weight: v })} keyboardType="decimal-pad" placeholder="Weight used (kg)" />
                </>
              ) : item.exercise.metric_type === 'distance' ? (
                <>
                  <View style={styles.twoCols}>
                    <Input style={{ flex: 1 }} value={item.distance} onChangeText={(v) => updateBuilder(item.id, { distance: v })} keyboardType="decimal-pad" placeholder="Distance (km)" />
                    <Input style={{ flex: 1 }} value={item.duration} onChangeText={(v) => updateBuilder(item.id, { duration: v })} keyboardType="decimal-pad" placeholder="Minutes" />
                  </View>
                </>
              ) : (
                <Input value={item.duration} onChangeText={(v) => updateBuilder(item.id, { duration: v })} keyboardType="decimal-pad" placeholder="Minutes" />
              )}
            </View>
          ))}
          <Button title={busy ? 'Saving workout…' : 'Complete workout'} onPress={finishWorkout} disabled={busy} />
        </Card>

        <Card>
          <SectionTitle title="Find exercises" subtitle="Filter by muscle group or section, then tap an exercise to add it to the workout." />
          <Input value={query} onChangeText={setQuery} placeholder="Search exercises…" />
          <Text style={styles.filterLabel}>Muscle group</Text>
          <View style={styles.chips}>{muscleGroupFilters.map((group) => <Chip key={group} label={group} active={muscleFilter === group} onPress={() => setMuscleFilter(group)} />)}</View>
          <Text style={styles.filterLabel}>Section</Text>
          <View style={styles.chips}>{sectionFilters.map((group) => <Chip key={group} label={group} active={sectionFilter === group} onPress={() => setSectionFilter(group)} />)}</View>
        </Card>

        <SectionTitle title="Exercise list" subtitle={`${filtered.length} exercise${filtered.length === 1 ? '' : 's'} available`} />
        <View style={styles.listWrap}>
          {visibleExercises.map((exercise) => {
            const imageSource = exercise.visualKey ? figureImages[exercise.visualKey] : undefined;
            return (
              <Pressable key={exercise.slug} onPress={() => addExercise(exercise)} style={({ pressed }) => [styles.listItem, pressed && { opacity: 0.85 }]}>
                {imageSource ? <Image source={imageSource} style={styles.thumb} /> : <View style={styles.thumbBlank} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>{exercise.targetArea} • {exercise.section} • {exercise.subsection}</Text>
                  <Text style={styles.exerciseMeta}>{summarizeTargets(exercise)} • {exercise.equipment}</Text>
                </View>
                <View style={styles.pill}><Text style={styles.pillText}>{exercise.metric_type === 'strength' ? 'SETS' : exercise.metric_type === 'distance' ? 'DISTANCE' : 'TIME'}</Text></View>
              </Pressable>
            );
          })}
          {!showAll && filtered.length > 50 ? <Button title={`Show ${filtered.length - 50} more exercises`} onPress={() => setShowAll(true)} secondary /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 36 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  sub: { color: colors.muted, marginTop: 4, marginBottom: 14, lineHeight: 19 },
  emptyText: { color: colors.muted },
  builderCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: '#051124', padding: 12, marginBottom: 10 },
  builderHeader: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  builderName: { color: colors.text, fontWeight: '900', fontSize: 15 },
  builderMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  removeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  removeText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  suggestion: { color: '#b8dffe', backgroundColor: '#0b2b3e', borderColor: '#176078', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10, fontSize: 12, lineHeight: 18 },
  twoCols: { flexDirection: 'row', gap: 8 },
  filterLabel: { color: colors.text, fontWeight: '800', marginTop: 6, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  listWrap: { gap: 10 },
  listItem: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 10 },
  thumb: { width: 78, height: 78, borderRadius: 14, resizeMode: 'cover' },
  thumbBlank: { width: 78, height: 78, borderRadius: 14, backgroundColor: '#061124', borderWidth: 1, borderColor: colors.border },
  exerciseName: { color: colors.text, fontWeight: '900', fontSize: 14 },
  exerciseMeta: { color: colors.muted, fontSize: 11, marginTop: 3, lineHeight: 15 },
  pill: { alignSelf: 'flex-start', backgroundColor: '#0a2444', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: '#1d6b9c' },
  pillText: { color: colors.cyan, fontWeight: '900', fontSize: 9 },
});
