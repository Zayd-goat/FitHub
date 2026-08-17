import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import Storage from 'expo-sqlite/kv-store';
import { supabase } from './supabase';
import { recordWorkoutDay } from './streaks';
import { detectAndSavePrEvents } from './prs';
import { kgToDisplay, kmToDisplay } from './units';

const ACTIVE_CHANNEL = 'active-workout';
const GYM_CHANNEL = 'gym-reminders';
const SUPPLEMENT_CHANNEL = 'supplement-reminders';
const ACTIVE_WORKOUT_CATEGORY = 'ACTIVEWORKOUT';
const SUPPLEMENT_CATEGORY = 'SUPPLEMENT_REMINDER';
const WORKOUT_NOTIFICATION_TASK = 'FITHUB_WORKOUT_NOTIFICATION_TASK';
export const NEXT_SET_ACTION = 'NEXT_SET';
export const END_WORKOUT_ACTION = 'END_WORKOUT';
export const SUPPLEMENT_TAKEN_ACTION = 'SUPPLEMENT_TAKEN';
export const SUPPLEMENT_RESCHEDULE_ACTION = 'SUPPLEMENT_RESCHEDULE';

type StoredSet = { id?: string; weight: string; reps: string; done: boolean };
type StoredItem = {
  id?: string;
  exercise_slug: string;
  exercise_name: string;
  metric_type?: 'strength' | 'distance' | 'time';
  strength_sets: StoredSet[];
  distance: string;
  duration: string;
  load: string;
  done: boolean;
};
type StoredWorkout = {
  started_at: number;
  template_name: string;
  editing_template_id: string | null;
  active_index: number;
  revision?: number;
  weight_unit?: 'kg' | 'lb';
  distance_unit?: 'km' | 'mi';
  items: StoredItem[];
};

const activeStorageKey = (userId: string) => `fithub_active_workout_${userId}`;
const activeRevisionKey = (userId: string) => `fithub_active_revision_${userId}`;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const isStoredItemDone = (item: StoredItem) =>
  item.metric_type === 'strength' || item.strength_sets?.length
    ? !!item.strength_sets?.length && item.strength_sets.every((set) => set.done)
    : !!item.done;

