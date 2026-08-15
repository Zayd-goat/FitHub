import { exerciseLibrary } from '../data/exerciseLibrary';
import { supabase } from './supabase';

export type NewPrEvent = {
  id?: string;
  exercise_name: string;
  metric: 'max_weight' | 'reps_at_weight' | 'distance' | 'duration' | 'pace' | 'other';
  value_numeric: number;
  previous_value_numeric?: number | null;
  unit: string;
  details: Record<string, any>;
  achieved_at?: string;
  new_clubs?: Array<{ club_key:string; exercise_name:string; threshold_kg:number }>;
};

type WorkoutRow = {
  id?: string;
  exercise_name: string;
  weight_kg?: number | null;
  reps?: number | null;
  distance_km?: number | null;
  duration_min?: number | null;
};

const clubThresholds: Array<{ match: RegExp; canonical: string; thresholds: number[] }> = [
  { match: /bench press/i, canonical: 'Barbell Bench Press', thresholds: [40,60,80,100,120] },
  { match: /(back squat|barbell squat)/i, canonical: 'Barbell Back Squat', thresholds: [60,100,140,180] },
  { match: /deadlift/i, canonical: 'Conventional Deadlift', thresholds: [80,120,160,200] },
  { match: /(overhead press|military press)/i, canonical: 'Overhead Press', thresholds: [30,50,70,90] },
];
const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export async function detectAndSavePrEvents({ userId, sessionId, rows, age }: { userId: string; sessionId: string; rows: WorkoutRow[]; age?: number | null }) {
  const names = Array.from(new Set(rows.map((x)=>x.exercise_name).filter(Boolean)));
  if (!names.length) return [] as NewPrEvent[];
  const { data: previous } = await supabase.from('workout_sets').select('exercise_name,weight_kg,reps,distance_km,duration_min,session_id').eq('user_id', userId).in('exercise_name', names).neq('session_id', sessionId).limit(10000);
  const history = previous ?? [];
  const events: NewPrEvent[] = [];

  for (const name of names) {
    const ex = exerciseLibrary.find((item)=>item.name===name);
    const current = rows.filter((x)=>x.exercise_name===name);
    const old = history.filter((x:any)=>x.exercise_name===name);
    if (ex?.metric_type === 'strength' || current.some((x)=>Number(x.weight_kg ?? 0)>0 && Number(x.reps ?? 0)>0)) {
      const valid = current.filter((x)=>Number(x.weight_kg ?? 0)>0 && Number(x.reps ?? 0)>0);
      if (!valid.length) continue;
      const bestWeightRow = [...valid].sort((a,b)=>Number(b.weight_kg)-Number(a.weight_kg) || Number(b.reps)-Number(a.reps))[0];
      const previousMax = Math.max(0,...old.map((x:any)=>Number(x.weight_kg ?? 0)));
      if (Number(bestWeightRow.weight_kg) > previousMax) events.push({ exercise_name:name, metric:'max_weight', value_numeric:Number(bestWeightRow.weight_kg), previous_value_numeric:previousMax||null, unit:'kg', details:{ weight_kg:Number(bestWeightRow.weight_kg), reps:Number(bestWeightRow.reps), improvement_kg: previousMax ? Number(bestWeightRow.weight_kg)-previousMax : null } });

      for (const row of valid) {
        const weight = Number(row.weight_kg), reps = Number(row.reps);
        const previousReps = Math.max(0,...old.filter((x:any)=>Math.abs(Number(x.weight_kg ?? 0)-weight)<0.001).map((x:any)=>Number(x.reps ?? 0)));
        if (reps > previousReps && previousReps > 0) events.push({ exercise_name:name, metric:'reps_at_weight', value_numeric:reps, previous_value_numeric:previousReps, unit:'reps', details:{ weight_kg:weight, reps, improvement_reps:reps-previousReps } });
      }
      continue;
    }

    if (ex?.metric_type === 'time') {
      const duration = Math.max(0,...current.map((x)=>Number(x.duration_min ?? 0)));
      const previousDuration = Math.max(0,...old.map((x:any)=>Number(x.duration_min ?? 0)));
      if (duration > previousDuration && duration > 0) events.push({ exercise_name:name, metric:'duration', value_numeric:duration, previous_value_numeric:previousDuration||null, unit:'min', details:{ duration_min:duration } });
      continue;
    }

    const bestDistance = Math.max(0,...current.map((x)=>Number(x.distance_km ?? 0)));
    const previousDistance = Math.max(0,...old.map((x:any)=>Number(x.distance_km ?? 0)));
    if (bestDistance > previousDistance && bestDistance > 0) {
      const row = current.find((x)=>Number(x.distance_km ?? 0)===bestDistance);
      events.push({ exercise_name:name, metric:'distance', value_numeric:bestDistance, previous_value_numeric:previousDistance||null, unit:'km', details:{ distance_km:bestDistance, duration_min:Number(row?.duration_min ?? 0) } });
    }
    const paceRows = current.filter((x)=>Number(x.distance_km ?? 0)>0 && Number(x.duration_min ?? 0)>0);
    if (paceRows.length) {
      const currentBest = Math.min(...paceRows.map((x)=>Number(x.duration_min)/Number(x.distance_km)));
      const oldPaces = old.filter((x:any)=>Number(x.distance_km ?? 0)>0 && Number(x.duration_min ?? 0)>0).map((x:any)=>Number(x.duration_min)/Number(x.distance_km));
      const oldBest = oldPaces.length ? Math.min(...oldPaces) : Infinity;
      if (currentBest < oldBest && Number.isFinite(currentBest)) events.push({ exercise_name:name, metric:'pace', value_numeric:currentBest, previous_value_numeric:Number.isFinite(oldBest)?oldBest:null, unit:'min/km', details:{ pace_min_per_km:currentBest } });
    }
  }

  // De-duplicate exact events from repeated sets.
  const unique = events.filter((event,index,all)=>all.findIndex((x)=>x.exercise_name===event.exercise_name && x.metric===event.metric && x.value_numeric===event.value_numeric && JSON.stringify(x.details)===JSON.stringify(event.details))===index);
  if (!unique.length) return [];
  const payload = unique.map((event)=>({ ...event, user_id:userId, workout_session_id:sessionId, achieved_at:new Date().toISOString() }));
  const { data: inserted, error } = await supabase.from('pr_events').insert(payload).select('id,exercise_name,metric,value_numeric,previous_value_numeric,unit,details,achieved_at');
  if (error) return unique;
  const result=(inserted ?? unique) as NewPrEvent[];
  if ((age ?? 0) >= 18) {
    const newClubs=await unlockClubs(userId, inserted ?? []);
    if (result[0] && newClubs.length) result[0].new_clubs=newClubs;
  }
  return result;
}

