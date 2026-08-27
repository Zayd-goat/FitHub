import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import Storage from 'expo-sqlite/kv-store';
import {
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, contrastText, Input, OutlineButton, useTheme } from '../../components/UI';
import PRCelebrationModal from '../../components/PRCelebrationModal';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { progressionSuggestion } from '../../lib/progression';
import { recordWorkoutDay } from '../../lib/streaks';
import { clearActiveWorkoutNotification, showActiveWorkoutNotification } from '../../lib/notifications';
import { detectAndSavePrEvents, NewPrEvent } from '../../lib/prs';
import { displayToKg, displayToKm, formatDistance, formatPace, formatWeight, kgToDisplay, kmToDisplay } from '../../lib/units';
import { connectFirstFtms, FtmsMetrics, FtmsState } from '../../lib/ftms';
import { BookmarkIcon, SearchIcon } from '../../components/FitHubIcons';
import { normalizeSharedPlan, SharedWorkoutLaunch, SharedWorkoutPlanItem } from '../../lib/sharedGym';
import {
  exerciseLibrary,
  LibraryExercise,
  muscleCards,
  muscleGroupFilters,
  summarizeTargets,
} from '../../data/exerciseLibrary';
import { imageForExercise } from '../../data/exerciseVisuals';
import { profileAge } from '../../lib/profileAge';

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
export type WorkoutTabHandle = { goBack: () => boolean };
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
const formatTime = (sec: number) => {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const muscleGridImages = {
  male: {
    chest: require('../../../assets/train_v4/groups/male/chest.png'),
    back: require('../../../assets/train_v4/groups/male/back.png'),
    shoulders: require('../../../assets/train_v4/groups/male/shoulders.png'),
    arms: require('../../../assets/train_v4/groups/male/arms.png'),
    legs: require('../../../assets/train_v4/groups/male/legs.png'),
    core: require('../../../assets/train_v4/groups/male/core.png'),
    fullBody: require('../../../assets/train_v4/groups/male/full_body.png'),
    cardio: require('../../../assets/train_v4/groups/male/cardio.png'),
  },
  female: {
    chest: require('../../../assets/train_v4/groups/female/chest.png'),
    back: require('../../../assets/train_v4/groups/female/back.png'),
    shoulders: require('../../../assets/train_v4/groups/female/shoulders.png'),
    arms: require('../../../assets/train_v4/groups/female/arms.png'),
    legs: require('../../../assets/train_v4/groups/female/legs.png'),
    core: require('../../../assets/train_v4/groups/female/core.png'),
    fullBody: require('../../../assets/train_v4/groups/female/full_body.png'),
    cardio: require('../../../assets/train_v4/groups/female/cardio.png'),
  },
};

const matchesEquipment = (equipment:string, filter:string) => {
  if (filter==='All') return true;
  const value=equipment.toLowerCase();
  if (filter==='Dumbbell') return value.includes('dumbbell');
  if (filter==='Machine') return value.includes('machine') || value.includes('station');
  if (filter==='Bodyweight') return value.includes('bodyweight') || value.includes('gym floor');
  return value.includes(filter.toLowerCase());
};

const serializeBuilder = (items: BuilderItem[], weightUnit: 'kg'|'lb', distanceUnit: 'km'|'mi'): SavedPlanItem[] =>
  items.map((item) => ({
    exercise_slug: item.exercise.slug,
    exercise_name: item.exercise.name,
    strength_sets: item.strengthSets.map((set) => ({ weight: set.weight === '' ? '' : String(displayToKg(Number(set.weight), weightUnit)), reps: set.reps })),
    distance: item.distance === '' ? '' : String(displayToKm(Number(item.distance), distanceUnit)),
    duration: item.duration,
    load: item.load === '' ? '' : String(displayToKg(Number(item.load), weightUnit)),
  }));

const hydratePlan = (plan: SavedPlanItem[], weightUnit: 'kg'|'lb', distanceUnit: 'km'|'mi'): BuilderItem[] => {
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
              weight: set.weight === '' || set.weight == null ? '' : String(Math.round(kgToDisplay(Number(set.weight), weightUnit) * 100) / 100),
              reps: set.reps ?? '10',
              done: false,
            }))
          : [],
      distance: saved.distance === '' || saved.distance == null ? '' : String(Math.round(kmToDisplay(Number(saved.distance), distanceUnit) * 100) / 100),
      duration: saved.duration ?? '',
      load: saved.load === '' || saved.load == null ? '' : String(Math.round(kgToDisplay(Number(saved.load), weightUnit) * 100) / 100),
      done: false,
    });
  }
  return hydrated;
};

type ActiveSavedItem = {
  id?: string;
  exercise_slug: string;
  exercise_name: string;
  metric_type?: 'strength' | 'distance' | 'time';
  strength_sets: Array<{ id?: string; weight: string; reps: string; done: boolean }>;
  distance: string;
  duration: string;
  load: string;
  done: boolean;
};
type ActiveSavedState = {
  started_at: number;
  template_name: string;
  editing_template_id: string | null;
  active_index: number;
  revision?: number;
  weight_unit?: 'kg' | 'lb';
  distance_unit?: 'km' | 'mi';
  shared_session_id?: string | null;
  shared_leader?: boolean;
  shared_revision?: number;
  items: ActiveSavedItem[];
};

const serializeActive = (items: BuilderItem[], weightUnit: 'kg'|'lb', distanceUnit: 'km'|'mi'): ActiveSavedItem[] =>
  items.map((item) => ({
    id: item.id,
    exercise_slug: item.exercise.slug,
    exercise_name: item.exercise.name,
    metric_type: item.exercise.metric_type,
    strength_sets: item.strengthSets.map((set) => ({ id: set.id, weight: set.weight === '' ? '' : String(displayToKg(Number(set.weight), weightUnit)), reps: set.reps, done: set.done })),
    distance: item.distance === '' ? '' : String(displayToKm(Number(item.distance), distanceUnit)),
    duration: item.duration,
    load: item.load === '' ? '' : String(displayToKg(Number(item.load), weightUnit)),
    done: item.done,
  }));

const hydrateActive = (items: ActiveSavedItem[], weightUnit: 'kg'|'lb', distanceUnit: 'km'|'mi'): BuilderItem[] => {
  const hydrated: BuilderItem[] = [];
  for (const saved of items ?? []) {
    const ex = exerciseLibrary.find((item) => item.slug === saved.exercise_slug) ?? exerciseLibrary.find((item) => item.name === saved.exercise_name);
    if (!ex) continue;
    hydrated.push({
      id: saved.id ?? `${ex.slug}-${makeId()}`,
      exercise: ex,
      strengthSets: ex.metric_type === 'strength'
        ? (saved.strength_sets?.length ? saved.strength_sets : [{ weight: '', reps: '10', done: false }]).map((set) => ({ id: set.id ?? makeId(), weight: set.weight === '' || set.weight == null ? '' : String(Math.round(kgToDisplay(Number(set.weight), weightUnit) * 100) / 100), reps: set.reps ?? '10', done: !!set.done }))
        : [],
      distance: saved.distance === '' || saved.distance == null ? '' : String(Math.round(kmToDisplay(Number(saved.distance), distanceUnit) * 100) / 100),
      duration: saved.duration ?? '',
      load: saved.load === '' || saved.load == null ? '' : String(Math.round(kgToDisplay(Number(saved.load), weightUnit) * 100) / 100),
      done: !!saved.done,
    });
  }
  return hydrated;
};

const hydrateSharedPlan = (plan: SharedWorkoutPlanItem[], previous: BuilderItem[] = []): BuilderItem[] => {
  const hydrated: BuilderItem[] = [];
  for (const shared of normalizeSharedPlan(plan)) {
    const exercise = exerciseLibrary.find((item) => item.slug === shared.exercise_slug) ?? exerciseLibrary.find((item) => item.name === shared.exercise_name);
    if (!exercise) continue;
    const existing = previous.find((item) => item.exercise.slug === exercise.slug);
    hydrated.push({
      id: existing?.id ?? `${exercise.slug}-${makeId()}`,
      exercise,
      strengthSets: exercise.metric_type === 'strength'
        ? Array.from({ length: shared.sets }, (_, index) => {
            const savedSet = existing?.strengthSets[index];
            return savedSet ? { ...savedSet, reps: savedSet.done ? savedSet.reps : String(shared.reps) } : { id: makeId(), weight: '', reps: String(shared.reps), done: false };
          })
        : [],
      distance: existing?.distance ?? shared.distance ?? '',
      duration: existing?.duration ?? shared.duration ?? '',
      load: existing?.load ?? '',
      done: existing?.done ?? false,
      suggestion: existing?.suggestion,
    });
  }
  // A leader can remove an exercise while someone else is training. Keep any
  // already-completed local work so it can still be saved to that user's private history.
  for (const existing of previous) {
    const remainsInPlan = hydrated.some((item) => item.exercise.slug === existing.exercise.slug);
    const hasCompletedWork = existing.done || existing.strengthSets.some((set) => set.done);
    if (!remainsInPlan && hasCompletedWork) hydrated.push(existing);
  }
  return hydrated;
};

type WorkoutLaunchOptions = {
  title?: string;
  sharedSessionId?: string | null;
  sharedLeader?: boolean;
  sharedRevision?: number;
};