const formatElapsed = (startedAt: number) => {
  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  return `${hours ? `${String(hours).padStart(2, '0')}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const detailForStoredItem = (item: StoredItem | undefined, state?: StoredWorkout) => {
  if (!item) return '';
  const weightUnit = state?.weight_unit ?? 'kg';
  const distanceUnit = state?.distance_unit ?? 'km';
  if (item.metric_type === 'strength' || item.strength_sets?.length) {
    const next = item.strength_sets.findIndex((set) => !set.done);
    const index = next >= 0 ? next : Math.max(0, item.strength_sets.length - 1);
    const set = item.strength_sets[index];
    if (!set) return '';
    const displayWeight = set.weight ? Math.round(kgToDisplay(Number(set.weight), weightUnit) * 100) / 100 : null;
    return `Set ${index + 1}/${item.strength_sets.length}${displayWeight != null ? ` • ${displayWeight} ${weightUnit}` : ''}${set.reps ? ` × ${set.reps}` : ''}`;
  }
  const displayDistance = item.distance ? Math.round(kmToDisplay(Number(item.distance), distanceUnit) * 100) / 100 : null;
  return `${displayDistance != null ? `${displayDistance} ${distanceUnit}` : ''}${displayDistance != null && item.duration ? ' • ' : ''}${item.duration ? `${item.duration} min` : ''}`;
};

async function readStoredWorkout(userId: string) {
  const raw = await Storage.getItem(activeStorageKey(userId));
  if (!raw) return null;
  try { return JSON.parse(raw) as StoredWorkout; } catch { return null; }
}

async function writeStoredWorkout(userId: string, state: StoredWorkout) {
  const revision = Date.now();
  const next = { ...state, revision };
  await Storage.setItem(activeStorageKey(userId), JSON.stringify(next));
  await Storage.setItem(activeRevisionKey(userId), String(revision));
  return next;
}

async function refreshStoredNotification(userId: string, state: StoredWorkout) {
  const index = Math.min(state.active_index ?? 0, Math.max(0, state.items.length - 1));
  const current = state.items[index];
  const allDone = state.items.length > 0 && state.items.every(isStoredItemDone);
  await showActiveWorkoutNotification({
    userId,
    workoutName: state.template_name || 'Workout',
    exerciseName: allDone ? 'All exercises complete' : current?.exercise_name || 'Workout in progress',
    startedAt: state.started_at,
    detail: allDone ? 'Tap END WORKOUT to save' : detailForStoredItem(current, state),
    requestPermission: false,
  });
}

async function advanceStoredWorkout(userId: string) {
  const state = await readStoredWorkout(userId);
  if (!state?.items?.length) return;
  const index = Math.min(state.active_index ?? 0, state.items.length - 1);
  const current = state.items[index];

  if (current.metric_type === 'strength' || current.strength_sets?.length) {
    const nextSet = current.strength_sets.find((set) => !set.done);
    if (nextSet) nextSet.done = true;
    current.done = current.strength_sets.length > 0 && current.strength_sets.every((set) => set.done);
  } else {
    current.done = true;
  }

  if (isStoredItemDone(current)) {
    for (let offset = 1; offset <= state.items.length; offset += 1) {
      const candidate = (index + offset) % state.items.length;
      if (!isStoredItemDone(state.items[candidate])) {
        state.active_index = candidate;
        break;
      }
    }
  }

  const updated = await writeStoredWorkout(userId, state);
  await refreshStoredNotification(userId, updated);
}

async function finalizeStoredWorkout(userId: string) {
  const state = await readStoredWorkout(userId);
  if (!state?.items?.length) return;
  try {
    const summary = state.items.map((item) => item.exercise_name).join(', ');
    const { data: session, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        completed: true,
        started_at: new Date(state.started_at).toISOString(),
        ended_at: new Date().toISOString(),
        summary,
      })
      .select('id')
      .single();
    if (error) throw error;

    const rows: any[] = [];
    state.items.forEach((item) => {
      if (item.metric_type === 'strength' || item.strength_sets?.length) {
        item.strength_sets.forEach((set, index) => {
          if (!set.done) return;
          rows.push({
            session_id: session.id,
            user_id: userId,
            exercise_id: null,
            exercise_name: item.exercise_name,
            set_number: index + 1,
            weight_kg: set.weight === '' ? 0 : Number(set.weight),
            reps: Number(set.reps || 0),
            distance_km: null,
            duration_min: null,
          });
        });
      } else if (item.done) {
        rows.push({
          session_id: session.id,
          user_id: userId,
          exercise_id: null,
          exercise_name: item.exercise_name,
          set_number: 1,
          weight_kg: item.load ? Number(item.load) : null,
          reps: null,
          distance_km: item.distance ? Number(item.distance) : null,
          duration_min: item.duration ? Number(item.duration) : null,
        });
      }
    });
    let insertedRows: any[] = [];
    if (rows.length) {
      const { data: inserted, error: rowError } = await supabase.from('workout_sets').insert(rows).select('id,exercise_name,weight_kg,reps,distance_km,duration_min');
      if (rowError) throw rowError;
      insertedRows = inserted ?? rows;
    }
    let newPrs: any[] = [];
    if (insertedRows.length) {
      const { data: profileRow } = await supabase.from('profiles').select('age').eq('id', userId).maybeSingle();
      newPrs = await detectAndSavePrEvents({ userId, sessionId: session.id, rows: insertedRows, age: profileRow?.age ?? null });
      if (newPrs.length) {
        await Storage.setItem(`fithub_pending_pr_${userId}`, JSON.stringify({ events: newPrs, sessionId: session.id, summary }));
      }
    }
    await recordWorkoutDay(userId).catch(() => {});
    try { await supabase.rpc('apply_workout_to_challenges', { p_session_id: session.id }); } catch {}
    await Storage.removeItem(activeStorageKey(userId));
    await Storage.setItem(activeRevisionKey(userId), String(Date.now()));
    await clearActiveWorkoutNotification(userId);
  } catch {
    await Storage.setItem(`fithub_pending_end_${userId}`, '1').catch(() => {});
    const stateNow = await readStoredWorkout(userId);
    if (stateNow) {
      await showActiveWorkoutNotification({
        userId,
        workoutName: stateNow.template_name || 'Workout',
        exerciseName: 'Open FitHub to finish saving',
        startedAt: stateNow.started_at,
        detail: 'Your workout is still safe',
        requestPermission: false,
      }).catch(() => {});
    }
  }
}

