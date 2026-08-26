export type SharedWorkoutPlanItem = {
  exercise_slug: string;
  exercise_name: string;
  sets: number;
  reps: number;
  distance?: string;
  duration?: string;
};

export type SharedWorkoutLaunch = {
  sharedSessionId: string;
  title: string;
  plan: SharedWorkoutPlanItem[];
  isLeader: boolean;
  revision: number;
};

export function normalizeSharedPlan(value: unknown): SharedWorkoutPlanItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: any) => {
    const exerciseSlug = String(item?.exercise_slug ?? '').trim();
    const exerciseName = String(item?.exercise_name ?? '').trim();
    if (!exerciseSlug || !exerciseName) return [];
    return [{
      exercise_slug: exerciseSlug,
      exercise_name: exerciseName,
      sets: Math.max(1, Math.min(12, Number(item?.sets) || 3)),
      reps: Math.max(1, Math.min(100, Number(item?.reps) || 10)),
      distance: item?.distance == null ? '' : String(item.distance),
      duration: item?.duration == null ? '' : String(item.duration),
    }];
  });
}