const WorkoutTab = forwardRef<WorkoutTabHandle, {
  profile: Profile;
  onProfileChanged: () => void;
  sharedLaunch?: SharedWorkoutLaunch | null;
  onSharedLaunchConsumed?: () => void;
}>(function WorkoutTab({
  profile,
  onProfileChanged,
  sharedLaunch,
  onSharedLaunchConsumed,
}, ref) {
  const { colors, weightUnit, distanceUnit, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const [screen, setScreen] = useState<ScreenMode>('browse');
  const [detailTab, setDetailTab] = useState<DetailTab>('sets');
  const [detailExercise, setDetailExercise] = useState<LibraryExercise | null>(null);
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState<string>('All');
  const [equipmentFilter,setEquipmentFilter]=useState('All');
  const [showSavedWorkouts,setShowSavedWorkouts]=useState(false);
  const [showWorkoutPreview,setShowWorkoutPreview]=useState(false);
  const [builder, setBuilder] = useState<BuilderItem[]>([]);
  const [lastWorkout, setLastWorkout] = useState<BuilderItem[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);
  const [activeRevision, setActiveRevision] = useState(0);
  const [activeSharedSessionId,setActiveSharedSessionId]=useState<string|null>(null);
  const [activeSharedLeader,setActiveSharedLeader]=useState(false);
  const [activeSharedRevision,setActiveSharedRevision]=useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showExerciseGuide, setShowExerciseGuide] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [prEvents, setPrEvents] = useState<NewPrEvent[]>([]);
  const [prSessionId, setPrSessionId] = useState<string | null>(null);
  const [pendingWorkoutShare, setPendingWorkoutShare] = useState<{sessionId:string;summary:string}|null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const activeStorageKey = `fithub_active_workout_${profile.id}`;
  const activeRevisionKey = `fithub_active_revision_${profile.id}`;

  useImperativeHandle(ref,()=>({goBack:()=>{
    if(showExerciseGuide){setShowExerciseGuide(false);return true;}
    if(showExercisePicker){setShowExercisePicker(false);return true;}
    if(showSaveForm){setShowSaveForm(false);return true;}
    if(showSavedWorkouts){setShowSavedWorkouts(false);return true;}
    if(screen==='active'){
      setScreen('browse');
      return true;
    }
    if(screen==='detail'){
      setScreen('browse');
      setDetailExercise(null);
      return true;
    }
    if(muscleFilter!=='All'){
      setMuscleFilter('All');
      setEquipmentFilter('All');
      setQuery('');
      return true;
    }
    return false;
  }}),[showExerciseGuide,showExercisePicker,showSaveForm,showSavedWorkouts,screen,muscleFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exerciseLibrary.filter(
      (ex) =>
        (muscleFilter === 'All' || (muscleFilter === 'Arms' ? ['Biceps','Triceps','Forearms'].includes(ex.targetArea) : ex.targetArea === muscleFilter)) &&
        matchesEquipment(ex.equipment,equipmentFilter) &&
        (!q || `${ex.name} ${ex.targetArea} ${ex.subsection} ${ex.equipment}`.toLowerCase().includes(q)),
    );
  }, [query, muscleFilter,equipmentFilter]);

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

  const pullRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await loadSavedWorkouts(); await Promise.resolve(onProfileChanged()); }
    finally { setRefreshing(false); }
  };

  useEffect(() => {
    const pendingPrKey = `fithub_pending_pr_${profile.id}`;
    Storage.getItem(pendingPrKey).then((raw) => {
      if (!raw) return;
      try {
        const pending = JSON.parse(raw);
        if (Array.isArray(pending?.events) && pending.events.length && pending?.sessionId) {
          setPrEvents(pending.events);
          setPrSessionId(String(pending.sessionId));
          setPendingWorkoutShare({ sessionId: String(pending.sessionId), summary: String(pending.summary ?? 'Workout') });
        }
      } catch {} finally {
        Storage.removeItem(pendingPrKey).catch(() => {});
      }
    }).catch(() => {});
  }, [profile.id]);

  useEffect(() => {
    Storage.getItem(activeStorageKey).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as ActiveSavedState;
        const restored = hydrateActive(saved.items, weightUnit, distanceUnit);
        if (!saved.started_at || !restored.length) return;
        setBuilder(restored);
        setTemplateName(saved.template_name ?? 'Workout');
        setEditingTemplateId(saved.editing_template_id ?? null);
        setActiveStartedAt(saved.started_at);
        setElapsed(Math.max(0, Math.floor((Date.now() - saved.started_at) / 1000)));
        setActiveExerciseIndex(Math.min(saved.active_index ?? 0, Math.max(0, restored.length - 1)));
        setActiveRevision(saved.revision ?? 0);
        setActiveSharedSessionId(saved.shared_session_id ?? null);
        setActiveSharedLeader(!!saved.shared_leader);
        setActiveSharedRevision(Number(saved.shared_revision ?? 0));
        setScreen('active');
      } catch {}
    }).catch(() => {});
  }, [profile.id, weightUnit, distanceUnit]);

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
                  weight: row.weight_kg == null ? '' : String(Math.round(kgToDisplay(Number(row.weight_kg), weightUnit) * 100) / 100),
                  reps: row.reps == null ? '' : String(row.reps),
                  done: false,
                }))
              : [],
          distance: rows[0]?.distance_km == null ? '' : String(Math.round(kmToDisplay(Number(rows[0].distance_km), distanceUnit) * 100) / 100),
          duration: rows[0]?.duration_min == null ? '' : String(rows[0].duration_min),
          load: rows[0]?.weight_kg == null ? '' : String(Math.round(kgToDisplay(Number(rows[0].weight_kg), weightUnit) * 100) / 100),
          done: false,
        });
      }
      setLastWorkout(template);
    };
    loadLast();
    loadSavedWorkouts();
  }, [profile.id]);

  useEffect(() => {
    if (!activeStartedAt) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - activeStartedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [activeStartedAt]);

  useEffect(() => {
    if (!activeStartedAt || !builder.length) return;
    const revision = Date.now();
    const saved: ActiveSavedState = {
      started_at: activeStartedAt,
      template_name: templateName || 'Workout',
      editing_template_id: editingTemplateId,
      active_index: Math.min(activeExerciseIndex, Math.max(0, builder.length - 1)),
      revision,
      weight_unit: weightUnit,
      distance_unit: distanceUnit,
      shared_session_id: activeSharedSessionId,
      shared_leader: activeSharedLeader,
      shared_revision: activeSharedRevision,
      items: serializeActive(builder, weightUnit, distanceUnit),
    };
    setActiveRevision(revision);
    Storage.setItem(activeStorageKey, JSON.stringify(saved)).catch(() => {});
    Storage.setItem(activeRevisionKey, String(revision)).catch(() => {});
    const current = builder[Math.min(activeExerciseIndex, Math.max(0, builder.length - 1))];
    if (current) {
      let detail = '';
      if (current.exercise.metric_type === 'strength') {
        const next = current.strengthSets.findIndex((set) => !set.done);
        const set = current.strengthSets[Math.max(0, next >= 0 ? next : current.strengthSets.length - 1)];
        if (set) detail = `Set ${Math.max(1, (next >= 0 ? next : current.strengthSets.length - 1) + 1)}/${current.strengthSets.length}${set.weight ? ` • ${set.weight} ${weightUnit}` : ''}${set.reps ? ` × ${set.reps}` : ''}`;
      } else if (current.distance || current.duration) {
        detail = `${current.distance ? `${current.distance} ${distanceUnit}` : ''}${current.distance && current.duration ? ' • ' : ''}${current.duration ? `${current.duration} min` : ''}`;
      }
      showActiveWorkoutNotification({
        userId: profile.id,
        workoutName: templateName || 'Workout',
        exerciseName: current.exercise.name,
        startedAt: activeStartedAt,
        detail,
      }).catch(() => {});
    }
  }, [activeStartedAt, builder, activeExerciseIndex, templateName, editingTemplateId, activeSharedSessionId, activeSharedLeader, activeSharedRevision, Math.floor(elapsed / 30)]);

  useEffect(() => {
    if (!activeStartedAt) return;
    let mounted = true;
    const syncFromStorage = async () => {
      const revisionRaw = await Storage.getItem(activeRevisionKey).catch(() => null);
      const revision = Number(revisionRaw ?? 0);
      if (!mounted || !revision || revision === activeRevision) return;
      const raw = await Storage.getItem(activeStorageKey).catch(() => null);
      if (!mounted) return;
      if (!raw) {
        setBuilder([]); setTemplateName(''); setEditingTemplateId(null); setActiveStartedAt(null);
        setActiveSharedSessionId(null); setActiveSharedLeader(false); setActiveSharedRevision(0);
        setElapsed(0); setRestSeconds(0); setActiveExerciseIndex(0); setScreen('browse');
        setActiveRevision(revision);
        onProfileChanged();
        return;
      }
      try {
        const saved = JSON.parse(raw) as ActiveSavedState;
        const restored = hydrateActive(saved.items, weightUnit, distanceUnit);
        if (!restored.length) return;
        setBuilder(restored);
        setTemplateName(saved.template_name ?? 'Workout');
        setEditingTemplateId(saved.editing_template_id ?? null);
        setActiveExerciseIndex(Math.min(saved.active_index ?? 0, Math.max(0, restored.length - 1)));
        setActiveRevision(saved.revision ?? revision);
        setActiveSharedSessionId(saved.shared_session_id ?? null);
        setActiveSharedLeader(!!saved.shared_leader);
        setActiveSharedRevision(Number(saved.shared_revision ?? 0));
      } catch {}
    };
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') syncFromStorage(); });
    const id = setInterval(syncFromStorage, 1500);
    return () => { mounted = false; sub.remove(); clearInterval(id); };
  }, [activeStartedAt, activeRevision, profile.id]);

  useEffect(() => {
    if (restSeconds <= 0) return;
    const id = setInterval(() => setRestSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(id);
  }, [restSeconds]);

  const getItem = (ex: LibraryExercise | null) =>
    ex ? builder.find((item) => item.exercise.slug === ex.slug) : undefined;

  const publishSharedBuilder = async (items: BuilderItem[]) => {
    if (!activeSharedSessionId || !activeSharedLeader) return;
    const sharedPlan: SharedWorkoutPlanItem[] = items.map((item) => ({
      exercise_slug: item.exercise.slug,
      exercise_name: item.exercise.name,
      sets: item.exercise.metric_type === 'strength' ? Math.max(1, item.strengthSets.length) : 1,
      reps: item.exercise.metric_type === 'strength' ? Math.max(1, Number(item.strengthSets[0]?.reps ?? 10)) : 1,
      distance: item.distance,
      duration: item.duration,
    }));
    const { error } = await supabase.from('shared_gym_workout_plans').upsert({
      shared_session_id: activeSharedSessionId,
      title: templateName || 'Shared workout',
      plan: sharedPlan,
      updated_by: profile.id,
    }, { onConflict: 'shared_session_id' });
    if (error) Alert.alert('Shared workout', error.message);
  };

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
          (profileAge(profile) ?? 13) < 18
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
    if (activeSharedSessionId && !activeSharedLeader) {
      Alert.alert('Synced workout', 'The session leader controls the shared exercise list. Your sets, reps and weights are still recorded privately on this phone.');
      return;
    }
    const existingIndex = builder.findIndex((entry) => entry.exercise.slug === ex.slug);
    if (existingIndex >= 0) {
      setActiveExerciseIndex(existingIndex);
      setShowExercisePicker(false);
      setPickerQuery('');
      return;
    }
    const item = await createExerciseItem(ex);
    const next = [...builder, item];
    setBuilder(next);
    publishSharedBuilder(next);
    setActiveExerciseIndex(builder.length);
    setShowExercisePicker(false);
    setPickerQuery('');
  };

  const removeExercise = (slug: string) => setBuilder((previous) => previous.filter((item) => item.exercise.slug !== slug));
  const moveExercise=(from:number,to:number)=>{if(from===to||from<0||to<0||from>=builder.length||to>=builder.length)return;if(activeSharedSessionId&&!activeSharedLeader){Alert.alert('Synced workout','Only the session leader can change the shared exercise order.');return;}const currentId=builder[activeExerciseIndex]?.id;setBuilder(previous=>{const next=[...previous];const[moved]=next.splice(from,1);next.splice(to,0,moved);const newCurrent=next.findIndex(x=>x.id===currentId);setActiveExerciseIndex(Math.max(0,newCurrent));publishSharedBuilder(next);return next;});};
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
    if (activeSharedSessionId && !activeSharedLeader) {
      Alert.alert('Synced workout', 'Only the session leader can remove an exercise from the shared plan.');
      return;
    }
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
          const next = builder.filter((entry) => entry.id !== item.id);
          setBuilder(next);
          publishSharedBuilder(next);
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

  const beginWorkout = (items: BuilderItem[], options: WorkoutLaunchOptions = {}) => {
    if (!validateForStart(items)) return;
    const workoutTitle = options.title?.trim() || templateName || 'Workout';
    const reset = items.map((item) => ({
      ...item,
      done: false,
      strengthSets: item.strengthSets.map((set) => ({ ...set, done: false })),
    }));
    const startedAt = Date.now();
    const saved: ActiveSavedState = {
      started_at: startedAt,
      template_name: workoutTitle,
      editing_template_id: editingTemplateId,
      active_index: 0,
      weight_unit: weightUnit,
      distance_unit: distanceUnit,
      shared_session_id: options.sharedSessionId ?? null,
      shared_leader: !!options.sharedLeader,
      shared_revision: Number(options.sharedRevision ?? 0),
      items: serializeActive(reset, weightUnit, distanceUnit),
    };
    Storage.setItem(activeStorageKey, JSON.stringify(saved)).catch(() => {});
    const first = reset[0];
    if (first) showActiveWorkoutNotification({ userId: profile.id, workoutName: workoutTitle, exerciseName: first.exercise.name, startedAt }).catch(() => {});
    setBuilder(reset);
    setTemplateName(workoutTitle);
    setActiveExerciseIndex(0);
    setElapsed(0);
    setRestSeconds(0);
    setActiveSharedSessionId(options.sharedSessionId ?? null);
    setActiveSharedLeader(!!options.sharedLeader);
    setActiveSharedRevision(Number(options.sharedRevision ?? 0));
    setActiveStartedAt(startedAt);
    setScreen('active');
  };

  const startWorkout = () => beginWorkout(builder);

  useEffect(() => {
    if (!sharedLaunch) return;
    const launch = () => {
      const items = hydrateSharedPlan(sharedLaunch.plan);
      beginWorkout(items, {
        title: sharedLaunch.title,
        sharedSessionId: sharedLaunch.sharedSessionId,
        sharedLeader: sharedLaunch.isLeader,
        sharedRevision: sharedLaunch.revision,
      });
      onSharedLaunchConsumed?.();
    };
    if (activeStartedAt && activeSharedSessionId === sharedLaunch.sharedSessionId) {
      setScreen('active');
      onSharedLaunchConsumed?.();
      return;
    }
    if (activeStartedAt) {
      Alert.alert('Replace current workout?', 'Starting the synced gym workout replaces the unfinished workout currently stored on this device.', [
        { text: 'Keep current', style: 'cancel', onPress: onSharedLaunchConsumed },
        { text: 'Start synced workout', style: 'destructive', onPress: launch },
      ]);
      return;
    }
    launch();
  }, [sharedLaunch?.sharedSessionId, sharedLaunch?.revision]);

  useEffect(() => {
    if (!activeStartedAt || !activeSharedSessionId) return;
    let alive = true;
    const loadSharedPlan = async () => {
      const [{ data }, { data: sharedSession }] = await Promise.all([
        supabase.from('shared_gym_workout_plans').select('plan,revision,title').eq('shared_session_id', activeSharedSessionId).maybeSingle(),
        supabase.from('shared_gym_sessions').select('creator_id,leader_id').eq('id', activeSharedSessionId).maybeSingle(),
      ]);
      if (!alive || !data) return;
      const revision = Number(data.revision ?? 0);
      setBuilder((previous) => {
        const currentSlug = previous[Math.min(activeExerciseIndex, Math.max(0, previous.length - 1))]?.exercise.slug;
        const next = hydrateSharedPlan(normalizeSharedPlan(data.plan), previous);
        if (currentSlug) {
          const nextIndex = next.findIndex((item) => item.exercise.slug === currentSlug);
          setActiveExerciseIndex(nextIndex >= 0 ? nextIndex : Math.min(activeExerciseIndex, Math.max(0, next.length - 1)));
        }
        return next;
      });
      setTemplateName(String(data.title || 'Shared workout'));
      setActiveSharedRevision(revision);
      setActiveSharedLeader((sharedSession?.leader_id ?? sharedSession?.creator_id) === profile.id);
    };
    loadSharedPlan();
    const channel = supabase.channel(`active-shared-plan-${activeSharedSessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_gym_workout_plans', filter: `shared_session_id=eq.${activeSharedSessionId}` }, loadSharedPlan)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_gym_sessions', filter: `id=eq.${activeSharedSessionId}` }, loadSharedPlan)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [activeStartedAt, activeSharedSessionId]);

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
        plan: serializeBuilder(builder, weightUnit, distanceUnit),
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
    setBuilder(hydratePlan(saved.plan, weightUnit, distanceUnit));
    setTemplateName(saved.name);
    setEditingTemplateId(saved.id);
    setShowSaveForm(false);
    setScreen('browse');
  };

  const startSavedWorkout = (saved: SavedWorkout) => {
    const items = hydratePlan(saved.plan, weightUnit, distanceUnit);
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

  const deleteActiveWorkout = async () => {
    setBuilder([]);
    setTemplateName('');
    setEditingTemplateId(null);
    setShowSaveForm(false);
    setScreen('browse');
    setActiveStartedAt(null);
    setElapsed(0);
    setRestSeconds(0);
    setActiveExerciseIndex(0);
    setActiveSharedSessionId(null);
    setActiveSharedLeader(false);
    setActiveSharedRevision(0);
    const revision = Date.now();
    setActiveRevision(revision);
    await Storage.removeItem(activeStorageKey).catch(() => {});
    await Storage.setItem(activeRevisionKey, String(revision)).catch(() => {});
    await clearActiveWorkoutNotification(profile.id).catch(() => {});
  };

  const newWorkout = () => {
    if (activeStartedAt) {
      Alert.alert('Workout still active', 'Resume or delete the active workout before starting a different one.');
      return;
    }
    setBuilder([]);
    setTemplateName('');
    setEditingTemplateId(null);
    setShowSaveForm(false);
    setScreen('browse');
  };

  const postWorkout = async (sessionId: string, summary: string, withPhoto: boolean) => {
    try {
      let photoPath: string | null = null;
      if (withPhoto) {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.82 });
        if (result.canceled) return;
        const asset = result.assets[0];
        const bytes = await (await fetch(asset.uri)).arrayBuffer();
        const ext = (asset.fileName?.split('.').pop() || 'jpg').toLowerCase();
        photoPath = `${profile.id}/${sessionId}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('workout-media').upload(photoPath, bytes, { contentType: asset.mimeType ?? 'image/jpeg', upsert: false });
        if (uploadError) throw uploadError;
      }
      const { error } = await supabase.from('workout_posts').insert({ user_id: profile.id, session_id: sessionId, summary, photo_path: photoPath });
      if (error) throw error;
      Alert.alert('Posted', withPhoto ? 'Your workout stats and photo were shared with your FitHub friends.' : 'Your workout stats were shared with your FitHub friends.');
    } catch (error: any) {
      Alert.alert('Could not post workout', error?.message ?? 'Your workout is still saved privately in your history.');
    }
  };

  const postPrInApp = async () => {
    if (!prSessionId || !prEvents.length) return;
    const normalSummary = pendingWorkoutShare?.summary ?? prEvents.map((x) => x.exercise_name).join(', ');
    const caption = `🏆 New PR • ${prEvents.slice(0,3).map((event) => {
      if (event.metric === 'max_weight') return `${event.exercise_name}: ${formatWeight(Number(event.value_numeric), weightUnit)}${event.details?.reps ? ` × ${event.details.reps}` : ''}`;
      if (event.metric === 'reps_at_weight') return `${event.exercise_name}: ${formatWeight(Number(event.details?.weight_kg ?? 0), weightUnit)} × ${event.value_numeric} reps`;
      if (event.metric === 'distance') return `${event.exercise_name}: ${formatDistance(Number(event.value_numeric), distanceUnit)}`;
      if (event.metric === 'pace') return `${event.exercise_name}: ${formatPace(Number(event.value_numeric), distanceUnit)}`;
      return `${event.exercise_name}: ${event.value_numeric} ${event.unit}`;
    }).join(' • ')}`;
    const { error } = await supabase.from('workout_posts').insert({ user_id: profile.id, session_id: prSessionId, summary: normalSummary, caption, photo_path: null });
    if (error) Alert.alert('PR post', error.message); else Alert.alert('Shared', 'Your PR was posted to your FitHub friends.');
  };

  const closePrCelebration = () => {
    const pending = pendingWorkoutShare;
    setPrEvents([]); setPrSessionId(null); setPendingWorkoutShare(null);
    if (pending) offerWorkoutShare(pending.sessionId, pending.summary);
  };

  const offerWorkoutShare = (sessionId: string, summary: string) => {
    Alert.alert('Workout complete', 'Your workout is saved. Would you like to share the stats with your friends?', [
      { text: 'Keep private', style: 'cancel' },
      { text: 'Post stats', onPress: () => postWorkout(sessionId, summary, false) },
      { text: 'Add photo & post', onPress: () => postWorkout(sessionId, summary, true) },
    ]);
  };

  const saveWorkout = async (partial = false) => {
    const completedRows = builder.reduce((count, item) => {
      if (item.exercise.metric_type === 'strength') return count + item.strengthSets.filter((set) => set.done).length;
      return count + (item.done ? 1 : 0);
    }, 0);
    if (!allComplete && !partial) {
      Alert.alert('End workout now?', 'Completed sets and cardio entries will be saved. Anything unfinished will stay out of the workout history.', [
        { text: 'Keep training', style: 'cancel' },
        { text: 'End & save', onPress: () => saveWorkout(true) },
      ]);
      return;
    }
    if (partial && completedRows === 0) {
      Alert.alert('Nothing completed yet', 'Complete at least one set/exercise to save this workout, or delete the session instead.');
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
          item.strengthSets.forEach((set, index) => {
            if (partial && !set.done) return;
            rows.push({
              session_id: session.id,
              user_id: profile.id,
              exercise_id: null,
              exercise_name: item.exercise.name,
              set_number: index + 1,
              weight_kg: set.weight === '' ? 0 : displayToKg(Number(set.weight), weightUnit),
              reps: Number(set.reps),
              distance_km: null,
              duration_min: null,
            });
          });
        } else if (!partial || item.done) {
          rows.push({
            session_id: session.id,
            user_id: profile.id,
            exercise_id: null,
            exercise_name: item.exercise.name,
            set_number: 1,
            weight_kg: item.load ? displayToKg(Number(item.load), weightUnit) : null,
            reps: null,
            distance_km: item.distance ? displayToKm(Number(item.distance), distanceUnit) : null,
            duration_min: item.duration ? Number(item.duration) : null,
          });
        }
      });
      let insertedRows: any[] = [];
      if (rows.length) {
        const { data: inserted, error: setError } = await supabase.from('workout_sets').insert(rows).select('id,exercise_name,weight_kg,reps,distance_km,duration_min');
        if (setError) throw setError;
        insertedRows = inserted ?? rows;
      }
      if (activeSharedSessionId) {
        const { error: sharedError } = await supabase.from('shared_gym_participants').update({
          workout_session_id: session.id,
          completed_at: new Date().toISOString(),
        }).eq('shared_session_id', activeSharedSessionId).eq('user_id', profile.id);
        if (sharedError) throw sharedError;
      }
      const newPrs = insertedRows.length ? await detectAndSavePrEvents({ userId: profile.id, sessionId: session.id, rows: insertedRows, age: profileAge(profile) }) : [];
      if ((profileAge(profile) ?? 0) >= 18) await supabase.rpc('refresh_my_current_clubs');
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
      setActiveSharedSessionId(null);
      setActiveSharedLeader(false);
      setActiveSharedRevision(0);
      const revision = Date.now();
      setActiveRevision(revision);
      await Storage.removeItem(activeStorageKey).catch(() => {});
      await Storage.setItem(activeRevisionKey, String(revision)).catch(() => {});
      await clearActiveWorkoutNotification(profile.id).catch(() => {});
      onProfileChanged();
      if (newPrs.length) { setPrEvents(newPrs); setPrSessionId(session.id); setPendingWorkoutShare({ sessionId: session.id, summary }); }
      else offerWorkoutShare(session.id, summary);
    } catch (error: any) {
      Alert.alert('Could not save workout', error?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };


  const celebrationModal = <PRCelebrationModal visible={prEvents.length > 0} events={prEvents} sessionId={prSessionId} onClose={closePrCelebration} onPostInApp={postPrInApp} />;

  if (screen === 'detail' && detailExercise) {
    const item = getItem(detailExercise);
    const img = imageForExercise(detailExercise, profile.gender);
    return (
      <>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullRefresh} colors={[colors.primary]} tintColor={colors.primary} progressBackgroundColor={colors.panel}/>} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={styles.detailHeader}>
            <Pressable onPress={() => setScreen('browse')}><Text style={styles.back}>‹</Text></Pressable>
            <Text style={styles.detailTitle}>{detailExercise.name}</Text>
            <Text style={styles.more}>•••</Text>
          </View>
          <View style={styles.detailHero}>
            <View style={styles.detailImageFrame}>{img ? <Image source={img} style={detailExercise.targetArea === 'Cardio' ? styles.detailCardioFigure : styles.detailFigure} /> : <View style={styles.visualPending}><Text style={styles.visualPendingTitle}>{detailExercise.targetArea}</Text><Text style={styles.visualPendingText}>Exact movement visual pending review</Text></View>}</View>
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
                <Button title={activeStartedAt ? "RETURN TO ACTIVE WORKOUT" : "START WORKOUT"} onPress={activeStartedAt ? () => setScreen('active') : startWorkout} />
              </View>
              <Pressable onPress={() => { removeExercise(item.exercise.slug); setScreen('browse'); }} style={styles.removeExercise}>
                <Text style={styles.removeExerciseText}>Remove from workout</Text>
              </Pressable>
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      {celebrationModal}
      </>
    );
  }

  if (screen === 'active') {
    const current = builder[activeExerciseIndex];
    const img = current ? imageForExercise(current.exercise, profile.gender) : undefined;
    const completedExercises = builder.filter(itemDone).length;
    const completedSets = current?.exercise.metric_type === 'strength' ? current.strengthSets.filter((set) => set.done).length : 0;
    const totalSets = current?.exercise.metric_type === 'strength' ? current.strengthSets.length : 0;
    const incompleteSetIndex = current?.exercise.metric_type === 'strength'
      ? current.strengthSets.findIndex((set) => !set.done)
      : -1;
    const nextSetIndex = incompleteSetIndex >= 0 ? incompleteSetIndex : Math.max(0, totalSets - 1);
    const guideCues = current ? movementGuide(current.exercise) : [];
    return (
      <>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullRefresh} colors={[colors.primary]} tintColor={colors.primary} progressBackgroundColor={colors.panel}/>} contentContainerStyle={styles.activeWrap} keyboardShouldPersistTaps="handled">
          <View style={styles.activeHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Exit active workout"
              style={styles.activeHeaderButton}
              onPress={() =>
                Alert.alert('Keep workout running?', 'You can minimize FitHub and the workout timer will keep its start time. The active-workout notification stays until you finish or delete the session.', [
                  { text: 'Keep training', style: 'cancel' },
                  { text: 'Minimize workout', onPress: () => setScreen('browse') },
                  { text: 'Delete workout', style: 'destructive', onPress: deleteActiveWorkout },
                ])
              }
            >
              <Text style={styles.exit}>‹ Exit</Text>
            </Pressable>
            <Text style={styles.activeTitle}>{templateName || 'Workout'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Add exercise" onPress={() => setShowExercisePicker(true)} style={styles.activeHeaderButton}><Text style={styles.activeAdd}>＋</Text></Pressable>
          </View>
          {activeSharedSessionId ? <View style={styles.sharedBanner}>
            <View style={{ flex: 1 }}><Text style={styles.sharedBannerTitle}>LIVE SHARED WORKOUT</Text><Text style={styles.sharedBannerText}>{activeSharedLeader ? 'You control the shared exercise list and order.' : 'The session leader controls exercises. Your sets, reps and weights stay private.'}</Text></View>
            <View style={styles.sharedLiveDot}/>
          </View> : null}
          <View style={styles.sessionOverview}>
            <View style={styles.sessionMetricPrimary}>
              <Text style={styles.sessionMetricLabel}>SESSION TIME</Text>
              <Text style={styles.sessionTimer}>{formatTime(elapsed)}</Text>
            </View>
            <View style={styles.sessionMetric}>
              <Text style={styles.sessionMetricLabel}>PROGRESS</Text>
              <Text style={styles.sessionMetricValue}>{completedExercises}/{builder.length}</Text>
              <Text style={styles.sessionMetricSub}>exercises</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Add exercise" onPress={() => setShowExercisePicker(true)} style={styles.sessionAddButton}>
              <Text style={styles.sessionAddIcon}>＋</Text>
              <Text style={styles.sessionAddText}>Add</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeExercises}>
            {builder.map((item, index) => {
              const done = itemDone(item);
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.exercise.name}, ${done ? 'complete' : index === activeExerciseIndex ? 'current exercise' : 'pending'}`}
                  onPress={() => setActiveExerciseIndex(index)}
                  style={[
                    styles.activeExerciseChip,
                    index === activeExerciseIndex && styles.activeExerciseSelected,
                    done && styles.activeExerciseDone,
                  ]}
                >
                  <Text style={[styles.activeExerciseName, done && { opacity: 0.45 }]} numberOfLines={1}>{item.exercise.name}</Text>
                  <Text style={[styles.activeExerciseState, done && { color: colors.green }]}> 
                    {done ? '✓ Complete' : index === activeExerciseIndex ? '● Current' : index === activeExerciseIndex + 1 ? 'Up next' : 'Pending'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {current ? (
            <Card style={[styles.liveCard, itemDone(current) && { opacity: 0.72 }]}>
              <View style={styles.liveProgressRow}>
                <Text style={styles.liveProgressText}>EXERCISE {activeExerciseIndex + 1} OF {builder.length}</Text>
                <Text style={styles.liveProgressText}>
                  {current.exercise.metric_type === 'strength'
                    ? `SET ${Math.min(nextSetIndex + 1, Math.max(totalSets, 1))} OF ${totalSets}`
                    : current.done ? 'COMPLETE' : 'READY TO RECORD'}
                </Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setShowExerciseGuide(true)} style={styles.liveFigureStage} accessibilityLabel={`Open ${current.exercise.name} guide`}>
                {img ? <Image source={img} style={current.exercise.targetArea === 'Cardio' ? styles.liveCardioFigure : styles.liveFigure} accessibilityIgnoresInvertColors/> : <View style={styles.visualPending}><Text style={styles.visualPendingTitle}>{current.exercise.targetArea}</Text><Text style={styles.visualPendingText}>Exercise details below</Text></View>}
                <View style={styles.guideHint}><Text style={styles.guideHintText}>Tap image for full guide</Text></View>
              </Pressable>
              <View style={styles.liveTitleRow}>
                <View style={styles.liveMuscles}>
                  <Text style={styles.liveName}>{current.exercise.name}</Text>
                  <Text style={styles.liveMeta}>{current.exercise.targetArea} • {current.exercise.subsection}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Open ${current.exercise.name} guide`} onPress={() => setShowExerciseGuide(true)} style={styles.guideButton}><Text style={styles.guideButtonText}>GUIDE  ›</Text></Pressable>
              </View>
              {current.exercise.metric_type === 'strength' ? <Text style={styles.setProgressNote}>{completedSets} of {totalSets} sets complete</Text> : null}
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
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${current.exercise.name} from workout`} onPress={() => removeActiveExercise(current)} style={styles.activeRemoveExercise}>
                <Text style={styles.activeRemoveExerciseText}>Remove exercise</Text>
              </Pressable>
            </Card>
          ) : null}

          {restSeconds > 0 ? (
            <View style={styles.restBanner}>
              <View>
                <Text style={styles.restLabel}>REST TIMER</Text>
                <Text style={styles.restTime}>{formatTime(restSeconds)}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Skip rest timer" onPress={() => setRestSeconds(0)} style={styles.skip}>
                <Text style={styles.skipText}>Skip rest</Text>
              </Pressable>
            </View>
          ) : null}
          {!allComplete ? <OutlineButton title="NEXT UNFINISHED EXERCISE" onPress={nextIncomplete} /> : null}
          <Button
            title={busy ? 'SAVING…' : allComplete ? 'FINISH WORKOUT  ✓' : 'END & SAVE WORKOUT'}
            onPress={() => saveWorkout(false)}
            disabled={busy}
          />
          <Pressable
            onPress={() => Alert.alert('Delete active workout?', 'This removes the current session without saving it to your history.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete workout', style: 'destructive', onPress: deleteActiveWorkout },
            ])}
            style={styles.deleteActiveButton}
          >
            <Text style={styles.deleteActiveText}>Delete workout without saving</Text>
          </Pressable>
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
                  const icon = imageForExercise(ex, profile.gender);
                  return (
                    <Pressable key={ex.slug} onPress={() => addExerciseDuringWorkout(ex)} style={styles.pickerExerciseRow}>
                      {icon ? <Image source={icon} style={ex.targetArea === 'Cardio' ? styles.pickerCardioThumb : styles.pickerThumb} /> : <Text style={styles.pickerEmoji}>{ex.icon_emoji || '●'}</Text>}
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

        <Modal visible={showExerciseGuide} animationType="slide" transparent onRequestClose={() => setShowExerciseGuide(false)}>
          <View style={styles.modalShade}>
            <View style={styles.guideSheet}>
              <View style={styles.pickerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideKicker}>MOVEMENT GUIDE</Text>
                  <Text style={styles.guideTitle}>{current?.exercise.name ?? 'Exercise'}</Text>
                </View>
                <Pressable onPress={() => setShowExerciseGuide(false)} accessibilityLabel="Close movement guide"><Text style={styles.pickerClose}>×</Text></Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.guideImageStage}>
                  {img ? <Image source={img} style={styles.guideImage}/> : null}
                </View>
                {current ? <>
                  <View style={styles.guideFacts}>
                    <View style={styles.guideFact}><Text style={styles.guideFactLabel}>TARGET</Text><Text style={styles.guideFactValue}>{current.exercise.targetArea}</Text></View>
                    <View style={styles.guideFact}><Text style={styles.guideFactLabel}>EQUIPMENT</Text><Text style={styles.guideFactValue}>{current.exercise.equipment}</Text></View>
                  </View>
                  <Text style={styles.guideSectionTitle}>QUICK CUES</Text>
                  {guideCues.map((cue, index) => <View key={`${cue}-${index}`} style={styles.guideCueRow}><Text style={styles.guideCueNumber}>{index + 1}</Text><Text style={styles.guideCueText}>{cue}</Text></View>)}
                  <Text style={styles.guideSafetyNote}>Use a controlled range that feels stable. Stop the set if you cannot maintain the position shown.</Text>
                </> : null}
              </ScrollView>
              <Button title="BACK TO WORKOUT" onPress={() => setShowExerciseGuide(false)}/>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
      {celebrationModal}
      </>
    );
  }

  return (
    <>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullRefresh} colors={[colors.primary]} tintColor={colors.primary} progressBackgroundColor={colors.panel}/>} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.browseHeader}>
          <View>
            <Text style={styles.browseTitle}>{activeStartedAt ? 'WORKOUT RUNNING' : editingTemplateId ? 'EDIT SAVED WORKOUT' : muscleFilter === 'All' && searchMode ? 'ALL EXERCISES' : muscleFilter === 'All' ? 'TRAIN' : `${muscleFilter.toUpperCase()} EXERCISES`}</Text>
            <Text style={styles.browseSub}>
              {activeStartedAt ? `${formatTime(elapsed)} elapsed • ${builder.length} exercise${builder.length === 1 ? '' : 's'}` : muscleFilter === 'All' && searchMode ? 'Search the complete exercise catalogue' : muscleFilter === 'All' ? 'Choose a muscle group' : `Select ${muscleFilter.toLowerCase()} exercises for your workout`}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={()=>{setMuscleFilter('All');setSearchMode(true);}} style={styles.iconButton} accessibilityLabel="Search all exercises"><SearchIcon size={22} color={colors.text}/></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Saved workouts" onPress={()=>setShowSavedWorkouts(!showSavedWorkouts)} style={[styles.savedHeaderButton,showSavedWorkouts&&styles.savedHeaderButtonOn]}><BookmarkIcon size={17} color={showSavedWorkouts ? contrastText(colors.primary) : colors.text}/><Text style={[styles.savedHeaderText,showSavedWorkouts&&{color:contrastText(colors.primary)}]}>Saved Workouts</Text></Pressable>
          </View>
        </View>

        {activeStartedAt ? <Card style={styles.activeResumeCard}>
          <View style={{flex:1}}><Text style={styles.activeResumeTitle}>ACTIVE WORKOUT</Text><Text style={styles.activeResumeName}>{templateName || 'Workout'}</Text><Text style={styles.activeResumeMeta}>{formatTime(elapsed)} • {builder[activeExerciseIndex]?.exercise.name ?? 'In progress'}</Text></View>
          <View style={styles.activeResumeActions}><Pressable onPress={() => setScreen('active')} style={styles.activeResumeButton}><Text style={[styles.activeResumeButtonText,{color:contrastText(colors.primary)}]}>RESUME</Text></Pressable><Pressable onPress={() => Alert.alert('Delete workout?', 'This active workout will be removed and the notification will stop.', [{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:deleteActiveWorkout}])}><Text style={styles.activeResumeDelete}>Delete</Text></Pressable></View>
        </Card> : null}

        {showSavedWorkouts && savedWorkouts.length ? (
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
                    <Text style={[styles.savedStartText,{color:contrastText(colors.primary)}]}>START</Text>
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

        {muscleFilter === 'All' && !searchMode && !query ? <View style={styles.muscleGrid}>{[
          {label:'Chest',image:muscleGridImages[profile.gender === 'female' ? 'female' : 'male'].chest},{label:'Back',image:muscleGridImages[profile.gender === 'female' ? 'female' : 'male'].back},{label:'Shoulders',image:muscleGridImages[profile.gender === 'female' ? 'female' : 'male'].shoulders},{label:'Arms',image:muscleGridImages[profile.gender === 'female' ? 'female' : 'male'].arms},{label:'Legs',image:muscleGridImages[profile.gender === 'female' ? 'female' : 'male'].legs},{label:'Core',image:muscleGridImages[profile.gender === 'female' ? 'female' : 'male'].core},{label:'Full Body',image:muscleGridImages[profile.gender === 'female' ? 'female' : 'male'].fullBody},{label:'Cardio',image:muscleGridImages[profile.gender === 'female' ? 'female' : 'male'].cardio},
        ].map(muscle=>{const count=exerciseLibrary.filter(ex=>muscle.label==='Arms'?['Biceps','Triceps','Forearms','Arms'].includes(ex.targetArea):ex.targetArea===muscle.label).length;return <Pressable key={muscle.label} accessibilityRole="button" accessibilityLabel={`${muscle.label}, ${count} exercises`} onPress={()=>{setSearchMode(false);setMuscleFilter(muscle.label);}} style={({pressed})=>[styles.muscleGridCard,pressed&&{opacity:.7}]}><Image source={muscle.image} style={muscle.label==='Cardio'?styles.muscleGridCardio:styles.muscleGridImage} accessibilityIgnoresInvertColors/><View style={styles.muscleGridCopy}><Text style={styles.muscleGridLabel}>{muscle.label}</Text><Text style={styles.muscleGridCount}>{count} exercises</Text><Text style={styles.muscleGridArrow}>›</Text></View></Pressable>})}</View> : <>
          <View style={styles.exerciseBrowseTop}><Pressable onPress={()=>{setMuscleFilter('All');setSearchMode(false);setQuery('')}}><Text style={styles.exerciseBack}>‹ Muscle groups</Text></Pressable><Text style={styles.exerciseCount}>{filtered.length} exercises</Text></View>
          <Input value={query} onChangeText={setQuery} placeholder={muscleFilter === 'All' ? 'Search all exercises…' : `Search ${muscleFilter.toLowerCase()} exercises…`} style={styles.exerciseSearch} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.equipmentFilters}>{['All','Barbell','Dumbbell','Machine','Bodyweight'].map(x=><Pressable key={x} accessibilityRole="button" accessibilityLabel={`Filter by ${x}`} onPress={()=>setEquipmentFilter(x)} style={[styles.equipmentChip,x===equipmentFilter&&styles.equipmentChipOn]}><Text style={[styles.equipmentChipText,x===equipmentFilter&&styles.equipmentChipTextOn]}>{x}</Text></Pressable>)}</ScrollView>
        </>}

        {builder.length && !activeStartedAt ? (
          <Card style={styles.selectedCard}>
            <View style={styles.selectedTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedTitle}>{builder.length} exercise{builder.length === 1 ? '' : 's'} configured</Text>
                <Text style={styles.selectedMeta}>Preview the order and details, or start immediately.</Text>
              </View>
            </View>
            <View style={styles.previewStartRow}>
              <Pressable onPress={() => setShowWorkoutPreview(true)} style={styles.previewButton}><Text style={styles.previewButtonText}>PREVIEW WORKOUT</Text></Pressable>
              <Pressable onPress={startWorkout} style={styles.startSmall}><Text style={[styles.startSmallText,{color:contrastText(colors.primary)}]}>START NOW</Text></Pressable>
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

        {muscleFilter !== 'All' || searchMode || query ? <View style={styles.exerciseList}>
          {filtered.map((ex) => {
            const img = imageForExercise(ex, profile.gender);
            const selected = builder.some((item) => item.exercise.slug === ex.slug);
            return (
              <Pressable key={ex.slug} accessibilityRole="button" accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${ex.name}, ${ex.targetArea}`} onPress={() => addExercise(ex)} style={styles.exerciseRow}>
                {img ? <View style={styles.thumbFrame}><Image source={img} style={ex.targetArea === 'Cardio' ? styles.cardioThumb : styles.thumb} accessibilityIgnoresInvertColors/></View> : <View style={styles.auditThumb}><Text style={styles.auditThumbText}>{ex.targetArea.slice(0, 1)}</Text></View>}
                <View style={{ flex: 1 }}>
                  <Text style={styles.target}>{ex.targetArea}</Text>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <Text style={styles.exMeta}>
                    {ex.equipment} • {ex.metric_type === 'strength' ? 'sets / reps / weight' : ex.metric_type === 'distance' ? 'distance / duration' : 'duration'}
                  </Text>
                </View>
                <View style={[styles.plus, selected && styles.plusSelected]}>
                  <Text style={[styles.plusText, { color: selected ? contrastText(colors.primary) : colors.primary }]}>{selected ? '✓' : '+'}</Text>
                </View>
              </Pressable>
            );
          })}
        </View> : null}
      </ScrollView>
      <Modal visible={showWorkoutPreview} transparent animationType="slide" onRequestClose={() => setShowWorkoutPreview(false)}>
        <View style={styles.modalShade}>
          <View style={styles.previewSheet}>
            <View style={styles.pickerHeader}>
              <View style={{ flex: 1 }}><Text style={styles.pickerTitle}>Preview Workout</Text><Text style={styles.pickerSubtitle}>Review the exercises and change their order before you begin.</Text></View>
              <Pressable onPress={() => setShowWorkoutPreview(false)} accessibilityLabel="Close workout preview"><Text style={styles.pickerClose}>×</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.previewList}>
              {builder.map((item, index) => {
                const icon = imageForExercise(item.exercise, profile.gender);
                return <View key={item.id} style={styles.previewExerciseRow}>
                  <View style={styles.previewNumber}><Text style={styles.previewNumberText}>{index + 1}</Text></View>
                  {icon ? <View style={styles.previewThumbFrame}><Image source={icon} style={styles.previewThumb}/></View> : null}
                  <View style={styles.previewCopy}><Text style={styles.previewName}>{item.exercise.name}</Text><Text style={styles.previewMeta}>{item.exercise.targetArea} • {item.exercise.equipment}</Text><Text style={styles.previewMeta}>{item.exercise.metric_type === 'strength' ? `${item.strengthSets.length} sets` : item.exercise.metric_type === 'distance' ? 'Distance / duration' : 'Duration'}</Text></View>
                  <View style={styles.previewOrder}>
                    <Pressable disabled={index === 0} onPress={() => moveExercise(index, index - 1)} style={[styles.previewOrderButton, index === 0 && styles.previewOrderDisabled]}><Text style={styles.previewOrderText}>↑</Text></Pressable>
                    <Pressable disabled={index === builder.length - 1} onPress={() => moveExercise(index, index + 1)} style={[styles.previewOrderButton, index === builder.length - 1 && styles.previewOrderDisabled]}><Text style={styles.previewOrderText}>↓</Text></Pressable>
                  </View>
                </View>;
              })}
            </ScrollView>
            <View style={styles.previewFooter}>
              <Pressable onPress={() => setShowWorkoutPreview(false)} style={styles.previewEditButton}><Text style={styles.previewEditText}>KEEP EDITING</Text></Pressable>
              <Pressable onPress={() => { setShowWorkoutPreview(false); startWorkout(); }} style={styles.previewStartButton}><Text style={[styles.previewStartText,{color:contrastText(colors.primary)}]}>START WORKOUT</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
    {celebrationModal}
    </>
  );
});

