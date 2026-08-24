import { exerciseLibrary } from '../data/exerciseLibrary';

export type EnergySession = {
  id: string;
  started_at: string;
  ended_at?: string | null;
  summary?: string | null;
};

export type EnergySet = {
  session_id: string;
  exercise_name: string;
  weight_kg?: number | null;
  reps?: number | null;
  distance_km?: number | null;
  duration_min?: number | null;
};

export type EnergyBreakdown = {
  sessionId: string;
  label: string;
  minutes: number;
  kcal: number;
  lines: Array<{ exercise: string; minutes: number; met: number; kcal: number }>;
};

const speedKmh = (distanceKm: number, durationMin: number) =>
  durationMin > 0 ? distanceKm / (durationMin / 60) : 0;

// Activity-specific MET ranges are based on the 2024 Adult Compendium.
// The app deliberately labels the result as an estimate rather than a measured calorie value.
function runningMet(speed: number) {
  if (speed <= 0) return 7.5; // general self-selected jog/run when pace was not logged
  if (speed < 6.4) return 6.0;
  if (speed < 6.9) return 6.5;
  if (speed < 7.8) return 7.8;
  if (speed < 8.7) return 8.5;
  if (speed < 9.5) return 9.0;
  if (speed < 10.8) return 9.8;
  if (speed < 11.8) return 10.5;
  if (speed < 12.9) return 11.8;
  if (speed < 14.5) return 12.8;
  if (speed < 16.1) return 14.5;
  return 16.0;
}

function walkingMet(speed: number, incline = false) {
  if (incline) {
    if (speed >= 7.2) return 8.0;
    if (speed >= 6.4) return 7.0;
    if (speed >= 5.6) return 6.0;
    return 5.0;
  }
  if (speed <= 0) return 3.8;
  if (speed < 3.2) return 2.8;
  if (speed < 4.0) return 3.0;
  if (speed < 4.8) return 3.5;
  if (speed < 5.6) return 3.8;
  if (speed < 6.4) return 4.8;
  if (speed < 7.2) return 5.8;
  if (speed < 8.0) return 6.8;
  return 8.3;
}

function cyclingMet(speed: number, airBike = false) {
  if (airBike) return 8.0;
  if (speed <= 0) return 6.8;
  if (speed < 16) return 4.0;
  if (speed < 19) return 6.8;
  if (speed < 22) return 8.0;
  if (speed < 25) return 10.0;
  if (speed < 30) return 12.0;
  return 14.0;
}

function cardioMet(name: string, distanceKm: number, durationMin: number) {
  const n = name.toLowerCase();
  const speed = speedKmh(distanceKm, durationMin);
  if (n.includes('running') || n.includes('jog')) return runningMet(speed);
  if (n.includes('walking')) return walkingMet(speed, n.includes('incline'));
  if (n.includes('cycling') || n.includes('bike')) return cyclingMet(speed, n.includes('air bike'));
  if (n.includes('rowing')) {
    if (distanceKm > 0 && durationMin > 0) {
      const pace500 = durationMin / Math.max(0.001, distanceKm * 2);
      if (pace500 <= 1.75) return 12.0;
      if (pace500 <= 2.0) return 9.0;
      if (pace500 <= 2.5) return 7.0;
    }
    return 5.0;
  }
  if (n.includes('elliptical')) return 5.0;
  if (n.includes('stair')) return 8.8;
  if (n.includes('jump rope')) return 9.8;
  if (n.includes('skierg')) return 7.0;
  if (n.includes('versaclimber')) return 8.0;
  if (n.includes('swimming')) {
    if (speed >= 3.0) return 9.8;
    if (speed >= 2.0) return 8.0;
    return 5.8;
  }
  return 6.0;
}

function activityKcal(met: number, weightKg: number, minutes: number) {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(minutes) || minutes <= 0) return 0;
  // 1 MET is approximately 1 kcal/kg/hour, so MET × kg × hours gives an activity-energy estimate.
  return Math.max(0, met * weightKg * (minutes / 60));
}

export function estimateExerciseMet(exerciseName: string, distanceKm = 0, durationMin = 0) {
  const ex = exerciseLibrary.find((item) => item.name === exerciseName);
  if (ex?.metric_type === 'strength') return 3.5;
  return cardioMet(exerciseName, distanceKm, durationMin);
}

export function estimateActivityEnergyBySession(
  sessions: EnergySession[],
  sets: EnergySet[],
  weightKg: number,
): { total: number; breakdown: EnergyBreakdown[] } {
  const breakdown: EnergyBreakdown[] = sessions.map((session) => {
    const rows = sets.filter((row) => row.session_id === session.id);
    const start = new Date(session.started_at).getTime();
    const end = new Date(session.ended_at ?? session.started_at).getTime();
    const totalMinutes = Math.max(1, Number.isFinite(end - start) ? (end - start) / 60000 : 1);
    const cardioRows = rows.filter((row) => {
      const ex = exerciseLibrary.find((item) => item.name === row.exercise_name);
      return ex && ex.metric_type !== 'strength';
    });
    const strengthRows = rows.filter((row) => {
      const ex = exerciseLibrary.find((item) => item.name === row.exercise_name);
      return !ex || ex.metric_type === 'strength';
    });

    const lines: EnergyBreakdown['lines'] = [];
    let assignedCardioMinutes = 0;
    const cardioWithoutTime = cardioRows.filter((row) => Number(row.duration_min ?? 0) <= 0);
    const statedCardioMinutes = cardioRows.reduce((n, row) => n + Math.max(0, Number(row.duration_min ?? 0)), 0);
    const fallbackPool = Math.max(0, totalMinutes - Math.min(totalMinutes, statedCardioMinutes));
    const fallbackEach = cardioWithoutTime.length ? fallbackPool / cardioWithoutTime.length : 0;

    for (const row of cardioRows) {
      const duration = Number(row.duration_min ?? 0) > 0 ? Number(row.duration_min) : fallbackEach;
      if (duration <= 0) continue;
      const distance = Math.max(0, Number(row.distance_km ?? 0));
      const met = cardioMet(row.exercise_name, distance, duration);
      const kcal = activityKcal(met, weightKg, duration);
      assignedCardioMinutes += duration;
      lines.push({ exercise: row.exercise_name, minutes: duration, met, kcal });
    }

    if (strengthRows.length) {
      const strengthMinutes = Math.max(1, totalMinutes - Math.min(totalMinutes, assignedCardioMinutes));
      // 2024 Adult Compendium: general multiple-exercise resistance training = 3.5 MET;
      // squats/deadlifts or a denser session are represented closer to 5 MET.
      const heavyPattern = strengthRows.some((row) => /squat|deadlift/i.test(row.exercise_name));
      const setDensity = strengthRows.length / Math.max(1, strengthMinutes);
      const met = heavyPattern || setDensity >= 0.45 ? 5.0 : 3.5;
      const kcal = activityKcal(met, weightKg, strengthMinutes);
      lines.push({ exercise: 'Resistance training', minutes: strengthMinutes, met, kcal });
    }

    const kcal = Math.round(lines.reduce((sum, line) => sum + line.kcal, 0));
    const names = (session.summary ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    const label = names.length > 1 ? `${names[0]} + ${names.length - 1} more` : names[0] || 'Workout';
    return { sessionId: session.id, label, minutes: Math.round(totalMinutes), kcal, lines };
  });
  return { total: Math.round(breakdown.reduce((sum, session) => sum + session.kcal, 0)), breakdown };
}
