import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const ACTIVE_CHANNEL = 'active-workout';
const GYM_CHANNEL = 'gym-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!requestPermission) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.status === 'granted';
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
}: {
  userId: string;
  workoutName: string;
  exerciseName: string;
  startedAt: number;
  detail?: string;
}) {
  const allowed = await ensureNotificationSetup(true);
  if (!allowed) return null;

  const identifier = `active-workout-${userId}`;
  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const timer = `${hours ? `${String(hours).padStart(2, '0')}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  await Notifications.dismissNotificationAsync(identifier).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: `${workoutName || 'Workout'} • Active`,
      body: `${timer} • ${exerciseName}${detail ? ` • ${detail}` : ''}`,
      data: { type: 'active_workout' },
      sticky: Platform.OS === 'android',
      autoDismiss: false,
      sound: false,
      color: '#FF3B30',
    },
    trigger: null,
  });
  return identifier;
}

export async function clearActiveWorkoutNotification(userId: string) {
  const identifier = `active-workout-${userId}`;
  await Notifications.dismissNotificationAsync(identifier).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
}