async function unlockClubs(userId:string, events:any[]) {
  const unlockRows:any[]=[];
  for (const event of events) {
    if (event.metric !== 'max_weight') continue;
    const definition=clubThresholds.find((x)=>x.match.test(event.exercise_name));
    if (!definition) continue;
    const value=Number(event.value_numeric);
    for (const threshold of definition.thresholds) if (value >= threshold) unlockRows.push({ user_id:userId, club_key:`${slug(definition.canonical)}-${threshold}kg`, exercise_name:definition.canonical, threshold_kg:threshold, source_pr_event_id:event.id ?? null, unlocked_at:new Date().toISOString() });
  }
  if (!unlockRows.length) return [];
  try {
    const keys=unlockRows.map(x=>x.club_key);
    const {data:existing}=await supabase.from('club_unlocks').select('club_key').eq('user_id',userId).in('club_key',keys);
    const old=new Set((existing??[]).map((x:any)=>x.club_key));
    const newlyUnlocked=unlockRows.filter(x=>!old.has(x.club_key));
    await supabase.from('club_unlocks').upsert(unlockRows,{onConflict:'user_id,club_key',ignoreDuplicates:true});
    await supabase.from('club_unlocks').update({last_qualified_at:new Date().toISOString()}).eq('user_id',userId).in('club_key',keys);
    return newlyUnlocked;
  } catch { return []; }
}
