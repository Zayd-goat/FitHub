import { supabase } from './supabase';

const isoDate = (d = new Date()) => d.toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((new Date(a + 'T00:00:00Z').getTime() - new Date(b + 'T00:00:00Z').getTime()) / 86400000);

export async function recordDailyCheckIn(userId: string) {
  // App opens are recorded for analytics only. They never extend an achievement streak.
  await supabase.from('daily_checkins').upsert({ user_id: userId, checkin_date: isoDate() }, { onConflict: 'user_id,checkin_date' });
}

export async function recordWorkoutDay(userId: string) {
  const today = isoDate();
  const { data } = await supabase.from('profiles').select('last_workout_date,workout_streak,tokens').eq('id', userId).single();
  if (!data) return;
  if (data.last_workout_date === today) return;
  const prior = data.last_workout_date as string | null;
  const next = prior && dayDiff(today, prior) === 1 ? Number(data.workout_streak ?? 0) + 1 : 1;
  await supabase.from('profiles').update({
    last_workout_date: today,
    workout_streak: next,
    tokens: Number(data.tokens ?? 0) + 10
  }).eq('id', userId);
}