function responseData(data: any) {
  return data?.notification?.request?.content?.data ?? data?.notification?.data ?? data?.data ?? {};
}

if (!TaskManager.isTaskDefined(WORKOUT_NOTIFICATION_TASK)) {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(WORKOUT_NOTIFICATION_TASK, async ({ data, error }) => {
    if (error || !data || typeof data !== 'object') return;
    const payload: any = data;
    const action = payload.actionIdentifier;
    const content = responseData(payload);
    const userId = String(content?.userId ?? '');
    if (!userId) return;
    if (action === NEXT_SET_ACTION) await advanceStoredWorkout(userId);
    if (action === END_WORKOUT_ACTION) await finalizeStoredWorkout(userId);
    if (action === SUPPLEMENT_TAKEN_ACTION && content?.reminderId) {
      const now=new Date();const localDate=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      try { await supabase.from('supplement_checkins').upsert({user_id:userId,reminder_id:String(content.reminderId),local_date:localDate,taken_at:now.toISOString(),source:'notification'},{onConflict:'user_id,reminder_id,local_date'}); } catch {}
    }
  });
}
Notifications.registerTaskAsync(WORKOUT_NOTIFICATION_TASK).catch(() => {});

export async function ensureNotificationSetup(requestPermission = true) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ACTIVE_CHANNEL, {
      name: 'Active workout',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0],
      sound: null,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync(GYM_CHANNEL, {
      name: 'Gym session reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
    });
    await Notifications.setNotificationChannelAsync(SUPPLEMENT_CHANNEL, {
      name: 'Supplement reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 120],
    });
  }
  await Notifications.setNotificationCategoryAsync(ACTIVE_WORKOUT_CATEGORY, [
    {
      identifier: NEXT_SET_ACTION,
      buttonTitle: 'NEXT SET',
      options: { opensAppToForeground: false, isAuthenticationRequired: false, isDestructive: false },
    },
    {
      identifier: END_WORKOUT_ACTION,
      buttonTitle: 'END WORKOUT',
      options: { opensAppToForeground: false, isAuthenticationRequired: false, isDestructive: true },
    },
  ]).catch(() => null);
  await Notifications.setNotificationCategoryAsync(SUPPLEMENT_CATEGORY,[{identifier:SUPPLEMENT_TAKEN_ACTION,buttonTitle:'TAKEN',options:{opensAppToForeground:false,isAuthenticationRequired:false,isDestructive:false}},{identifier:SUPPLEMENT_RESCHEDULE_ACTION,buttonTitle:'RESCHEDULE',options:{opensAppToForeground:true,isAuthenticationRequired:false,isDestructive:false}}]).catch(()=>null);

  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!requestPermission) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.status === 'granted';
}

export async function registerFriendPushToken(userId:string){
  const allowed=await ensureNotificationSetup(true);if(!allowed)return;
  try{const token=(await Notifications.getExpoPushTokenAsync()).data;if(token)await supabase.from('push_tokens').upsert({user_id:userId,token,platform:Platform.OS,enabled:true,updated_at:new Date().toISOString()},{onConflict:'user_id,token'});}catch{}
}