export default WorkoutTab;

function movementGuide(exercise: LibraryExercise) {
  const name = exercise.name.toLowerCase();
  if (exercise.targetArea === 'Cardio') return [
    'Begin at an easy pace and settle into a smooth, repeatable rhythm.',
    'Keep your posture tall and use the machine or route controls gradually.',
    'Record the distance or time shown when the interval is complete.',
  ];
  if (/deadlift|good morning|row/.test(name)) return [
    'Set your feet and brace before the weight leaves its start position.',
    'Keep a long, neutral spine while the hips and shoulders move together.',
    'Control the return and reset your position before the next repetition.',
  ];
  if (/squat|lunge|step-up|split squat/.test(name)) return [
    'Use a balanced stance with the whole foot supported.',
    'Track the knees in the same direction as the toes.',
    'Move through a controlled range and finish each repetition standing stable.',
  ];
  if (/press|push-up|dip|fly/.test(name)) return [
    'Set the shoulders securely before beginning the repetition.',
    'Keep the wrists stacked and move the load with control.',
    'Finish without forcing the joint past a comfortable range.',
  ];
  if (/pull-up|pulldown|curl|pull|raise/.test(name)) return [
    'Start from a stable torso and a controlled shoulder position.',
    'Move without swinging or using momentum to rush the repetition.',
    'Pause briefly at the working position, then return smoothly.',
  ];
  if (/plank|crunch|sit-up|twist|wheel|wiper|core/.test(name) || exercise.targetArea === 'Core') return [
    'Set a stable trunk position before moving the arms or legs.',
    'Keep the motion slow enough to avoid using momentum.',
    'End the repetition when you can no longer keep the position controlled.',
  ];
  return [
    'Match the setup and body position shown in the exercise image.',
    'Use smooth repetitions and keep the movement under control.',
    'Choose a resistance that lets your technique stay consistent.',
  ];
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
  const { colors, weightUnit, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  return (
    <View style={styles.setList}>
      {item.strengthSets.map((set, index) => (
        <View key={set.id} style={[styles.setCard, set.done && styles.setCardDone]}>
          <View style={styles.setCardHeader}>
            <View style={[styles.setNumber, set.done && styles.setNumberDone]}><Text style={[styles.setNumberText, set.done && { color: colors.green }]}>{set.done ? '✓' : index + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.setCardTitle}>Set {index + 1}</Text>
              <Text style={[styles.setCardState, set.done && { color: colors.green }]}>{set.done ? 'Completed' : active ? 'Ready to record' : 'Planned set'}</Text>
            </View>
            <Pressable onPress={() => onRemove(set.id)} style={styles.setRemoveButton} accessibilityLabel={`Remove set ${index + 1}`}>
              <Text style={styles.setRemoveText}>−</Text>
            </Pressable>
          </View>
          <View style={styles.setFields}>
            <SetStepper label={`Weight (${weightUnit})`} value={set.weight} onChange={(value) => onSet(set.id, { weight: value })} step={weightUnit === 'kg' ? 2.5 : 5}/>
            <SetStepper label="Reps" value={set.reps} onChange={(value) => onSet(set.id, { reps: value })} step={1} whole/>
          </View>
          {active ? <Pressable onPress={() => onToggle(set.id)} style={[styles.completeSetButton, set.done && styles.completeSetButtonDone]}><Text style={[styles.completeSetText, set.done && { color: colors.green }]}>{set.done ? '✓  SET COMPLETE' : 'MARK SET COMPLETE'}</Text></Pressable> : null}
        </View>
      ))}
      {item.strengthSets.length === 1 ? <Text style={styles.minimumSetHint}>Keep at least one set, or remove the exercise instead.</Text> : null}
    </View>
  );
}

function SetStepper({ label, value, onChange, step, whole = false }: { label: string; value: string; onChange: (value: string) => void; step: number; whole?: boolean }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const adjust = (direction: -1 | 1) => {
    const current = Number(value) || 0;
    const next = Math.max(0, current + step * direction);
    onChange(whole ? String(Math.round(next)) : String(Math.round(next * 10) / 10));
  };
  return <View style={styles.stepperField}>
    <Text style={styles.stepperLabel}>{label}</Text>
    <View style={styles.stepperControl}>
      <Pressable onPress={() => adjust(-1)} style={styles.stepperButton}><Text style={styles.stepperButtonText}>−</Text></Pressable>
      <Input value={value} onChangeText={onChange} keyboardType={whole ? 'number-pad' : 'decimal-pad'} placeholder="0" style={styles.stepperInput}/>
      <Pressable onPress={() => adjust(1)} style={styles.stepperButton}><Text style={styles.stepperButtonText}>＋</Text></Pressable>
    </View>
  </View>;
}

function CardioInputs({ item, onChange }: { item: BuilderItem; onChange: (patch: Partial<BuilderItem>) => void }) {
  const { colors, weightUnit, distanceUnit, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const [ftms,setFtms]=useState<FtmsState|null>(null);
  const [machine,setMachine]=useState<FtmsMetrics|null>(null);
  const connect=async()=>{try{await connectFirstFtms((state,name)=>{setFtms(state);if(state==='connected')Alert.alert('Equipment connected',name??'Compatible FTMS machine');if(state==='lost')Alert.alert('Equipment disconnected','Captured fields remain available. Reconnect or continue manually.');},metrics=>{setMachine(previous=>({...previous,...metrics}));const patch:Partial<BuilderItem>={};if(metrics.distanceKm!=null)patch.distance=String(kmToDisplay(metrics.distanceKm,distanceUnit).toFixed(2));if(metrics.elapsedSeconds!=null)patch.duration=String((metrics.elapsedSeconds/60).toFixed(1));onChange(patch);});}catch(e:any){setFtms('unsupported');Alert.alert('Equipment connection',e?.message??"This machine doesn't support FitHub connectivity.",[{text:'Track manually'}]);}};
  return (
    <View>
      <Text style={styles.cardioHint}>Record the fields that best match this exercise. You can change them during the workout.</Text>
      <OutlineButton title={ftms==='searching'?'Searching…':ftms==='connecting'?'Connecting…':ftms==='connected'?'Equipment connected':'Connect Equipment'} onPress={connect} disabled={ftms==='searching'||ftms==='connecting'||ftms==='connected'}/>
      <Text style={styles.cardioHint}>FitHub records movement and equipment metrics the machine exposes. Manual tracking remains available.</Text>
      {machine?<View style={styles.machineMetrics}><Text style={styles.machineTitle}>MACHINE-REPORTED</Text><Text style={styles.cardioHint}>{[machine.speedKph!=null?`${machine.speedKph.toFixed(1)} km/h`:null,machine.inclinePercent!=null?`${machine.inclinePercent.toFixed(1)}% incline`:null,machine.resistanceLevel!=null?`Level ${machine.resistanceLevel}`:null,machine.cadenceRpm!=null?`${machine.cadenceRpm.toFixed(0)} rpm`:null,machine.watts!=null?`${machine.watts} W`:null,machine.heartRate!=null?`${machine.heartRate} bpm`:null].filter(Boolean).join('  •  ')||'Connected; waiting for supported metrics.'}</Text></View>:null}
      {item.exercise.allowsLoad ? (
        <Input value={item.load} onChangeText={(value) => onChange({ load: value })} keyboardType="decimal-pad" placeholder={`Load (${weightUnit}), if used`} />
      ) : null}
      <View style={styles.two}>
        {item.exercise.metric_type === 'distance' ? (
          <Input style={{ flex: 1 }} value={item.distance} onChangeText={(value) => onChange({ distance: value })} keyboardType="decimal-pad" placeholder={`Distance (${distanceUnit})`} />
        ) : null}
        <Input style={{ flex: 1 }} value={item.duration} onChangeText={(value) => onChange({ duration: value })} keyboardType="decimal-pad" placeholder="Duration (min)" />
      </View>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  wrap: { padding: 16, paddingTop: 10, paddingBottom: 128, backgroundColor: colors.bg, flexGrow: 1 },
  browseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  browseTitle: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: .3 },
  browseSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  newWorkoutText: { color: colors.blue, fontSize: 11, fontWeight: '900', borderWidth: 1, borderColor: colors.blue, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  headerActions:{flexDirection:'row',alignItems:'center',gap:8},
  iconButton:{width:48,height:48,borderRadius:12,alignItems:'center',justifyContent:'center'},
  savedHeaderButton:{minHeight:48,paddingHorizontal:12,borderWidth:1,borderColor:colors.border,borderRadius:11,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:colors.panel},
  savedHeaderButtonOn:{backgroundColor:colors.primary,borderColor:colors.primary},
  savedHeaderText:{color:colors.text,fontSize:10,fontWeight:'900'},
  activeResumeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  activeResumeTitle: { color: colors.primary, fontWeight: '900', fontSize: 9 },
  activeResumeName: { color: colors.text, fontWeight: '900', fontSize: 17, marginTop: 3 },
  activeResumeMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  activeResumeActions: { alignItems: 'center', gap: 7 },
  activeResumeButton: { minHeight: 48, backgroundColor: colors.primary, borderRadius: 9, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  activeResumeButtonText: { color: '#fff', fontWeight: '900', fontSize: 10 },
  activeResumeDelete: { color: colors.danger, fontWeight: '800', fontSize: 10 },
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
  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 18, marginBottom: 14 },
  muscleGridCard: { width: '48.5%', aspectRatio: .82, backgroundColor: 'transparent', borderWidth: 0, position: 'relative' },
  muscleGridImage: { width: '100%', height: '78%', resizeMode: 'contain', backgroundColor: 'transparent' },
  muscleGridCardio: { width: '100%', height: '78%', resizeMode: 'contain', backgroundColor: 'transparent' },
  muscleGridCopy:{height:'22%',justifyContent:'center',alignItems:'center',paddingHorizontal:4,backgroundColor:'transparent',transform:[{translateX:4}]},
  muscleGridLabel: { color: colors.text, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  muscleGridCount:{color:colors.muted,fontSize:10,marginTop:1,textAlign:'center'},
  muscleGridArrow:{position:'absolute',right:6,top:8,color:colors.text,fontSize:27,fontWeight:'400'},
  exerciseBrowseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  exerciseBack: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  exerciseCount: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  exerciseSearch: { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
  equipmentFilters: { gap: 7, paddingBottom: 12 },
  equipmentChip: { minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
  equipmentChipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  equipmentChipText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  equipmentChipTextOn: { color: colors.primary },
  muscleChoice: { alignItems: 'center', width: 58 },
  circle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  circleActive: { borderColor: colors.primary },
  circleIcon: { width: 22, height: 22, resizeMode: 'contain' },
  circleAnatomy: { width: 46, height: 46, resizeMode: 'contain' },
  circleCardio: { width: 48, height: 48, resizeMode: 'cover' },
  choiceLabel: { color: colors.muted, fontSize: 9, marginTop: 5 },
  choiceLabelActive: { color: colors.primary, fontWeight: '900' },
  selectedCard: { padding: 12 },
  selectedTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedTitle: { color: colors.text, fontWeight: '900' },
  selectedMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  previewStartRow: { flexDirection: 'row', gap: 8, marginTop: 11 },
  previewButton: { flex: 1, minHeight: 48, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
  previewButtonText: { color: colors.primary, fontWeight: '900', fontSize: 10 },
  startSmall: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  startSmallText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  builderButtons: { marginTop: 9 },
  saveOutline: { borderWidth: 1.5, borderColor: colors.blue, borderRadius: 9, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
  saveOutlineText: { color: colors.blue, fontWeight: '900', fontSize: 11 },
  saveForm: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  cancelSave: { color: colors.muted, textAlign: 'center', fontWeight: '800', fontSize: 11, paddingVertical: 7 },
  repeat: { alignSelf: 'flex-start', paddingVertical: 8 },
  repeatText: { color: colors.blue, fontWeight: '800', fontSize: 11 },
  exerciseList: { gap: isDark ? 10 : 0 },
  exerciseRow: { minHeight: 128, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: isDark ? colors.panel : 'transparent', borderWidth: isDark ? 1 : 0, borderBottomWidth: 1, borderColor: colors.border, borderRadius: isDark ? 17 : 0, paddingHorizontal: isDark ? 10 : 0, paddingVertical: 10, overflow: 'hidden' },
  thumbFrame: { width: 136, height: 100, borderRadius: isDark ? 14 : 0, backgroundColor: isDark ? '#FFFFFF' : 'transparent', borderWidth: isDark ? 1 : 0, borderColor: isDark ? '#E6EDF0' : 'transparent', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: isDark ? 4 : 0 },
  thumb: { width: '100%', height: '100%', resizeMode: 'contain' },
  cardioThumb: { width: '100%', height: '100%', resizeMode: 'contain' },
  auditThumb: { width: 126, height: 92, borderRadius: 12, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  auditThumbText: { color: colors.primary, fontSize: 26, fontWeight: '900' },
  blankThumb: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2, borderRadius: 10 },
  listEmoji: { fontSize: 26 },
  target: { color: colors.primary, fontWeight: '900', fontSize: 10 },
  exName: { color: colors.text, fontWeight: '900', fontSize: 14, marginTop: 1 },
  exMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  plus: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  plusSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  plusText: { fontWeight: '900', fontSize: 20, lineHeight: 22 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  back: { color: colors.text, fontSize: 36, fontWeight: '300' },
  detailTitle: { color: colors.text, fontSize: 19, fontWeight: '900', maxWidth: '75%', textAlign: 'center' },
  more: { color: colors.text, fontSize: 16, fontWeight: '900' },
  detailHero: { flexDirection: 'row', minHeight: 250, alignItems: 'center' },
  detailImageFrame: { flex: 1, height: 250, marginRight: 10, borderRadius: isDark ? 18 : 0, backgroundColor: isDark ? '#FFFFFF' : 'transparent', borderWidth: isDark ? 1 : 0, borderColor: isDark ? '#E6EDF0' : 'transparent', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: isDark ? 5 : 0 },
  detailFigure: { width: '100%', height: '100%', resizeMode: 'contain', backgroundColor: 'transparent' },
  detailCardioFigure: { width: '100%', height: '100%', resizeMode: 'contain', backgroundColor: 'transparent' },
  visualPending: { flex: 1, minHeight: 120, borderRadius: 14, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 14 },
  visualPendingTitle: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  visualPendingText: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 5 },
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
  setList: { gap: 10, marginTop: 4 },
  setCard: { backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 11 },
  setCardDone: { backgroundColor: colors.greenSoft, borderColor: colors.green, opacity: .68 },
  setCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 9 },
  setNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  setNumberDone: { backgroundColor: colors.greenSoft },
  setNumberText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  setCardTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  setCardState: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 1 },
  setRemoveButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' },
  setRemoveText: { color: colors.muted, fontSize: 24, lineHeight: 26 },
  setFields: { flexDirection: 'row', gap: 9 },
  stepperField: { flex: 1 },
  stepperLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', marginBottom: 5, textAlign: 'center' },
  stepperControl: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.input, overflow: 'hidden' },
  stepperButton: { width: 40, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
  stepperButtonText: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  stepperInput: { flex: 1, minHeight: 46, marginBottom: 0, borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent', paddingHorizontal: 2, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  completeSetButton: { minHeight: 48, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  completeSetButtonDone: { backgroundColor: colors.greenSoft, borderWidth: 1, borderColor: colors.green },
  completeSetText: { color: contrastText(colors.primary), fontSize: 10, fontWeight: '900', letterSpacing: .2 },
  minimumSetHint: { color: colors.muted, fontSize: 9, marginTop: 6, textAlign: 'center' },
  two: { flexDirection: 'row', gap: 8 },
  cardioHint: { color: colors.muted, fontSize: 11, marginBottom: 9 },
  machineMetrics: { backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.green, borderRadius: 10, padding: 10, marginBottom: 9 },
  machineTitle: { color: colors.green, fontSize: 9, fontWeight: '900', marginBottom: 4 },
  activeWrap: { padding: 16, paddingTop: 10, paddingBottom: 128, backgroundColor: colors.bg },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeHeaderButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  exit: { color: colors.text, fontSize: 14 },
  activeTitle: { color: colors.text, fontWeight: '900', fontSize: 18, maxWidth: '62%' },
  activeAdd: { color: colors.blue, fontSize: 27, lineHeight: 28, fontWeight: '500' },
  sharedBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 13, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, padding: 11, marginTop: 9 },
  sharedBannerTitle: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: .35 },
  sharedBannerText: { color: colors.text, fontSize: 10, lineHeight: 15, marginTop: 2 },
  sharedLiveDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.panel },
  sessionOverview: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginTop: 12, marginBottom: 11 },
  sessionMetricPrimary: { flex: 1.45, minHeight: 68, borderRadius: 14, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, padding: 11, justifyContent: 'center' },
  sessionMetric: { flex: .85, minHeight: 68, borderRadius: 14, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, padding: 9, justifyContent: 'center' },
  sessionMetricLabel: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: .25 },
  sessionTimer: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 3 },
  sessionMetricValue: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 2 },
  sessionMetricSub: { color: colors.muted, fontSize: 8, marginTop: 1 },
  sessionAddButton: { width: 58, minHeight: 68, borderRadius: 14, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sessionAddIcon: { color: colors.primary, fontSize: 23, lineHeight: 24, fontWeight: '800' },
  sessionAddText: { color: colors.primary, fontSize: 9, fontWeight: '900', marginTop: 2 },
  activeExercises: { gap: 7, paddingBottom: 12 },
  activeExerciseChip: { width: 142, minHeight: 58, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.panel, padding: 10, justifyContent: 'center' },
  activeExerciseSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  activeExerciseDone: { backgroundColor: colors.panel2, opacity: .76 },
  activeExerciseName: { color: colors.text, fontWeight: '900', fontSize: 11 },
  activeExerciseState: { color: colors.muted, fontSize: 8, marginTop: 4, fontWeight: '900' },
  liveCard: { padding: isDark ? 13 : 0, borderRadius: 19, backgroundColor: isDark ? colors.panel : 'transparent', borderWidth: isDark ? 1 : 0, borderColor: colors.border },
  liveProgressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  liveProgressText: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: .25 },
  liveFigureStage: { width: '100%', minHeight: 276, borderRadius: isDark ? 18 : 0, backgroundColor: isDark ? '#FFFFFF' : 'transparent', borderWidth: isDark ? 1 : 0, borderColor: isDark ? '#E6EDF0' : 'transparent', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 6, padding: isDark ? 5 : 0 },
  liveFigure: { width: '100%', height: 286, resizeMode: 'contain', backgroundColor: 'transparent' },
  liveCardioFigure: { width: '100%', height: 270, resizeMode: 'contain', backgroundColor: 'transparent' },
  guideHint: { position: 'absolute', right: 4, bottom: 5, borderRadius: 999, backgroundColor: isDark ? 'rgba(0,0,0,.58)' : 'rgba(255,255,255,.88)', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6 },
  guideHintText: { color: colors.text, fontSize: 8, fontWeight: '900' },
  liveIconBox: { width: 135, height: 150, alignItems: 'center', justifyContent: 'center' },
  liveEmoji: { fontSize: 66 },
  liveTitleRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 11, marginBottom: 7 },
  liveMuscles: { flex: 1 },
  liveName: { color: colors.text, fontSize: 21, fontWeight: '900' },
  primaryLabel: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  liveMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  guideButton: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  guideButtonText: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  setProgressNote: { color: colors.muted, fontSize: 9, fontWeight: '800', marginBottom: 4 },
  activeRemoveExercise: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingTop: 11, paddingBottom: 3 },
  activeRemoveExerciseText: { color: colors.danger, fontWeight: '800', fontSize: 10 },
  deleteActiveButton: { minHeight: 48, borderWidth: 1, borderColor: colors.danger, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  deleteActiveText: { color: colors.danger, fontWeight: '900', fontSize: 11 },
  restBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 13, padding: 12, marginBottom: 8 },
  restLabel: { color: colors.blue, fontSize: 9, fontWeight: '900' },
  restTime: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 2 },
  skip: { minHeight: 48, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.blue, borderRadius: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: colors.blue, fontWeight: '900', fontSize: 11 },
  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,.48)', justifyContent: 'flex-end' },
  pickerSheet: { height: '78%', backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 16 },
  guideSheet: { height: '92%', backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: colors.border, padding: 16 },
  guideKicker: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: .35 },
  guideTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 3 },
  guideImageStage: { height: 268, borderRadius: isDark ? 18 : 0, backgroundColor: isDark ? '#FFFFFF' : 'transparent', borderWidth: isDark ? 1 : 0, borderColor: isDark ? '#E6EDF0' : 'transparent', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: isDark ? 5 : 0 },
  guideImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  guideFacts: { flexDirection: 'row', gap: 9, marginTop: 5, marginBottom: 14 },
  guideFact: { flex: 1, minHeight: 68, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 10 },
  guideFactLabel: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: .2 },
  guideFactValue: { color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: '800', marginTop: 5 },
  guideSectionTitle: { color: colors.text, fontSize: 13, fontWeight: '900', marginBottom: 8 },
  guideCueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 9 },
  guideCueNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primarySoft, color: colors.primary, fontSize: 10, fontWeight: '900', textAlign: 'center', lineHeight: 24 },
  guideCueText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 18 },
  guideSafetyNote: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 4, marginBottom: 12 },
  previewSheet: { maxHeight: '86%', minHeight: '62%', backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 16 },
  previewList: { gap: 9, paddingBottom: 12 },
  previewExerciseRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 8 },
  previewNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  previewNumberText: { color: colors.primary, fontSize: 10, fontWeight: '900' },
  previewThumbFrame: { width: 76, height: 56, borderRadius: isDark ? 9 : 0, backgroundColor: isDark ? '#FFFFFF' : 'transparent', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: isDark ? 3 : 0 },
  previewThumb: { width: '100%', height: '100%', resizeMode: 'contain' },
  previewCopy: { flex: 1 },
  previewName: { color: colors.text, fontSize: 12, fontWeight: '900' },
  previewMeta: { color: colors.muted, fontSize: 9, marginTop: 3 },
  previewOrder: { gap: 5 },
  previewOrderButton: { width: 30, height: 28, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  previewOrderDisabled: { opacity: .25 },
  previewOrderText: { color: colors.text, fontSize: 15, fontWeight: '900' },
  previewFooter: { flexDirection: 'row', gap: 9, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  previewEditButton: { flex: 1, minHeight: 46, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  previewEditText: { color: colors.primary, fontSize: 10, fontWeight: '900' },
  previewStartButton: { flex: 1, minHeight: 46, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  previewStartText: { fontSize: 10, fontWeight: '900' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  pickerTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  pickerSubtitle: { color: colors.muted, fontSize: 10, marginTop: 2 },
  pickerClose: { color: colors.text, fontSize: 31, fontWeight: '300' },
  pickerExerciseRow: { minHeight: 66, flexDirection: 'row', gap: 9, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 7 },
  pickerThumb: { width: 56, height: 52, resizeMode: 'contain', backgroundColor: isDark ? '#FFFFFF' : 'transparent', borderRadius: isDark ? 9 : 0 },
  pickerCardioThumb: { width: 56, height: 52, resizeMode: 'contain', backgroundColor: isDark ? '#FFFFFF' : 'transparent', borderRadius: isDark ? 9 : 0 },
  pickerEmoji: { width: 49, textAlign: 'center', fontSize: 27 },
  pickerExerciseName: { color: colors.text, fontWeight: '900', fontSize: 13 },
  pickerExerciseMeta: { color: colors.muted, fontSize: 9, marginTop: 3 },
  pickerPlus: { color: colors.blue, fontSize: 24, width: 30, textAlign: 'center' },
});
