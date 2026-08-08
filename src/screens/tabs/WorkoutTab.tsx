import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Input, SectionTitle, colors } from '../../components/UI';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { progressionSuggestion } from '../../lib/progression';
import { recordWorkoutDay } from '../../lib/streaks';
import { exerciseLibrary, figureImages, LibraryExercise, muscleCards, muscleGroupFilters, sectionFilters, summarizeTargets } from '../../data/exerciseLibrary';

type StrengthSet = { id: string; weight: string; reps: string };
type BuilderItem = {
  id: string;
  exercise: LibraryExercise;
  strengthSets: StrengthSet[];
  distance: string;
  duration: string;
  load: string;
  suggestion?: string;
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function makeStrengthSets(exercise: LibraryExercise, count = 3): StrengthSet[] {
  const reps = String(exercise.rep_max ? Math.min(10, exercise.rep_max) : 10);
  return Array.from({ length: count }, () => ({ id: makeId(), weight: '', reps }));
}

function newBuilder(exercise: LibraryExercise): BuilderItem {
  return {
    id: `${exercise.slug}-${makeId()}`,
    exercise,
    strengthSets: exercise.metric_type === 'strength' ? makeStrengthSets(exercise) : [],
    distance: '', duration: '', load: '',
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
      return `${ex.name} ${ex.targetArea} ${ex.subsection} ${ex.section} ${ex.equipment}`.toLowerCase().includes(q);
    });
  }, [query, muscleFilter, sectionFilter]);

  const visibleExercises = showAll ? filtered : filtered.slice(0, 45);

  const addExercise = async (exercise: LibraryExercise) => {
    if (builder.some((x) => x.exercise.slug === exercise.slug)) {
      return Alert.alert('Already added', `${exercise.name} is already in your current workout.`);
    }
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

  const updateStrengthSet = (itemId: string, setId: string, patch: Partial<StrengthSet>) => {
    setBuilder((prev) => prev.map((item) => item.id !== itemId ? item : {
      ...item,
      strengthSets: item.strengthSets.map((set) => set.id === setId ? { ...set, ...patch } : set)
    }));
  };

  const addSet = (itemId: string) => {
    setBuilder((prev) => prev.map((item) => {
      if (item.id !== itemId) return item;
      const previous = item.strengthSets[item.strengthSets.length - 1];
      return { ...item, strengthSets: [...item.strengthSets, { id: makeId(), weight: previous?.weight ?? '', reps: previous?.reps ?? '10' }] };
    }));
  };

  const removeSet = (itemId: string, setId: string) => {
    setBuilder((prev) => prev.map((item) => item.id !== itemId ? item : {
      ...item,
      strengthSets: item.strengthSets.length <= 1 ? item.strengthSets : item.strengthSets.filter((set) => set.id !== setId)
    }));
  };

  const removeExercise = (id: string) => setBuilder((prev) => prev.filter((x) => x.id !== id));

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
        .select('exercise_name,set_number,weight_kg,reps,distance_km,duration_min')
        .eq('session_id', session.id)
        .order('set_number', { ascending: true });
      if (!sets?.length) return setLastWorkout([]);

      const byExercise = new Map<string, any[]>();
      sets.forEach((row: any) => {
        const rows = byExercise.get(row.exercise_name) ?? [];
        rows.push(row);
        byExercise.set(row.exercise_name, rows);
      });

      const template: BuilderItem[] = [];
      for (const [exerciseName, rows] of byExercise.entries()) {
        const exercise = exerciseLibrary.find((x) => x.name === exerciseName);
        if (!exercise) continue;
        const first = rows[0];
        template.push({
          id: `${exercise.slug}-${makeId()}`,
          exercise,
          strengthSets: exercise.metric_type === 'strength' ? rows.map((row) => ({ id: makeId(), weight: row.weight_kg == null ? '' : String(row.weight_kg), reps: row.reps == null ? '' : String(row.reps) })) : [],
          distance: first?.distance_km == null ? '' : String(first.distance_km),
          duration: first?.duration_min == null ? '' : String(first.duration_min),
          load: exercise.allowsLoad && first?.weight_kg != null ? String(first.weight_kg) : '',
        });
      }
      setLastWorkout(template);
    };
    fetchLastWorkout();
  }, [profile.id]);

  const repeatLastWorkout = () => {
    if (!lastWorkout.length) return;
    setBuilder(lastWorkout.map((item) => ({
      ...item,
      id: `${item.exercise.slug}-${makeId()}`,
      strengthSets: item.strengthSets.map((set) => ({ ...set, id: makeId() })),
    })));
  };

  const finishWorkout = async () => {
    if (!builder.length) return Alert.alert('Add exercises', 'Choose at least one exercise before completing your workout.');

    for (const item of builder) {
      if (item.exercise.metric_type === 'strength') {
        for (const [index, set] of item.strengthSets.entries()) {
          if (!set.reps || Number(set.reps) <= 0) return Alert.alert('Missing reps', `Enter reps for ${item.exercise.name}, set ${index + 1}.`);
          if (set.weight !== '' && Number(set.weight) < 0) return Alert.alert('Check weight', `Check the weight for ${item.exercise.name}.`);
        }
      } else if (item.exercise.metric_type === 'distance' && !item.distance && !item.duration) {
        return Alert.alert('Missing distance or time', `Enter a distance or duration for ${item.exercise.name}.`);
      } else if (item.exercise.metric_type === 'time' && !item.duration) {
        return Alert.alert('Missing duration', `Enter the duration for ${item.exercise.name}.`);
      }
    }

    setBusy(true);
    try {
      const summary = builder.map((x) => x.exercise.name).join(', ');
      const { data: session, error } = await supabase
        .from('workout_sessions')
        .insert({ user_id: profile.id, completed: true, ended_at: new Date().toISOString(), summary })
        .select('id')
        .single();
      if (error) throw error;

      const rows: any[] = [];
      builder.forEach((item) => {
        if (item.exercise.metric_type === 'strength') {
          item.strengthSets.forEach((set, index) => rows.push({
            session_id: session.id, user_id: profile.id, exercise_id: null, exercise_name: item.exercise.name,
            set_number: index + 1, weight_kg: set.weight === '' ? 0 : Number(set.weight), reps: Number(set.reps), distance_km: null, duration_min: null
          }));
        } else {
          rows.push({
            session_id: session.id, user_id: profile.id, exercise_id: null, exercise_name: item.exercise.name, set_number: 1,
            weight_kg: item.exercise.allowsLoad && item.load !== '' ? Number(item.load) : null,
            reps: null, distance_km: item.distance ? Number(item.distance) : null, duration_min: item.duration ? Number(item.duration) : null
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
      Alert.alert('Workout complete', 'Saved ✓  Your last workout is ready to repeat next time.');
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
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>WORKOUT</Text>
            <Text style={styles.title}>Build your session</Text>
            <Text style={styles.sub}>Pick a muscle group, add several exercises, then log every set before completing the session.</Text>
          </View>
          <View style={styles.headerIcon}><Image source={require('../../../assets/nav/workout.png')} style={styles.headerIconImage} /></View>
        </View>

        <Card style={styles.currentCard}>
          <View style={styles.cardTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardKicker}>CURRENT WORKOUT</Text>
              <Text style={styles.currentTitle}>{builder.length ? `${builder.length} exercise${builder.length === 1 ? '' : 's'} selected` : 'Start building'}</Text>
            </View>
            {lastWorkout.length ? <Pressable onPress={repeatLastWorkout} style={styles.repeatButton}><Text style={styles.repeatGlyph}>↻</Text><Text style={styles.repeatText}>Repeat workout</Text></Pressable> : null}
          </View>

          {!builder.length ? <Text style={styles.emptyText}>Add exercises from the list below. Your set details will appear here.</Text> : null}

          {builder.map((item, itemIndex) => {
            const image = item.exercise.visualKey ? figureImages[item.exercise.visualKey] : undefined;
            return (
              <View key={item.id} style={styles.builderItem}>
                <View style={styles.builderTop}>
                  {image ? <Image source={image} style={styles.builderThumb} /> : <View style={styles.blankBuilderThumb} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseTitle}>{item.exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>{item.exercise.targetArea} • {item.exercise.subsection}</Text>
                    <Text style={styles.exerciseMeta}>{item.exercise.equipment}</Text>
                  </View>
                  <Pressable onPress={() => removeExercise(item.id)} style={styles.iconButton}><Text style={styles.iconGlyph}>×</Text></Pressable>
                </View>

                {item.suggestion ? <View style={styles.progressionBox}><Text style={styles.progressionLabel}>NEXT SESSION</Text><Text style={styles.progressionText}>{item.suggestion}</Text></View> : null}

                {item.exercise.metric_type === 'strength' ? (
                  <View>
                    <View style={styles.setHeader}><Text style={[styles.setHeaderText,{ width: 38 }]}>SET</Text><Text style={[styles.setHeaderText,{ flex: 1 }]}>WEIGHT KG</Text><Text style={[styles.setHeaderText,{ flex: 1 }]}>REPS</Text><View style={{ width: 34 }} /></View>
                    {item.strengthSets.map((set, setIndex) => (
                      <View key={set.id} style={styles.setRow}>
                        <View style={styles.setNumber}><Text style={styles.setNumberText}>{setIndex + 1}</Text></View>
                        <Input style={styles.setInput} value={set.weight} onChangeText={(v) => updateStrengthSet(item.id, set.id, { weight: v })} keyboardType="decimal-pad" placeholder={item.exercise.equipment === 'Bodyweight' ? '0' : 'kg'} />
                        <Input style={styles.setInput} value={set.reps} onChangeText={(v) => updateStrengthSet(item.id, set.id, { reps: v })} keyboardType="number-pad" placeholder="reps" />
                        <Pressable onPress={() => removeSet(item.id, set.id)} style={styles.removeSet}><Text style={styles.minusGlyph}>−</Text></Pressable>
                      </View>
                    ))}
                    <Pressable onPress={() => addSet(item.id)} style={styles.addSet}><Text style={styles.plusGlyph}>＋</Text><Text style={styles.addSetText}>Add set</Text></Pressable>
                  </View>
                ) : (
                  <View>
                    {item.exercise.allowsLoad ? <Input value={item.load} onChangeText={(v) => updateBuilder(item.id, { load: v })} keyboardType="decimal-pad" placeholder="Load used (kg)" /> : null}
                    <View style={styles.twoCols}>
                      {item.exercise.metric_type === 'distance' ? <Input style={{ flex: 1 }} value={item.distance} onChangeText={(v) => updateBuilder(item.id, { distance: v })} keyboardType="decimal-pad" placeholder="Distance (km)" /> : null}
                      <Input style={{ flex: 1 }} value={item.duration} onChangeText={(v) => updateBuilder(item.id, { duration: v })} keyboardType="decimal-pad" placeholder="Duration (min)" />
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          <Button title={busy ? 'Saving workout…' : 'Complete workout'} onPress={finishWorkout} disabled={busy} />
        </Card>

        <SectionTitle title="Target a muscle group" subtitle="Tap a body area to filter the exercise list." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.muscleScroller}>
          <Pressable onPress={() => setMuscleFilter('All')} style={[styles.muscleCard, muscleFilter === 'All' && styles.muscleCardActive]}>
            <View style={styles.allMuscleIcon}><Text style={[styles.humanGlyph, { color: muscleFilter === 'All' ? colors.primary : colors.muted }]}>◎</Text></View>
            <Text style={[styles.muscleLabel, muscleFilter === 'All' && styles.muscleLabelActive]}>All</Text>
          </Pressable>
          {muscleCards.map((card) => (
            <Pressable key={card.label} onPress={() => setMuscleFilter(card.label as any)} style={[styles.muscleCard, muscleFilter === card.label && styles.muscleCardActive]}>
              <Image source={card.image} style={styles.muscleImage} />
              <Text style={[styles.muscleLabel, muscleFilter === card.label && styles.muscleLabelActive]}>{card.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Card>
          <Input value={query} onChangeText={setQuery} placeholder="Search exercises or equipment…" />
          <Text style={styles.filterTitle}>Exercise type</Text>
          <View style={styles.chips}>{sectionFilters.map((section) => <Chip key={section} label={section} active={sectionFilter === section} onPress={() => setSectionFilter(section)} />)}</View>
        </Card>

        <View style={styles.listHeading}>
          <View><Text style={styles.listTitle}>Exercises</Text><Text style={styles.listSub}>{filtered.length} matching exercise{filtered.length === 1 ? '' : 's'}</Text></View>
          <Pressable onPress={() => { setQuery(''); setSectionFilter('All'); setMuscleFilter('All'); }}><Text style={styles.clearText}>Clear filters</Text></Pressable>
        </View>

        <View style={styles.listWrap}>
          {visibleExercises.map((exercise) => {
            const image = exercise.visualKey ? figureImages[exercise.visualKey] : undefined;
            const selected = builder.some((x) => x.exercise.slug === exercise.slug);
            return (
              <Pressable key={exercise.slug} onPress={() => addExercise(exercise)} style={({ pressed }) => [styles.exerciseRow, pressed && { opacity: .84 }]}>
                {image ? <Image source={image} style={styles.exerciseThumb} /> : <View style={styles.exerciseThumbBlank} />}
                <View style={{ flex: 1 }}>
                  <View style={styles.targetTag}><Text style={styles.targetTagText}>{exercise.targetArea.toUpperCase()}</Text></View>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseInfo}>{summarizeTargets(exercise)} • {exercise.equipment}</Text>
                  <Text style={styles.exerciseInfo}>{exercise.metric_type === 'strength' ? `${exercise.rep_min ?? 6}-${exercise.rep_max ?? 12} rep guidance` : exercise.metric_type === 'distance' ? 'Distance / time' : 'Timed movement'}</Text>
                </View>
                <View style={[styles.addCircle, selected && styles.addCircleSelected]}>
                  <Text style={styles.addCircleText}>{selected ? '✓' : '+'}</Text>
                </View>
              </Pressable>
            );
          })}
          {!visibleExercises.length ? <Text style={styles.emptySearch}>No exercises match those filters.</Text> : null}
          {!showAll && filtered.length > 45 ? <Button title={`Show ${filtered.length - 45} more exercises`} onPress={() => setShowAll(true)} secondary /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 38 },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  kicker: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 2, letterSpacing: -.5 },
  sub: { color: colors.muted, lineHeight: 19, marginTop: 5 },
  headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  headerIconImage: { width: 26, height: 26, tintColor: '#FFFFFF', resizeMode: 'contain' },
  repeatGlyph: { color: colors.blue, fontWeight: '900', fontSize: 18 },
  iconGlyph: { color: colors.muted, fontWeight: '500', fontSize: 23, lineHeight: 24 },
  minusGlyph: { color: colors.muted, fontWeight: '900', fontSize: 24, lineHeight: 24 },
  plusGlyph: { color: colors.primary, fontWeight: '900', fontSize: 18 },
  humanGlyph: { fontSize: 34, fontWeight: '900' },
  addCircleText: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  currentCard: { borderColor: colors.primary },
  cardTitleRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  cardKicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  currentTitle: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 2 },
  repeatButton: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  repeatText: { color: colors.blue, fontSize: 11, fontWeight: '900' },
  emptyText: { color: colors.muted, marginVertical: 8 },
  builderItem: { backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 12, marginBottom: 10 },
  builderTop: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 },
  builderThumb: { width: 58, height: 58, borderRadius: 12, resizeMode: 'cover' },
  blankBuilderThumb: { width: 58, height: 58, borderRadius: 12, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border },
  exerciseTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  exerciseMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  iconButton: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  progressionBox: { backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: colors.blue, borderRadius: 12, padding: 10, marginBottom: 10 },
  progressionLabel: { color: colors.blue, fontWeight: '900', fontSize: 9, letterSpacing: 1 },
  progressionText: { color: colors.text, fontSize: 12, lineHeight: 17, marginTop: 3 },
  setHeader: { flexDirection: 'row', gap: 7, alignItems: 'center', marginBottom: 4 },
  setHeaderText: { color: colors.muted, fontWeight: '900', fontSize: 9, letterSpacing: .7 },
  setRow: { flexDirection: 'row', gap: 7, alignItems: 'center', marginBottom: 5 },
  setNumber: { width: 38, height: 44, borderRadius: 11, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  setNumberText: { color: colors.text, fontWeight: '900' },
  setInput: { flex: 1, marginBottom: 0, minHeight: 44 },
  removeSet: { width: 34, alignItems: 'center' },
  addSet: { flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 7 },
  addSetText: { color: colors.primary, fontWeight: '900', fontSize: 12 },
  twoCols: { flexDirection: 'row', gap: 8 },
  muscleScroller: { gap: 9, paddingBottom: 14 },
  muscleCard: { width: 96, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 7, alignItems: 'center' },
  muscleCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  muscleImage: { width: 80, height: 80, borderRadius: 12, resizeMode: 'cover' },
  allMuscleIcon: { width: 80, height: 80, borderRadius: 12, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' },
  muscleLabel: { color: colors.muted, fontWeight: '800', fontSize: 11, marginTop: 6 },
  muscleLabelActive: { color: colors.primary },
  filterTitle: { color: colors.text, fontWeight: '900', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  listHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4, marginBottom: 10 },
  listTitle: { color: colors.text, fontSize: 21, fontWeight: '900' },
  listSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  clearText: { color: colors.blue, fontSize: 11, fontWeight: '900' },
  listWrap: { gap: 9 },
  exerciseRow: { flexDirection: 'row', gap: 11, alignItems: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 10 },
  exerciseThumb: { width: 76, height: 76, borderRadius: 13, resizeMode: 'cover' },
  exerciseThumbBlank: { width: 76, height: 76, borderRadius: 13, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
  targetTag: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 4 },
  targetTagText: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  exerciseName: { color: colors.text, fontWeight: '900', fontSize: 14 },
  exerciseInfo: { color: colors.muted, fontSize: 10.5, marginTop: 2, lineHeight: 14 },
  addCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addCircleSelected: { backgroundColor: colors.green },
  emptySearch: { color: colors.muted, textAlign: 'center', paddingVertical: 24 }
});