export async function scheduleGymReminder({
  inviteId,
  friendName,
  sessionAt,
  workoutName,
  gymName,
}: {
  inviteId: string;
  friendName: string;
  sessionAt: string;
  workoutName?: string | null;
  gymName?: string | null;
}) {
  const allowed = await ensureNotificationSetup(true);
  if (!allowed) return null;

  const start = new Date(sessionAt).getTime();
  const reminderAt = start - 30 * 60 * 1000;
  if (!Number.isFinite(reminderAt) || reminderAt <= Date.now()) return null;

  const identifier = `gym-session-${inviteId}`;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'Gym session in 30 minutes',
      body: `${workoutName?.trim() || 'Gym session'} with ${friendName}${gymName?.trim() ? ` • ${gymName.trim()}` : ''}`,
      data: { type: 'gym_invite', inviteId },
      sound: 'default',
      color: '#FF3B30',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminderAt),
      ...(Platform.OS === 'android' ? { channelId: GYM_CHANNEL } : {}),
    } as any,
  });
  return identifier;
}

export async function cancelGymReminder(inviteId: string) {
  await Notifications.cancelScheduledNotificationAsync(`gym-session-${inviteId}`).catch(() => {});
}

export async function showActiveWorkoutNotification({
  userId,
  workoutName,
  exerciseName,
  startedAt,
  detail,
  requestPermission = true,
}: {
  userId: string;
  workoutName: string;
  exerciseName: string;
  startedAt: number;
  detail?: string;
  requestPermission?: boolean;
}) {
  const allowed = await ensureNotificationSetup(requestPermission);
  if (!allowed) return null;

  const identifier = `active-workout-${userId}`;
  await Notifications.dismissNotificationAsync(identifier).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: `${workoutName || 'Workout'} • Active`,
      body: `${formatElapsed(startedAt)} • ${exerciseName}${detail ? ` • ${detail}` : ''}`,
      data: { type: 'active_workout', userId, storageKey: activeStorageKey(userId) },
      categoryIdentifier: ACTIVE_WORKOUT_CATEGORY,
      sticky: Platform.OS === 'android',
      autoDismiss: false,
      sound: false,
      color: '#FF3B30',
    },
    trigger: Platform.OS === 'android' ? { channelId: ACTIVE_CHANNEL } : null,
  });
  return identifier;
}

export async function clearActiveWorkoutNotification(userId: string) {
  const identifier = `active-workout-${userId}`;
  await Notifications.dismissNotificationAsync(identifier).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
}


export async function scheduleDailySupplementReminder({
  identifier,
  supplementName,
  hour,
  minute,
  userId,
  reminderId,
}: {
  identifier?: string | null;
  supplementName: string;
  hour: number;
  minute: number;
  userId?: string;
  reminderId?: string;
}) {
  const allowed = await ensureNotificationSetup(true);
  if (!allowed) return null;
  if (identifier) await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  const id = identifier || `supplement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: 'Supplement reminder',
      body: supplementName.trim(),
      data: { type: 'supplement_reminder', supplementName: supplementName.trim(), userId, reminderId },
      categoryIdentifier: SUPPLEMENT_CATEGORY,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: SUPPLEMENT_CHANNEL } : {}),
    } as any,
  });
  return id;
}

export async function cancelSupplementReminder(identifier?: string | null) {
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
}

export async function scheduleOneTimeSupplementReminder({supplementName,userId,reminderId,date}:{supplementName:string;userId:string;reminderId:string;date:Date}){
 const allowed=await ensureNotificationSetup(true);if(!allowed||date.getTime()<=Date.now())return null;
 return Notifications.scheduleNotificationAsync({content:{title:'Supplement reminder',body:supplementName,data:{type:'supplement_reminder',supplementName,userId,reminderId},categoryIdentifier:SUPPLEMENT_CATEGORY,sound:'default'},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date,...(Platform.OS==='android'?{channelId:SUPPLEMENT_CHANNEL}:{})} as any});
}
