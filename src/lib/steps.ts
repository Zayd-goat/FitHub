import { Pedometer } from 'expo-sensors';
import { supabase } from './supabase';

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export async function readTodaySteps(userId: string) {
  const available = await Pedometer.isAvailableAsync();
  if (!available) return { available: false, steps: 0, reason: 'This device does not expose a hardware pedometer.' };
  const start = new Date(); start.setHours(0,0,0,0);
  let steps = 0;
  try { steps = (await Pedometer.getStepCountAsync(start, new Date())).steps; }
  catch { return { available: false, steps: 0, reason: 'Today’s sensor history is unavailable. FitHub will not estimate or invent steps.' }; }
  await supabase.from('daily_steps').upsert({ user_id: userId, local_date: dayKey(), steps, source: 'hardware_pedometer', synced_at: new Date().toISOString() }, { onConflict: 'user_id,local_date' });
  return { available: true, steps, reason: null };
}

export function watchSteps(onChange: (delta: number) => void) {
  return Pedometer.watchStepCount(({ steps }) => onChange(steps));
}
