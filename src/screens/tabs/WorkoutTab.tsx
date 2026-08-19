import React, { useEffect, useMemo, useState } from 'react';
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
const formatTime = (sec: number) => {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const exerciseImages = {
  benchPress: require('../../../assets/train_v2/movements/bench_press.png'),
  inclinePress: require('../../../assets/train_v2/movements/incline_press.png'),
  pushUp: require('../../../assets/train_v2/movements/push_up.png'),
  cableFly: require('../../../assets/train_v2/movements/cable_fly.png'),
  shoulderPress: require('../../../assets/train_v2/movements/shoulder_press.png'),
  lateralRaise: require('../../../assets/train_v2/movements/lateral_raise.png'),
  bentRow: require('../../../assets/train_v2/movements/bent_row.png'),
  latPulldown: require('../../../assets/train_v2/movements/lat_pulldown.png'),
  pullUp: require('../../../assets/train_v2/movements/pull_up.png'),
  bicepsCurl: require('../../../assets/train_v2/movements/biceps_curl.png'),
  tricepsPushdown: require('../../../assets/train_v2/movements/triceps_pushdown.png'),
  dip: require('../../../assets/train_v2/movements/dip.png'),
  squat: require('../../../assets/train_v2/movements/squat.png'),
  deadlift: require('../../../assets/train_v2/movements/deadlift.png'),
  lunge: require('../../../assets/train_v2/movements/lunge.png'),
  legPress: require('../../../assets/train_v2/movements/leg_press.png'),
  hipThrust: require('../../../assets/train_v2/movements/hip_thrust.png'),
  legCurl: require('../../../assets/train_v2/movements/leg_curl.png'),
  calfRaise: require('../../../assets/train_v2/movements/calf_raise.png'),
  plank: require('../../../assets/train_v2/movements/plank.png'),
  crunch: require('../../../assets/train_v2/movements/crunch.png'),
  hangingLegRaise: require('../../../assets/train_v2/movements/hanging_leg_raise.png'),
  russianTwist: require('../../../assets/train_v2/movements/russian_twist.png'),
  abWheel: require('../../../assets/train_v2/movements/ab_wheel.png'),
  powerClean: require('../../../assets/train_v2/movements/power_clean.png'),
  snatch: require('../../../assets/train_v2/movements/snatch.png'),
  kettlebellSwing: require('../../../assets/train_v2/movements/kettlebell_swing.png'),
  farmerCarry: require('../../../assets/train_v2/movements/farmer_carry.png'),
  battleRopes: require('../../../assets/train_v2/movements/battle_ropes.png'),
  boxJump: require('../../../assets/train_v2/movements/box_jump.png'),
  outdoorRun: require('../../../assets/train_v2/movements/outdoor_run.png'),
  treadmill: require('../../../assets/train_v2/movements/treadmill.png'),
  cycling: require('../../../assets/train_v2/movements/cycling.png'),
  rowing: require('../../../assets/train_v2/movements/rowing.png'),
  stairClimber: require('../../../assets/train_v2/movements/stair_climber.png'),
  jumpRope: require('../../../assets/train_v2/movements/jump_rope.png'),
};

const muscleGridImages = {
  chest: require('../../../assets/train_v2/groups/chest.png'),
  back: require('../../../assets/train_v2/groups/back.png'),
  shoulders: require('../../../assets/train_v2/groups/shoulders.png'),
  arms: require('../../../assets/train_v2/groups/arms.png'),
  legs: require('../../../assets/train_v2/groups/legs.png'),
  core: require('../../../assets/train_v2/groups/core.png'),
  fullBody: require('../../../assets/train_v2/groups/full_body.png'),
  cardio: require('../../../assets/train_v2/groups/cardio.png'),
};

const imageForExercise = (exercise: LibraryExercise) => {
  const name = exercise.name.toLowerCase();
  if (name.includes('incline') && (name.includes('press') || name.includes('bench'))) return exerciseImages.inclinePress;
  if (name.includes('bench press') || name.includes('chest press') || name.includes('floor press')) return exerciseImages.benchPress;
  if (name.includes('push-up') || name.includes('push up')) return exerciseImages.pushUp;
  if (name.includes('fly') || name.includes('pec deck')) return exerciseImages.cableFly;
  if (name.includes('dip')) return exerciseImages.dip;
  if (name.includes('pulldown')) return exerciseImages.latPulldown;
  if (name.includes('pull-up') || name.includes('pull up') || name.includes('chin-up')) return exerciseImages.pullUp;
  if (name.includes('row') && exercise.targetArea !== 'Cardio') return exerciseImages.bentRow;
  if (name.includes('curl') && !name.includes('leg')) return exerciseImages.bicepsCurl;
  if (exercise.targetArea === 'Triceps' || name.includes('pushdown') || name.includes('skull crusher') || name.includes('tricep kickback')) return exerciseImages.tricepsPushdown;
  if (exercise.targetArea === 'Shoulders' && (name.includes('press') || name.includes('jerk'))) return exerciseImages.shoulderPress;
  if (exercise.targetArea === 'Shoulders') return exerciseImages.lateralRaise;
  if (name.includes('hip thrust') || name.includes('glute bridge') || name.includes('frog pump')) return exerciseImages.hipThrust;
  if (name.includes('leg curl') || name.includes('nordic curl') || name.includes('glute ham')) return exerciseImages.legCurl;
  if (name.includes('calf') || name.includes('tibialis')) return exerciseImages.calfRaise;
  if (name.includes('leg press') || name.includes('hack squat')) return exerciseImages.legPress;
  if (name.includes('deadlift') || name.includes('good morning')) return exerciseImages.deadlift;
  if (name.includes('lunge') || name.includes('split squat') || name.includes('step-up')) return exerciseImages.lunge;
  if (name.includes('squat')) return exerciseImages.squat;
  if (name.includes('ab wheel')) return exerciseImages.abWheel;
  if (name.includes('leg raise') || name.includes('knee raise') || name.includes('toes-to-bar') || name.includes('v-ups')) return exerciseImages.hangingLegRaise;
  if (name.includes('russian twist') || name.includes('windshield')) return exerciseImages.russianTwist;
  if (name.includes('crunch') || name.includes('sit-up') || name.includes('wood chop')) return exerciseImages.crunch;
  if (exercise.targetArea === 'Core') return exerciseImages.plank;
  if (name.includes('snatch')) return exerciseImages.snatch;
  if (name.includes('clean') || name.includes('jerk')) return exerciseImages.powerClean;
  if (name.includes('kettlebell swing')) return exerciseImages.kettlebellSwing;
  if (name.includes('carry') || name.includes("farmer's walk") || name.includes('yoke walk') || name.includes('sled')) return exerciseImages.farmerCarry;
  if (name.includes('battle rope')) return exerciseImages.battleRopes;
  if (name.includes('jump') || name.includes('bounding') || name.includes('agility ladder')) return exerciseImages.boxJump;
  if (name.includes('jump rope')) return exerciseImages.jumpRope;
  if (name.includes('stair') || name.includes('versaclimber') || name.includes('elliptical')) return exerciseImages.stairClimber;
  if (name.includes('rowing') || name.includes('skierg')) return exerciseImages.rowing;
  if (name.includes('bike') || name.includes('cycling')) return exerciseImages.cycling;
  if (name.includes('treadmill')) return exerciseImages.treadmill;
  if (exercise.targetArea === 'Cardio') return exerciseImages.outdoorRun;
  if (exercise.targetArea === 'Chest') return muscleGridImages.chest;
  if (exercise.targetArea === 'Back') return muscleGridImages.back;
  if (exercise.targetArea === 'Biceps' || exercise.targetArea === 'Forearms') return muscleGridImages.arms;
  if (exercise.targetArea === 'Legs') return muscleGridImages.legs;
  return muscleGridImages.fullBody;
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

export default function WorkoutTab({
  profile,
  onProfileChanged,
}: {
  profile: Profile;
  onProfileChanged: () => void;
}) {
  const { colors, weightUnit, distanceUnit } = useTheme();
  const styles = createStyles(colors);
  const [screen, setScreen] = useState<ScreenMode>('browse');
  const [detailTab, setDetailTab] = useState<DetailTab>('sets');
  const [detailExercise, setDetailExercise] = useState<LibraryExercise | null>(null);
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string>('All');
  const [equipmentFilter,setEquipmentFilter]=useState('All');
  const [showSavedWorkouts,setShowSavedWorkouts]=useState(false);
  const [builder, setBuilder] = useState<BuilderItem[]>([]);
  const [lastWorkout, setLastWorkout] = useState<BuilderItem[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);
  const [activeRevision, setActiveRevision] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [prEvents, setPrEvents] = useState<NewPrEvent[]>([]);
  const [prSessionId, setPrSessionId] = useState<string | null>(null);
  const [pendingWorkoutShare, setPendingWorkoutShare] = useState<{sessionId:string;summary:string}|null>(null);
  const activeStorageKey = `fithub_active_workout_${profile.id}`;
  const activeRevisionKey = `fithub_active_revision_${profile.id}`;

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
  }, [activeStartedAt, builder, activeExerciseIndex, templateName, editingTemplateId, Math.floor(elapsed / 30)]);

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
  const moveExercise=(from:number,to:number)=>{if(from===to||from<0||to<0||from>=builder.length||to>=builder.length)return;const currentId=builder[activeExerciseIndex]?.id;setBuilder(previous=>{const next=[...previous];const[moved]=next.splice(from,1);next.splice(to,0,moved);const newCurrent=next.findIndex(x=>x.id===currentId);setActiveExerciseIndex(Math.max(0,newCurrent));return next;});};
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
    const startedAt = Date.now();
    const saved: ActiveSavedState = {
      started_at: startedAt,
      template_name: templateName || 'Workout',
      editing_template_id: editingTemplateId,
      active_index: 0,
      weight_unit: weightUnit,
      distance_unit: distanceUnit,
      items: serializeActive(reset, weightUnit, distanceUnit),
    };
    Storage.setItem(activeStorageKey, JSON.stringify(saved)).catch(() => {});
    const first = reset[0];
    if (first) showActiveWorkoutNotification({ userId: profile.id, workoutName: templateName || 'Workout', exerciseName: first.exercise.name, startedAt }).catch(() => {});
    setBuilder(reset);
    setActiveExerciseIndex(0);
    setElapsed(0);
    setRestSeconds(0);
    setActiveStartedAt(startedAt);
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
      const newPrs = insertedRows.length ? await detectAndSavePrEvents({ userId: profile.id, sessionId: session.id, rows: insertedRows, age: profile.age }) : [];
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
    const img = imageForExercise(detailExercise);
    return (
      <>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={styles.detailHeader}>
            <Pressable onPress={() => setScreen('browse')}><Text style={styles.back}>‹</Text></Pressable>
            <Text style={styles.detailTitle}>{detailExercise.name}</Text>
            <Text style={styles.more}>•••</Text>
          </View>
          <View style={styles.detailHero}>
            {img ? (
              <Image source={img} style={detailExercise.targetArea === 'Cardio' ? styles.detailCardioFigure : styles.detailFigure} />
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
    const img = current ? imageForExercise(current.exercise) : undefined;
    return (
      <>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.activeWrap} keyboardShouldPersistTaps="handled">
          <View style={styles.activeHeader}>
            <Pressable
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
                  {!done?<View style={{flexDirection:'row',gap:8,marginTop:5}}>{index>0?<Pressable onPress={()=>moveExercise(index,index-1)}><Text style={styles.activeExerciseState}>↑</Text></Pressable>:null}{index<builder.length-1?<Pressable onPress={()=>moveExercise(index,index+1)}><Text style={styles.activeExerciseState}>↓</Text></Pressable>:null}{index!==activeExerciseIndex?<Pressable onPress={()=>moveExercise(index,Math.min(builder.length-1,activeExerciseIndex+1))}><Text style={styles.activeExerciseState}>NEXT</Text></Pressable>:null}<Pressable onPress={()=>moveExercise(index,builder.length-1)}><Text style={styles.activeExerciseState}>LAST</Text></Pressable></View>:null}
                </Pressable>
              );
            })}
          </ScrollView>

          {current ? (
            <Card style={[styles.liveCard, itemDone(current) && { opacity: 0.72 }]}>
              <View style={styles.liveHero}>
                {img ? (
                  <Image source={img} style={current.exercise.targetArea === 'Cardio' ? styles.liveCardioFigure : styles.liveFigure} />
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
            <Text style={styles.deleteActiveText}>DELETE WORKOUT</Text>
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
                  const icon = imageForExercise(ex);
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
      </KeyboardAvoidingView>
      {celebrationModal}
      </>
    );
  }

  return (
    <>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.browseHeader}>
          <View>
            <Text style={styles.browseTitle}>{activeStartedAt ? 'WORKOUT RUNNING' : editingTemplateId ? 'EDIT SAVED WORKOUT' : muscleFilter === 'All' ? 'TRAIN' : `${muscleFilter.toUpperCase()} EXERCISES`}</Text>
            <Text style={styles.browseSub}>
              {activeStartedAt ? `${formatTime(elapsed)} elapsed • ${builder.length} exercise${builder.length === 1 ? '' : 's'}` : muscleFilter === 'All' ? 'Choose a muscle group' : `Select ${muscleFilter.toLowerCase()} exercises for your workout`}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={()=>setMuscleFilter(muscleFilter==='All'?'Chest':muscleFilter)} style={styles.iconButton}><SearchIcon size={22} color="#FFFFFF"/></Pressable>
            <Pressable onPress={()=>setShowSavedWorkouts(!showSavedWorkouts)} style={[styles.savedHeaderButton,showSavedWorkouts&&styles.savedHeaderButtonOn]}><BookmarkIcon size={17} color="#FFFFFF"/><Text style={[styles.savedHeaderText,showSavedWorkouts&&{color:'#fff'}]}>Saved Workouts</Text></Pressable>
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

        {muscleFilter === 'All' && !query ? <View style={styles.muscleGrid}>{[
          {label:'Chest',image:muscleGridImages.chest},{label:'Back',image:muscleGridImages.back},{label:'Shoulders',image:muscleGridImages.shoulders},{label:'Arms',image:muscleGridImages.arms},{label:'Legs',image:muscleGridImages.legs},{label:'Core',image:muscleGridImages.core},{label:'Full Body',image:muscleGridImages.fullBody},{label:'Cardio',image:muscleGridImages.cardio},
        ].map(muscle=><Pressable key={muscle.label} onPress={()=>setMuscleFilter(muscle.label)} style={({pressed})=>[styles.muscleGridCard,pressed&&{opacity:.7}]}><Image source={muscle.image} style={muscle.label==='Cardio'?styles.muscleGridCardio:styles.muscleGridImage}/><View style={styles.muscleShade}/><Text style={styles.muscleGridLabel}>{muscle.label}</Text></Pressable>)}</View> : <>
          <View style={styles.exerciseBrowseTop}><Pressable onPress={()=>{setMuscleFilter('All');setQuery('')}}><Text style={styles.exerciseBack}>‹ Muscle groups</Text></Pressable><Text style={styles.exerciseCount}>{filtered.length} exercises</Text></View>
          <Input value={query} onChangeText={setQuery} placeholder={`Search ${muscleFilter.toLowerCase()} exercises…`} style={styles.exerciseSearch} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.equipmentFilters}>{['All','Barbell','Dumbbell','Machine','Bodyweight'].map(x=><Pressable key={x} onPress={()=>setEquipmentFilter(x)} style={[styles.equipmentChip,x===equipmentFilter&&styles.equipmentChipOn]}><Text style={[styles.equipmentChipText,x===equipmentFilter&&styles.equipmentChipTextOn]}>{x}</Text></Pressable>)}</ScrollView>
        </>}

        {builder.length && !activeStartedAt ? (
          <Card style={styles.selectedCard}>
            <View style={styles.selectedTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedTitle}>{builder.length} exercise{builder.length === 1 ? '' : 's'} configured</Text>
                <Text style={styles.selectedMeta}>Save it for later, add another exercise, or start now.</Text>
              </View>
              <Pressable onPress={startWorkout} style={styles.startSmall}><Text style={[styles.startSmallText,{color:contrastText(colors.primary)}]}>START</Text></Pressable>
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

        {muscleFilter !== 'All' || query ? <View style={styles.exerciseList}>
          {filtered.map((ex) => {
            const img = imageForExercise(ex);
            const selected = builder.some((item) => item.exercise.slug === ex.slug);
            return (
              <Pressable key={ex.slug} onPress={() => addExercise(ex)} style={styles.exerciseRow}>
                {img ? (
                  <Image source={img} style={ex.targetArea === 'Cardio' ? styles.cardioThumb : styles.thumb} />
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
                  <Text style={[styles.plusText, { color: selected ? '#fff' : '#FF313A' }]}>{selected ? '✓' : '+'}</Text>
                </View>
              </Pressable>
            );
          })}
        </View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
    {celebrationModal}
    </>
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
  const { colors, weightUnit } = useTheme();
  const styles = createStyles(colors);
  return (
    <View>
      <View style={styles.tableHead}>
        <Text style={styles.setCol}>SET</Text>
        <Text style={styles.flexCol}>WEIGHT ({weightUnit})</Text>
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
  const { colors, weightUnit, distanceUnit } = useTheme();
  const styles = createStyles(colors);
  const [ftms,setFtms]=useState<FtmsState|null>(null);
  const [machine,setMachine]=useState<FtmsMetrics|null>(null);
  const connect=async()=>{try{await connectFirstFtms((state,name)=>{setFtms(state);if(state==='connected')Alert.alert('Equipment connected',name??'Compatible FTMS machine');if(state==='lost')Alert.alert('Equipment disconnected','Captured fields remain available. Reconnect or continue manually.');},metrics=>{setMachine(previous=>({...previous,...metrics}));const patch:Partial<BuilderItem>={};if(metrics.distanceKm!=null)patch.distance=String(kmToDisplay(metrics.distanceKm,distanceUnit).toFixed(2));if(metrics.elapsedSeconds!=null)patch.duration=String((metrics.elapsedSeconds/60).toFixed(1));onChange(patch);});}catch(e:any){setFtms('unsupported');Alert.alert('Equipment connection',e?.message??"This machine doesn't support FitHub connectivity.",[{text:'Track manually'}]);}};
  return (
    <View>
      <Text style={styles.cardioHint}>Record the fields that best match this exercise. You can change them during the workout.</Text>
      <OutlineButton title={ftms==='searching'?'Searching…':ftms==='connecting'?'Connecting…':ftms==='connected'?'Equipment connected':'Connect Equipment'} onPress={connect} disabled={ftms==='searching'||ftms==='connecting'||ftms==='connected'}/>
      <Text style={styles.cardioHint}>FitHub records only metrics the machine exposes. Machine-reported calories are labelled separately from FitHub estimates. Manual tracking remains available.</Text>
      {machine?<View style={styles.machineMetrics}><Text style={styles.machineTitle}>MACHINE-REPORTED</Text><Text style={styles.cardioHint}>{[machine.speedKph!=null?`${machine.speedKph.toFixed(1)} km/h`:null,machine.inclinePercent!=null?`${machine.inclinePercent.toFixed(1)}% incline`:null,machine.resistanceLevel!=null?`Level ${machine.resistanceLevel}`:null,machine.cadenceRpm!=null?`${machine.cadenceRpm.toFixed(0)} rpm`:null,machine.watts!=null?`${machine.watts} W`:null,machine.heartRate!=null?`${machine.heartRate} bpm`:null,machine.calories!=null?`${machine.calories} machine kcal`:null].filter(Boolean).join('  •  ')||'Connected; waiting for supported metrics.'}</Text></View>:null}
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

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingTop: 10, paddingBottom: 34, backgroundColor: '#090D11', flexGrow: 1 },
  browseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  browseTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: .3 },
  browseSub: { color: '#A6ABB3', fontSize: 12, marginTop: 2 },
  newWorkoutText: { color: colors.blue, fontSize: 11, fontWeight: '900', borderWidth: 1, borderColor: colors.blue, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  headerActions:{flexDirection:'row',alignItems:'center',gap:8},
  iconButton:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},
  savedHeaderButton:{height:40,paddingHorizontal:12,borderWidth:1,borderColor:'#363C44',borderRadius:11,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:'#12171D'},
  savedHeaderButtonOn:{backgroundColor:'#FF313A',borderColor:'#FF313A'},
  savedHeaderText:{color:'#FFFFFF',fontSize:10,fontWeight:'900'},
  activeResumeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  activeResumeTitle: { color: colors.primary, fontWeight: '900', fontSize: 9 },
  activeResumeName: { color: colors.text, fontWeight: '900', fontSize: 17, marginTop: 3 },
  activeResumeMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  activeResumeActions: { alignItems: 'center', gap: 7 },
  activeResumeButton: { backgroundColor: colors.primary, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9 },
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
  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  muscleGridCard: { width: '48.5%', aspectRatio: 1.18, borderRadius: 15, overflow: 'hidden', backgroundColor: '#11161C', borderWidth: 1, borderColor: '#363C44', position: 'relative' },
  muscleGridImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  muscleGridCardio: { width: '100%', height: '100%', resizeMode: 'cover' },
  muscleShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 48, backgroundColor: 'rgba(5,7,10,.74)' },
  muscleGridLabel: { position: 'absolute', left: 12, bottom: 10, color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  exerciseBrowseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  exerciseBack: { color: '#FF313A', fontSize: 12, fontWeight: '900' },
  exerciseCount: { color: '#A6ABB3', fontSize: 10, fontWeight: '800' },
  exerciseSearch: { backgroundColor: '#151A20', borderColor: '#353B43', color: '#FFFFFF' },
  equipmentFilters: { gap: 7, paddingBottom: 12 },
  equipmentChip: { borderRadius: 999, borderWidth: 1, borderColor: '#363C44', paddingHorizontal: 13, paddingVertical: 7, backgroundColor: '#12171D' },
  equipmentChipOn: { borderColor: '#FF313A', backgroundColor: '#C72A31' },
  equipmentChipText: { color: '#C0C4CA', fontSize: 10, fontWeight: '800' },
  equipmentChipTextOn: { color: '#FFFFFF' },
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
  startSmall: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  startSmallText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  builderButtons: { marginTop: 9 },
  saveOutline: { borderWidth: 1.5, borderColor: colors.blue, borderRadius: 9, minHeight: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
  saveOutlineText: { color: colors.blue, fontWeight: '900', fontSize: 11 },
  saveForm: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  cancelSave: { color: colors.muted, textAlign: 'center', fontWeight: '800', fontSize: 11, paddingVertical: 7 },
  repeat: { alignSelf: 'flex-start', paddingVertical: 8 },
  repeatText: { color: colors.blue, fontWeight: '800', fontSize: 11 },
  exerciseList: { gap: 10 },
  exerciseRow: { minHeight: 94, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#12171D', borderWidth: 1, borderColor: '#363C44', borderRadius: 13, padding: 9, overflow: 'hidden' },
  thumb: { width: 102, height: 72, resizeMode: 'cover', borderRadius: 9, backgroundColor: '#0B0F13' },
  cardioThumb: { width: 102, height: 72, resizeMode: 'cover', borderRadius: 9, backgroundColor: '#0B0F13' },
  blankThumb: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2, borderRadius: 10 },
  listEmoji: { fontSize: 26 },
  target: { color: '#FF3B43', fontWeight: '900', fontSize: 10 },
  exName: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, marginTop: 1 },
  exMeta: { color: '#A6ABB3', fontSize: 10, marginTop: 3 },
  plus: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#FF313A', alignItems: 'center', justifyContent: 'center' },
  plusSelected: { backgroundColor: '#FF313A', borderColor: '#FF313A' },
  plusText: { fontWeight: '900', fontSize: 20, lineHeight: 22 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  back: { color: colors.text, fontSize: 36, fontWeight: '300' },
  detailTitle: { color: colors.text, fontSize: 19, fontWeight: '900', maxWidth: '75%', textAlign: 'center' },
  more: { color: colors.text, fontSize: 16, fontWeight: '900' },
  detailHero: { flexDirection: 'row', minHeight: 250, alignItems: 'center' },
  detailFigure: { flex: 1, height: 250, resizeMode: 'contain' },
  detailCardioFigure: { flex: 1, height: 220, resizeMode: 'cover', borderRadius: 16, marginRight: 10 },
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
  machineMetrics: { backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.green, borderRadius: 10, padding: 10, marginBottom: 9 },
  machineTitle: { color: colors.green, fontSize: 9, fontWeight: '900', marginBottom: 4 },
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
  liveCardioFigure: { width: 135, height: 135, resizeMode: 'cover', borderRadius: 14 },
  liveIconBox: { width: 135, height: 150, alignItems: 'center', justifyContent: 'center' },
  liveEmoji: { fontSize: 66 },
  liveMuscles: { flex: 1, paddingLeft: 9 },
  liveName: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 10 },
  primaryLabel: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  liveMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  activeRemoveExercise: { alignItems: 'center', paddingTop: 11, paddingBottom: 3 },
  activeRemoveExerciseText: { color: colors.danger, fontWeight: '800', fontSize: 10 },
  deleteActiveButton: { borderWidth: 1, borderColor: colors.danger, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  deleteActiveText: { color: colors.danger, fontWeight: '900', fontSize: 11 },
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
  pickerCardioThumb: { width: 49, height: 49, resizeMode: 'cover', borderRadius: 9 },
  pickerEmoji: { width: 49, textAlign: 'center', fontSize: 27 },
  pickerExerciseName: { color: colors.text, fontWeight: '900', fontSize: 13 },
  pickerExerciseMeta: { color: colors.muted, fontSize: 9, marginTop: 3 },
  pickerPlus: { color: colors.blue, fontSize: 24, width: 30, textAlign: 'center' },
});
