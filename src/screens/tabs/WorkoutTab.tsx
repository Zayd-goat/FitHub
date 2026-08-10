import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, Input, OutlineButton, useTheme } from '../../components/UI';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { progressionSuggestion } from '../../lib/progression';
import { recordWorkoutDay } from '../../lib/streaks';
import {
  exerciseLibrary,
  figureImages,
  LibraryExercise,
  muscleCards,
  muscleGroupFilters,
  summarizeTargets,
} from '../../data/exerciseLibrary';

type StrengthSet = { id: string; weight: string; reps: string; done: boolean };
type BuilderItem = {
  id: string;
  exercise: LibraryExercise;
  strengthSets: StrengthSet[];
  distance: string;
  duration: string;
  load: string;
  done: boolean;
  suggestion?: string;
};
type ScreenMode = 'browse' | 'detail' | 'active';
type DetailTab = 'sets' | 'about';
type SavedPlanItem = {
  exercise_slug: string;
  exercise_name: string;
  strength_sets: Array<{ weight: string; reps: string }>;
  distance: string;
  duration: string;
  load: string;
};
type SavedWorkout = {
  id: string;
  name: string;
  plan: SavedPlanItem[];
  created_at: string;
  updated_at: string;
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const makeSets = (ex: LibraryExercise, count = 3): StrengthSet[] =>
  Array.from({ length: count }, () => ({
    id: makeId(),
    weight: '',
    reps: String(ex.rep_max ? Math.min(10, ex.rep_max) : 10),
    done: false,
  }));
const makeItem = (ex: LibraryExercise): BuilderItem => ({
  id: `${ex.slug}-${makeId()}`,
  exercise: ex,
  strengthSets: ex.metric_type === 'strength' ? makeSets(ex) : [],
  distance: '',
  duration: '',
  load: '',
  done: false,
});
const formatTime = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

const serializeBuilder = (items: BuilderItem[]): SavedPlanItem[] =>
  items.map((item) => ({
    exercise_slug: item.exercise.slug,
    exercise_name: item.exercise.name,
    strength_sets: item.strengthSets.map((set) => ({ weight: set.weight, reps: set.reps })),
    distance: item.distance,
    duration: item.duration,
    load: item.load,
  }));

const hydratePlan = (plan: SavedPlanItem[]): BuilderItem[] => {
  const hydrated: BuilderItem[] = [];
  for (const saved of plan ?? []) {
    const ex =
      exerciseLibrary.find((item) => item.slug === saved.exercise_slug) ??
      exerciseLibrary.find((item) => item.name === saved.exercise_name);
    if (!ex) continue;
    hydrated.push({
      id: `${ex.slug}-${makeId()}`,
      exercise: ex,
      strengthSets:
        ex.metric_type === 'strength'
          ? (saved.strength_sets?.length ? saved.strength_sets : [{ weight: '', reps: '10' }]).map((set) => ({
              id: makeId(),
              weight: set.weight ?? '',
              reps: set.reps ?? '10',
              done: false,
            }))
          : [],
      distance: saved.distance ?? '',
      duration: saved.duration ?? '',
      load: saved.load ?? '',
      done: false,
    });
  }
  return hydrated;
};

export default function WorkoutTab({
  profile,
  onProfileChanged,
}: {
  profile: Profile;
  onProfileChanged: () => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [screen, setScreen] = useState<ScreenMode>('browse');
  const [detailTab, setDetailTab] = useState<DetailTab>('sets');
  const [detailExercise, setDetailExercise] = useState<LibraryExercise | null>(null);
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<(typeof muscleGroupFilters)[number]>('All');
  const [builder, setBuilder] = useState<BuilderItem[]>([]);
  const [lastWorkout, setLastWorkout] = useState<BuilderItem[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exerciseLibrary.filter(
      (ex) =>
        (muscleFilter === 'All' || ex.targetArea === muscleFilter) &&
        (!q || `${ex.name} ${ex.targetArea} ${ex.subsection} ${ex.equipment}`.toLowerCase().includes(q)),
    );
  }, [query, muscleFilter]);

  const pickerExercises = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return exerciseLibrary.filter(
      (ex) => !q || `${ex.name} ${ex.targetArea} ${ex.subsection} ${ex.equipment}`.toLowerCase().includes(q),
    );
  }, [pickerQuery]);

  const itemDone = (item: BuilderItem) =>
    item.exercise.metric_type === 'strength'
      ? item.strengthSets.length > 0 && item.strengthSets.every((set) => set.done)
      : item.done;
  const allComplete = builder.length > 0 && builder.every(itemDone);

  const loadSavedWorkouts = async () => {
    const { data, error } = await supabase
      .from('workout_templates')
      .select('id,name,plan,created_at,updated_at')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false });
    if (!error) setSavedWorkouts((data ?? []) as SavedWorkout[]);
  };

  useEffect(() => {
    const loadLast = async () => {
      const { data: session } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('completed', true)
        .order('ended_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!session?.id) return;
      const { data: sets } = await supabase
        .from('workout_sets')
        .select('exercise_name,set_number,weight_kg,reps,distance_km,duration_min')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });
      if (!sets?.length) return;
      const map = new Map<string, any[]>();
      for (const row of sets) {
        const rows = map.get(row.exercise_name) ?? [];
        rows.push(row);
        map.set(row.exercise_name, rows);
      }
      const template: BuilderItem[] = [];
      for (const [name, rows] of map.entries()) {
        const ex = exerciseLibrary.find((item) => item.name === name);
        if (!ex) continue;
        template.push({
          id: `${ex.slug}-${makeId()}`,
          exercise: ex,
          strengthSets:
            ex.metric_type === 'strength'
              ? rows.map((row) => ({
                  id: makeId(),
                  weight: row.weight_kg == null ? '' : String(row.weight_kg),
                  reps: row.reps == null ? '' : String(row.reps),
                  done: false,
                }))
              : [],
          distance: rows[0]?.distance_km == null ? '' : String(rows[0].distance_km),
          duration: rows[0]?.duration_min == null ? '' : String(rows[0].duration_min),
          load: rows[0]?.weight_kg == null ? '' : String(rows[0].weight_kg),
          done: false,
        });
      }
      setLastWorkout(template);
    };
    loadLast();
    loadSavedWorkouts();
  }, [profile.id]);

  useEffect(() => {
    if (screen !== 'active' || !activeStartedAt) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - activeStartedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [screen, activeStartedAt]);

  useEffect(() => {
    if (restSeconds <= 0) return;
    const id = setInterval(() => setRestSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(id);
  }, [restSeconds]);

  const getItem = (ex: LibraryExercise | null) =>
    ex ? builder.find((item) => item.exercise.slug === ex.slug) : undefined;

  const createExerciseItem = async (ex: LibraryExercise) => {
    const item = makeItem(ex);
    if (ex.metric_type === 'strength') {
      const { data } = await supabase
        .from('workout_sets')
        .select('weight_kg,reps,created_at')
        .eq('user_id', profile.id)
        .eq('exercise_name', ex.name)
        .not('weight_kg', 'is', null)
        .order('created_at', { ascending: false })
        .limit(2);
      if (data?.length) {
        item.suggestion =
          (profile.age ?? 18) < 18
            ? 'Focus on consistent technique and age-appropriate coaching rather than automatically increasing load.'
            : progressionSuggestion(
                [...data].reverse().map((row: any) => ({
                  weight_kg: Number(row.weight_kg),
                  reps: Number(row.reps),
                })),
                ex.rep_min ?? 8,
                ex.rep_max ?? 12,
              );
      }
    }
    return item;
  };

  const addExercise = async (ex: LibraryExercise) => {
    let item = builder.find((entry) => entry.exercise.slug === ex.slug);
    if (!item) {
      item = await createExerciseItem(ex);
      setBuilder((previous) => [...previous, item!]);
    }
    setDetailExercise(ex);
    setDetailTab('sets');
    setScreen('detail');
  };

  const addExerciseDuringWorkout = async (ex: LibraryExercise) => {
    const existingIndex = builder.findIndex((entry) => entry.exercise.slug === ex.slug);
    if (existingIndex >= 0) {
      setActiveExerciseIndex(existingIndex);
      setShowExercisePicker(false);
      setPickerQuery('');
      return;
    }
    const item = await createExerciseItem(ex);
    setBuilder((previous) => [...previous, item]);
    setActiveExerciseIndex(builder.length);
    setShowExercisePicker(false);
    setPickerQuery('');
  };

  const removeExercise = (slug: string) => setBuilder((previous) => previous.filter((item) => item.exercise.slug !== slug));
  const updateItem = (id: string, patch: Partial<BuilderItem>) =>
    setBuilder((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const updateSet = (itemId: string, setId: string, patch: Partial<StrengthSet>) =>
    setBuilder((previous) =>
      previous.map((item) =>
        item.id === itemId
          ? {
              ...item,
              strengthSets: item.strengthSets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
            }
          : item,
      ),
    );
  const addSet = (itemId: string) =>
    setBuilder((previous) =>
      previous.map((item) =>
        item.id === itemId
          ? {
              ...item,
              strengthSets: [
                ...item.strengthSets,
                {
                  id: makeId(),
                  weight: item.strengthSets.at(-1)?.weight ?? '',
                  reps: item.strengthSets.at(-1)?.reps ?? '10',
                  done: false,
                },
              ],
            }
          : item,
      ),
    );
  const removeSet = (itemId: string, setId: string) =>
    setBuilder((previous) =>
      previous.map((item) =>
        item.id === itemId && item.strengthSets.length > 1
          ? { ...item, strengthSets: item.strengthSets.filter((set) => set.id !== setId) }
          : item,
      ),
    );

  const removeActiveExercise = (item: BuilderItem) => {
    if (builder.length <= 1) {
      Alert.alert('Keep one exercise', 'Add another exercise before removing the only exercise in this workout.');
      return;
    }
    Alert.alert('Remove exercise?', `${item.exercise.name} will be removed from this active workout.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const index = builder.findIndex((entry) => entry.id === item.id);
          setBuilder((previous) => previous.filter((entry) => entry.id !== item.id));
          setActiveExerciseIndex(Math.max(0, Math.min(index, builder.length - 2)));
        },
      },
    ]);
  };

  const repeatLast = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setBuilder(
      lastWorkout.map((item) => ({
        ...item,
        id: `${item.exercise.slug}-${makeId()}`,
        done: false,
        strengthSets: item.strengthSets.map((set) => ({ ...set, id: makeId(), done: false })),
      })),
    );
  };

  const validateForStart = (items: BuilderItem[]) => {
    if (!items.length) {
      Alert.alert('Add exercises', 'Choose at least one exercise first.');
      return false;
    }
    for (const item of items) {
      if (item.exercise.metric_type === 'strength') {
        if (!item.strengthSets.length) {
          Alert.alert('Add a set', `Add at least one set for ${item.exercise.name}.`);
          return false;
        }
        for (const set of item.strengthSets) {
          if (!set.reps || Number(set.reps) <= 0) {
            Alert.alert('Check reps', `Enter reps for ${item.exercise.name}.`);
            return false;
          }
        }
      }
    }
    return true;
  };

  const beginWorkout = (items: BuilderItem[]) => {
    if (!validateForStart(items)) return;
    const reset = items.map((item) => ({
      ...item,
      done: false,
      strengthSets: item.strengthSets.map((set) => ({ ...set, done: false })),
    }));
    setBuilder(reset);
    setActiveExerciseIndex(0);
    setElapsed(0);
    setRestSeconds(0);
    setActiveStartedAt(Date.now());
    setScreen('active');
  };

  const startWorkout = () => beginWorkout(builder);

  const toggleSet = (item: BuilderItem, set: StrengthSet) => {
    if (!set.done && (!set.reps || Number(set.reps) <= 0)) {
      Alert.alert('Enter reps', 'Add the reps for this set before marking it complete.');
      return;
    }
    updateSet(item.id, set.id, { done: !set.done });
    if (!set.done) setRestSeconds(90);
  };

  const completeCardio = (item: BuilderItem) => {
    if (item.exercise.metric_type === 'distance' && !item.distance && !item.duration) {
      Alert.alert('Add distance or time', 'Enter what you completed first.');
      return;
    }
    if (item.exercise.metric_type === 'time' && !item.duration) {
      Alert.alert('Add duration', 'Enter what you completed first.');
      return;
    }
    updateItem(item.id, { done: !item.done });
    if (!item.done) setRestSeconds(90);
  };

  const nextIncomplete = () => {
    if (!builder.length) return;
    for (let offset = 1; offset <= builder.length; offset += 1) {
      const index = (activeExerciseIndex + offset) % builder.length;
      if (!itemDone(builder[index])) {
        setActiveExerciseIndex(index);
        return;
      }
    }
  };

  const openSaveForm = () => {
    if (!builder.length) {
      Alert.alert('Add exercises first', 'Create the workout you want to save, then save it for later.');
      return;
    }
    if (!templateName.trim()) setTemplateName(`Workout ${savedWorkouts.length + 1}`);
    setShowSaveForm(true);
  };

  const saveTemplate = async () => {
    const name = templateName.trim();
    if (!name) {
      Alert.alert('Name your workout', 'Enter a name such as Push Day or Leg Day.');
      return;
    }
    if (!builder.length) return;
    setBusy(true);
    try {
      const payload = {
        user_id: profile.id,
        name,
        plan: serializeBuilder(builder),
        updated_at: new Date().toISOString(),
      };
      if (editingTemplateId) {
        const { error } = await supabase
          .from('workout_templates')
          .update(payload)
          .eq('id', editingTemplateId)
          .eq('user_id', profile.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('workout_templates')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setEditingTemplateId(data.id);
      }
      setShowSaveForm(false);
      await loadSavedWorkouts();
      Alert.alert('Workout saved', `${name} is ready to start whenever you get to the gym.`);
    } catch (error: any) {
      Alert.alert('Could not save workout', error?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const editSavedWorkout = (saved: SavedWorkout) => {
    setBuilder(hydratePlan(saved.plan));
    setTemplateName(saved.name);
    setEditingTemplateId(saved.id);
    setShowSaveForm(false);
    setScreen('browse');
  };

  const startSavedWorkout = (saved: SavedWorkout) => {
    const items = hydratePlan(saved.plan);
    setEditingTemplateId(saved.id);
    setTemplateName(saved.name);
    beginWorkout(items);
  };

  const deleteSavedWorkout = (saved: SavedWorkout) => {
    Alert.alert('Delete saved workout?', `${saved.name} will be removed from your saved workouts.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('workout_templates')
            .delete()
            .eq('id', saved.id)
            .eq('user_id', profile.id);
          if (error) Alert.alert('Could not delete workout', error.message);
          else {
            if (editingTemplateId === saved.id) {
              setEditingTemplateId(null);
              setTemplateName('');
            }
            loadSavedWorkouts();
          }
        },
      },
    ]);
  };

  const newWorkout = () => {
    setBuilder([]);
    setTemplateName('');
    setEditingTemplateId(null);
    setShowSaveForm(false);
    setScreen('browse');
  };

  const saveWorkout = async () => {
    if (!allComplete) {
      Alert.alert('Workout still in progress', 'Complete every exercise before finishing the workout.');
      return;
    }
    setBusy(true);
    try {
      const summary = builder.map((item) => item.exercise.name).join(', ');
      const { data: session, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: profile.id,
          completed: true,
          started_at: new Date(activeStartedAt ?? Date.now()).toISOString(),
          ended_at: new Date().toISOString(),
          summary,
        })
        .select('id')
        .single();
      if (error) throw error;
      const rows: any[] = [];
      builder.forEach((item) => {
        if (item.exercise.metric_type === 'strength') {
          item.strengthSets.forEach((set, index) =>
            rows.push({
              session_id: session.id,
              user_id: profile.id,
              exercise_id: null,
              exercise_name: item.exercise.name,
              set_number: index + 1,
              weight_kg: set.weight === '' ? 0 : Number(set.weight),
              reps: Number(set.reps),
              distance_km: null,
              duration_min: null,
            }),
          );
        } else {
          rows.push({
            session_id: session.id,
            user_id: profile.id,
            exercise_id: null,
            exercise_name: item.exercise.name,
            set_number: 1,
            weight_kg: item.load ? Number(item.load) : null,
            reps: null,
            distance_km: item.distance ? Number(item.distance) : null,
            duration_min: item.duration ? Number(item.duration) : null,
          });
        }
      });
      const { error: setError } = await supabase.from('workout_sets').insert(rows);
      if (setError) throw setError;
      await supabase.from('workout_posts').insert({ user_id: profile.id, session_id: session.id, summary });
      await recordWorkoutDay(profile.id);
      await supabase.rpc('apply_workout_to_challenges', { p_session_id: session.id });
      setLastWorkout(
        builder.map((item) => ({
          ...item,
          done: false,
          strengthSets: item.strengthSets.map((set) => ({ ...set, done: false })),
        })),
      );
      setBuilder([]);
      setScreen('browse');
      setActiveStartedAt(null);
      setElapsed(0);
      setRestSeconds(0);
      setEditingTemplateId(null);
      setTemplateName('');
      onProfileChanged();
      Alert.alert('Workout complete', 'Saved to your history and shared as a workout post with accepted friends.');
    } catch (error: any) {
      Alert.alert('Could not save workout', error?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (screen === 'detail' && detailExercise) {
    const item = getItem(detailExercise);
    const img = detailExercise.visualKey ? figureImages[detailExercise.visualKey] : undefined;
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={styles.detailHeader}>
            <Pressable onPress={() => setScreen('browse')}><Text style={styles.back}>‹</Text></Pressable>
            <Text style={styles.detailTitle}>{detailExercise.name}</Text>
            <Text style={styles.more}>•••</Text>
          </View>
          <View style={styles.detailHero}>
            {img ? (
              <Image source={img} style={styles.detailFigure} />
            ) : (
              <View style={styles.cardioVisual}><Text style={styles.cardioEmoji}>{detailExercise.icon_emoji || '●'}</Text></View>
            )}
            <View style={styles.muscleBox}>
              <Text style={styles.muscleBoxTitle}>Primary Muscles</Text>
              <Text style={styles.muscleLine}>• {detailExercise.targetArea}</Text>
              <Text style={styles.muscleLine}>• {detailExercise.subsection}</Text>
              <Text style={styles.muscleLine}>• {summarizeTargets(detailExercise)}</Text>
            </View>
          </View>
          <View style={styles.tabs}>
            <Pressable onPress={() => setDetailTab('sets')} style={[styles.tab, detailTab === 'sets' && styles.tabActive]}>
              <Text style={[styles.tabText, detailTab === 'sets' && styles.tabTextActive]}>SETS</Text>
            </Pressable>
            <Pressable onPress={() => setDetailTab('about')} style={[styles.tab, detailTab === 'about' && styles.tabActive]}>
              <Text style={[styles.tabText, detailTab === 'about' && styles.tabTextActive]}>ABOUT</Text>
            </Pressable>
          </View>
          {detailTab === 'about' ? (
            <Card>
              <Text style={styles.aboutLabel}>Target</Text>
              <Text style={styles.aboutText}>{detailExercise.targetArea} • {detailExercise.subsection}</Text>
              <Text style={styles.aboutLabel}>Equipment</Text>
              <Text style={styles.aboutText}>{detailExercise.equipment}</Text>
              <Text style={styles.aboutLabel}>Recording</Text>
              <Text style={styles.aboutText}>
                {detailExercise.metric_type === 'strength'
                  ? 'Sets, weight and reps'
                  : detailExercise.metric_type === 'distance'
                    ? 'Distance and/or duration'
                    : 'Duration'}
              </Text>
            </Card>
          ) : item ? (
            <Card>
              {item.suggestion ? (
                <View style={styles.suggest}>
                  <Text style={styles.suggestTitle}>TRAINING NOTE</Text>
                  <Text style={styles.suggestText}>{item.suggestion}</Text>
                </View>
              ) : null}
              {item.exercise.metric_type === 'strength' ? (
                <>
                  <SetTable
                    item={item}
                    active={false}
                    onSet={(setId, patch) => updateSet(item.id, setId, patch)}
                    onToggle={() => {}}
                    onRemove={(setId) => removeSet(item.id, setId)}
                  />
                  <Button title="＋ ADD SET" onPress={() => addSet(item.id)} />
                </>
              ) : (
                <CardioInputs item={item} onChange={(patch) => updateItem(item.id, patch)} />
              )}
              <View style={styles.detailActions}>
                <OutlineButton title="+ ADD ANOTHER EXERCISE" onPress={() => setScreen('browse')} />
                <Button title="START WORKOUT" onPress={startWorkout} />
              </View>
              <Pressable onPress={() => { removeExercise(item.exercise.slug); setScreen('browse'); }} style={styles.removeExercise}>
                <Text style={styles.removeExerciseText}>Remove from workout</Text>
              </Pressable>
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (screen === 'active') {
    const current = builder[activeExerciseIndex];
    const img = current?.exercise.visualKey ? figureImages[current.exercise.visualKey] : undefined;
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.activeWrap} keyboardShouldPersistTaps="handled">
          <View style={styles.activeHeader}>
            <Pressable
              onPress={() =>
                Alert.alert('Leave workout?', 'Your current workout has not been saved to history yet.', [
                  { text: 'Keep training', style: 'cancel' },
                  { text: 'Leave', style: 'destructive', onPress: () => setScreen('browse') },
                ])
              }
            >
              <Text style={styles.exit}>‹ Exit</Text>
            </Pressable>
            <Text style={styles.activeTitle}>{templateName || 'Workout'}</Text>
            <Pressable onPress={() => setShowExercisePicker(true)}><Text style={styles.activeAdd}>＋</Text></Pressable>
          </View>
          <Text style={styles.timer}>{formatTime(elapsed)}</Text>
          <Text style={styles.timerLabel}>Workout Time</Text>

          <View style={styles.activeEditRow}>
            <OutlineButton title="+ ADD EXERCISE" onPress={() => setShowExercisePicker(true)} compact />
            <Text style={styles.editHint}>You can change sets, reps and weights while training.</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeExercises}>
            {builder.map((item, index) => {
              const done = itemDone(item);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setActiveExerciseIndex(index)}
                  style={[
                    styles.activeExerciseChip,
                    index === activeExerciseIndex && styles.activeExerciseSelected,
                    done && styles.activeExerciseDone,
                  ]}
                >
                  <Text style={[styles.activeExerciseName, done && { opacity: 0.45 }]} numberOfLines={1}>{item.exercise.name}</Text>
                  <Text style={[styles.activeExerciseState, done && { color: colors.green }]}>
                    {done ? '✓ Complete' : index === activeExerciseIndex ? 'Current' : 'Pending'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {current ? (
            <Card style={[styles.liveCard, itemDone(current) && { opacity: 0.72 }]}>
              <View style={styles.liveHero}>
                {img ? (
                  <Image source={img} style={styles.liveFigure} />
                ) : (
                  <View style={styles.liveIconBox}><Text style={styles.liveEmoji}>{current.exercise.icon_emoji || '●'}</Text></View>
                )}
                <View style={styles.liveMuscles}>
                  <Text style={styles.liveName}>{current.exercise.name}</Text>
                  <Text style={styles.primaryLabel}>PRIMARY MUSCLES</Text>
                  <Text style={styles.liveMeta}>{current.exercise.targetArea}</Text>
                  <Text style={styles.liveMeta}>{current.exercise.subsection}</Text>
                </View>
              </View>
              {current.exercise.metric_type === 'strength' ? (
                <>
                  <SetTable
                    item={current}
                    active
                    onSet={(setId, patch) => updateSet(current.id, setId, patch)}
                    onToggle={(setId) => {
                      const set = current.strengthSets.find((entry) => entry.id === setId);
                      if (set) toggleSet(current, set);
                    }}
                    onRemove={(setId) => removeSet(current.id, setId)}
                  />
                  <Button title="＋ ADD SET" onPress={() => addSet(current.id)} />
                </>
              ) : (
                <>
                  <CardioInputs item={current} onChange={(patch) => updateItem(current.id, patch)} />
                  <Button
                    title={current.done ? 'MARK INCOMPLETE' : 'COMPLETE EXERCISE  ✓'}
                    onPress={() => completeCardio(current)}
                    secondary={current.done}
                  />
                </>
              )}
              <Pressable onPress={() => removeActiveExercise(current)} style={styles.activeRemoveExercise}>
                <Text style={styles.activeRemoveExerciseText}>Remove exercise from this workout</Text>
              </Pressable>
            </Card>
          ) : null}

          {restSeconds > 0 ? (
            <View style={styles.restBanner}>
              <View>
                <Text style={styles.restLabel}>REST TIMER</Text>
                <Text style={styles.restTime}>{formatTime(restSeconds)}</Text>
              </View>
              <Pressable onPress={() => setRestSeconds(0)} style={styles.skip}>
                <Text style={styles.skipText}>Skip rest</Text>
              </Pressable>
            </View>
          ) : null}
          {!allComplete ? <OutlineButton title="NEXT UNFINISHED EXERCISE" onPress={nextIncomplete} /> : null}
          <Button
            title={busy ? 'SAVING…' : allComplete ? 'FINISH WORKOUT  ✓' : 'FINISH WORKOUT'}
            onPress={saveWorkout}
            disabled={busy || !allComplete}
          />
        </ScrollView>

        <Modal visible={showExercisePicker} animationType="slide" transparent onRequestClose={() => setShowExercisePicker(false)}>
          <View style={styles.modalShade}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <View>
                  <Text style={styles.pickerTitle}>Add exercise</Text>
                  <Text style={styles.pickerSubtitle}>Your workout timer keeps running.</Text>
                </View>
                <Pressable onPress={() => setShowExercisePicker(false)}><Text style={styles.pickerClose}>×</Text></Pressable>
              </View>
              <Input value={pickerQuery} onChangeText={setPickerQuery} placeholder="Search exercises…" />
              <ScrollView keyboardShouldPersistTaps="handled">
                {pickerExercises.map((ex) => {
                  const existing = builder.some((item) => item.exercise.slug === ex.slug);
                  const icon = ex.visualKey ? figureImages[ex.visualKey] : undefined;
                  return (
                    <Pressable key={ex.slug} onPress={() => addExerciseDuringWorkout(ex)} style={styles.pickerExerciseRow}>
                      {icon ? <Image source={icon} style={styles.pickerThumb} /> : <Text style={styles.pickerEmoji}>{ex.icon_emoji || '●'}</Text>}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerExerciseName}>{ex.name}</Text>
                        <Text style={styles.pickerExerciseMeta}>{ex.targetArea} • {ex.equipment}</Text>
                      </View>
                      <Text style={[styles.pickerPlus, existing && { color: colors.green }]}>{existing ? '✓' : '+'}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.browseHeader}>
          <View>
            <Text style={styles.browseTitle}>{editingTemplateId ? 'Edit Saved Workout' : 'New Workout'}</Text>
            <Text style={styles.browseSub}>
              {builder.length ? `${builder.length} exercise${builder.length === 1 ? '' : 's'} ready` : 'Choose an exercise to set it up'}
            </Text>
          </View>
          <Pressable onPress={newWorkout}><Text style={styles.newWorkoutText}>NEW</Text></Pressable>
        </View>

        {savedWorkouts.length ? (
          <View style={styles.savedSection}>
            <Text style={styles.sectionTitle}>Saved Workouts</Text>
            <Text style={styles.sectionSubtitle}>Build these ahead of time, then start them when you are ready to train.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedScroller}>
              {savedWorkouts.map((saved) => (
                <Card key={saved.id} style={styles.savedCard}>
                  <Text style={styles.savedName} numberOfLines={1}>{saved.name}</Text>
                  <Text style={styles.savedCount}>{saved.plan?.length ?? 0} exercises</Text>
                  <Text style={styles.savedNames} numberOfLines={2}>
                    {(saved.plan ?? []).map((item) => item.exercise_name).join(' • ')}
                  </Text>
                  <Pressable onPress={() => startSavedWorkout(saved)} style={styles.savedStart}>
                    <Text style={styles.savedStartText}>START</Text>
                  </Pressable>
                  <View style={styles.savedActions}>
                    <Pressable onPress={() => editSavedWorkout(saved)}><Text style={styles.savedEdit}>Edit</Text></Pressable>
                    <Pressable onPress={() => deleteSavedWorkout(saved)}><Text style={styles.savedDelete}>Delete</Text></Pressable>
                  </View>
                </Card>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.muscleScroller}>
          <Pressable onPress={() => setMuscleFilter('All')} style={styles.muscleChoice}>
            <View style={[styles.circle, muscleFilter === 'All' && styles.circleActive]}>
              <Image
                source={require('../../../assets/nav/workout.png')}
                style={[styles.circleIcon, { tintColor: muscleFilter === 'All' ? colors.primary : colors.muted }]}
              />
            </View>
            <Text style={[styles.choiceLabel, muscleFilter === 'All' && styles.choiceLabelActive]}>All</Text>
          </Pressable>
          {muscleCards.map((muscle) => (
            <Pressable key={muscle.label} onPress={() => setMuscleFilter(muscle.label as any)} style={styles.muscleChoice}>
              <View style={[styles.circle, muscleFilter === muscle.label && styles.circleActive]}>
                <Image source={muscle.image} style={styles.circleAnatomy} />
              </View>
              <Text style={[styles.choiceLabel, muscleFilter === muscle.label && styles.choiceLabelActive]}>{muscle.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Input value={query} onChangeText={setQuery} placeholder="Search exercises…" />

        {builder.length ? (
          <Card style={styles.selectedCard}>
            <View style={styles.selectedTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedTitle}>{builder.length} exercise{builder.length === 1 ? '' : 's'} configured</Text>
                <Text style={styles.selectedMeta}>Save it for later, add another exercise, or start now.</Text>
              </View>
              <Pressable onPress={startWorkout} style={styles.startSmall}><Text style={styles.startSmallText}>START</Text></Pressable>
            </View>
            <View style={styles.builderButtons}>
              <Pressable onPress={openSaveForm} style={styles.saveOutline}>
                <Text style={styles.saveOutlineText}>{editingTemplateId ? 'UPDATE SAVED WORKOUT' : 'SAVE WORKOUT'}</Text>
              </Pressable>
            </View>
            {showSaveForm ? (
              <View style={styles.saveForm}>
                <Input value={templateName} onChangeText={setTemplateName} placeholder="Workout name, e.g. Push Day" />
                <Button title={busy ? 'SAVING…' : editingTemplateId ? 'UPDATE SAVED WORKOUT' : 'SAVE FOR LATER'} onPress={saveTemplate} disabled={busy} />
                <Pressable onPress={() => setShowSaveForm(false)}><Text style={styles.cancelSave}>Cancel</Text></Pressable>
              </View>
            ) : null}
          </Card>
        ) : null}

        {lastWorkout.length ? <Pressable onPress={repeatLast} style={styles.repeat}><Text style={styles.repeatText}>↻ Repeat last workout</Text></Pressable> : null}

        <View style={styles.exerciseList}>
          {filtered.map((ex) => {
            const img = ex.visualKey ? figureImages[ex.visualKey] : undefined;
            const selected = builder.some((item) => item.exercise.slug === ex.slug);
            return (
              <Pressable key={ex.slug} onPress={() => addExercise(ex)} style={styles.exerciseRow}>
                {img ? (
                  <Image source={img} style={styles.thumb} />
                ) : (
                  <View style={styles.blankThumb}><Text style={styles.listEmoji}>{ex.icon_emoji || '●'}</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.target}>{ex.targetArea}</Text>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <Text style={styles.exMeta}>
                    {ex.equipment} • {ex.metric_type === 'strength' ? 'sets / reps / weight' : ex.metric_type === 'distance' ? 'distance / duration' : 'duration'}
                  </Text>
                </View>
                <View style={[styles.plus, selected && styles.plusSelected]}>
                  <Text style={[styles.plusText, { color: selected ? '#fff' : colors.primary }]}>{selected ? '✓' : '+'}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SetTable({
  item,
  active,
  onSet,
  onToggle,
  onRemove,
}: {
  item: BuilderItem;
  active: boolean;
  onSet: (setId: string, patch: Partial<StrengthSet>) => void;
  onToggle: (setId: string) => void;
  onRemove: (setId: string) => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View>
      <View style={styles.tableHead}>
        <Text style={styles.setCol}>SET</Text>
        <Text style={styles.flexCol}>WEIGHT (kg)</Text>
        <Text style={styles.flexCol}>REPS</Text>
        <Text style={styles.actionCol}>{active ? '✓ / −' : '−'}</Text>
      </View>
      {item.strengthSets.map((set, index) => (
        <View key={set.id} style={[styles.tableRow, set.done && { opacity: 0.56 }]}>
          <Text style={styles.setCol}>{index + 1}</Text>
          <Input
            style={styles.tableInput}
            value={set.weight}
            onChangeText={(value) => onSet(set.id, { weight: value })}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Input
            style={[styles.tableInput, set.done && { color: colors.green }]}
            value={set.reps}
            onChangeText={(value) => onSet(set.id, { reps: value })}
            keyboardType="number-pad"
            placeholder="10"
          />
          <View style={styles.setActions}>
            {active ? (
              <Pressable onPress={() => onToggle(set.id)} style={styles.smallSetAction}>
                <Text style={[styles.checkText, set.done && { color: colors.green }]}>{set.done ? '✓' : '○'}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => onRemove(set.id)} style={styles.smallSetAction}>
              <Text style={styles.remove}>−</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {item.strengthSets.length === 1 ? <Text style={styles.minimumSetHint}>Keep at least one set, or remove the exercise instead.</Text> : null}
    </View>
  );
}

function CardioInputs({ item, onChange }: { item: BuilderItem; onChange: (patch: Partial<BuilderItem>) => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View>
      <Text style={styles.cardioHint}>Record the fields that best match this exercise. You can change them during the workout.</Text>
      {item.exercise.allowsLoad ? (
        <Input value={item.load} onChangeText={(value) => onChange({ load: value })} keyboardType="decimal-pad" placeholder="Load (kg), if used" />
      ) : null}
      <View style={styles.two}>
        {item.exercise.metric_type === 'distance' ? (
          <Input style={{ flex: 1 }} value={item.distance} onChangeText={(value) => onChange({ distance: value })} keyboardType="decimal-pad" placeholder="Distance (km)" />
        ) : null}
        <Input style={{ flex: 1 }} value={item.duration} onChangeText={(value) => onChange({ duration: value })} keyboardType="decimal-pad" placeholder="Duration (min)" />
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingTop: 10, paddingBottom: 34 },
  browseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  browseTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  browseSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  newWorkoutText: { color: colors.blue, fontSize: 11, fontWeight: '900', borderWidth: 1, borderColor: colors.blue, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  savedSection: { marginBottom: 10 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  sectionSubtitle: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 2, marginBottom: 8 },
  savedScroller: { gap: 9, paddingRight: 8 },
  savedCard: { width: 218, marginBottom: 0, padding: 12 },
  savedName: { color: colors.text, fontWeight: '900', fontSize: 16 },
  savedCount: { color: colors.primary, fontWeight: '900', fontSize: 10, marginTop: 4 },
  savedNames: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 5, minHeight: 30 },
  savedStart: { backgroundColor: colors.primary, borderRadius: 9, minHeight: 38, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  savedStartText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  savedActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9, paddingHorizontal: 3 },
  savedEdit: { color: colors.blue, fontWeight: '900', fontSize: 11 },
  savedDelete: { color: colors.muted, fontWeight: '800', fontSize: 11 },
  muscleScroller: { gap: 10, paddingBottom: 14 },
  muscleChoice: { alignItems: 'center', width: 58 },
  circle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  circleActive: { borderColor: colors.primary },
  circleIcon: { width: 22, height: 22, resizeMode: 'contain' },
  circleAnatomy: { width: 46, height: 46, resizeMode: 'contain' },
  choiceLabel: { color: colors.muted, fontSize: 9, marginTop: 5 },
  choiceLabelActive: { color: colors.primary, fontWeight: '900' },
  selectedCard: { padding: 12 },
  selectedTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedTitle: { color: colors.text, fontWeight: '900' },
  selectedMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  startSmall: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  startSmallText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  builderButtons: { marginTop: 9 },
  saveOutline: { borderWidth: 1.5, borderColor: colors.blue, borderRadius: 9, minHeight: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
  saveOutlineText: { color: colors.blue, fontWeight: '900', fontSize: 11 },
  saveForm: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  cancelSave: { color: colors.muted, textAlign: 'center', fontWeight: '800', fontSize: 11, paddingVertical: 7 },
  repeat: { alignSelf: 'flex-start', paddingVertical: 8 },
  repeatText: { color: colors.blue, fontWeight: '800', fontSize: 11 },
  exerciseList: { gap: 7 },
  exerciseRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 9 },
  thumb: { width: 58, height: 58, resizeMode: 'contain' },
  blankThumb: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2, borderRadius: 10 },
  listEmoji: { fontSize: 26 },
  target: { color: colors.primary, fontWeight: '900', fontSize: 10 },
  exName: { color: colors.text, fontWeight: '900', fontSize: 14, marginTop: 1 },
  exMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  plus: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  plusSelected: { backgroundColor: colors.green, borderColor: colors.green },
  plusText: { fontWeight: '900', fontSize: 20, lineHeight: 22 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  back: { color: colors.text, fontSize: 36, fontWeight: '300' },
  detailTitle: { color: colors.text, fontSize: 19, fontWeight: '900', maxWidth: '75%', textAlign: 'center' },
  more: { color: colors.text, fontSize: 16, fontWeight: '900' },
  detailHero: { flexDirection: 'row', minHeight: 250, alignItems: 'center' },
  detailFigure: { flex: 1, height: 250, resizeMode: 'contain' },
  cardioVisual: { flex: 1, height: 220, alignItems: 'center', justifyContent: 'center' },
  cardioEmoji: { fontSize: 92 },
  muscleBox: { width: 145, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 11 },
  muscleBoxTitle: { color: colors.text, fontWeight: '900', fontSize: 12, marginBottom: 7 },
  muscleLine: { color: colors.muted, fontSize: 10, lineHeight: 17 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { color: colors.muted, fontWeight: '800', fontSize: 11 },
  tabTextActive: { color: colors.primary },
  aboutLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', marginTop: 7 },
  aboutText: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 2 },
  suggest: { backgroundColor: colors.blueSoft, borderRadius: 10, padding: 10, marginBottom: 10 },
  suggestTitle: { color: colors.blue, fontWeight: '900', fontSize: 9 },
  suggestText: { color: colors.text, fontSize: 11, marginTop: 3, lineHeight: 16 },
  detailActions: { marginTop: 12 },
  removeExercise: { alignItems: 'center', padding: 10 },
  removeExerciseText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border },
  setCol: { width: 30, color: colors.text, fontWeight: '800', fontSize: 11, textAlign: 'center' },
  flexCol: { flex: 1, color: colors.muted, fontWeight: '900', fontSize: 9, textAlign: 'center' },
  actionCol: { width: 61, color: colors.muted, textAlign: 'center', fontWeight: '900', fontSize: 9 },
  tableInput: { flex: 1, marginBottom: 0, minHeight: 38, textAlign: 'center', paddingHorizontal: 4 },
  setActions: { width: 61, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  smallSetAction: { width: 30, height: 34, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: colors.muted, fontSize: 21, fontWeight: '900' },
  remove: { color: colors.muted, fontSize: 22, lineHeight: 24 },
  minimumSetHint: { color: colors.muted, fontSize: 9, marginTop: 6, textAlign: 'center' },
  two: { flexDirection: 'row', gap: 8 },
  cardioHint: { color: colors.muted, fontSize: 11, marginBottom: 9 },
  activeWrap: { padding: 16, paddingTop: 10, paddingBottom: 34 },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exit: { color: colors.text, fontSize: 14 },
  activeTitle: { color: colors.text, fontWeight: '900', fontSize: 18, maxWidth: '62%' },
  activeAdd: { color: colors.blue, fontSize: 27, lineHeight: 28, fontWeight: '500' },
  timer: { color: colors.text, fontSize: 43, fontWeight: '800', textAlign: 'center', marginTop: 14 },
  timerLabel: { color: colors.muted, textAlign: 'center', fontSize: 11, marginBottom: 10 },
  activeEditRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  editHint: { flex: 1, color: colors.muted, fontSize: 9, lineHeight: 13 },
  activeExercises: { gap: 7, paddingBottom: 12 },
  activeExerciseChip: { width: 128, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.panel, padding: 9 },
  activeExerciseSelected: { borderColor: colors.primary },
  activeExerciseDone: { backgroundColor: colors.panel2 },
  activeExerciseName: { color: colors.text, fontWeight: '900', fontSize: 11 },
  activeExerciseState: { color: colors.muted, fontSize: 8, marginTop: 4, fontWeight: '800' },
  liveCard: { padding: 13 },
  liveHero: { flexDirection: 'row', alignItems: 'center', minHeight: 150, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 8 },
  liveFigure: { width: 135, height: 155, resizeMode: 'contain' },
  liveIconBox: { width: 135, height: 150, alignItems: 'center', justifyContent: 'center' },
  liveEmoji: { fontSize: 66 },
  liveMuscles: { flex: 1, paddingLeft: 9 },
  liveName: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 10 },
  primaryLabel: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  liveMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  activeRemoveExercise: { alignItems: 'center', paddingTop: 11, paddingBottom: 3 },
  activeRemoveExerciseText: { color: colors.danger, fontWeight: '800', fontSize: 10 },
  restBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 13, padding: 12, marginBottom: 8 },
  restLabel: { color: colors.blue, fontSize: 9, fontWeight: '900' },
  restTime: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 2 },
  skip: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.blue, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { color: colors.blue, fontWeight: '900', fontSize: 11 },
  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,.48)', justifyContent: 'flex-end' },
  pickerSheet: { height: '78%', backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 16 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  pickerTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  pickerSubtitle: { color: colors.muted, fontSize: 10, marginTop: 2 },
  pickerClose: { color: colors.text, fontSize: 31, fontWeight: '300' },
  pickerExerciseRow: { minHeight: 66, flexDirection: 'row', gap: 9, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 7 },
  pickerThumb: { width: 49, height: 49, resizeMode: 'contain' },
  pickerEmoji: { width: 49, textAlign: 'center', fontSize: 27 },
  pickerExerciseName: { color: colors.text, fontWeight: '900', fontSize: 13 },
  pickerExerciseMeta: { color: colors.muted, fontSize: 9, marginTop: 3 },
  pickerPlus: { color: colors.blue, fontSize: 24, width: 30, textAlign: 'center' },
});
