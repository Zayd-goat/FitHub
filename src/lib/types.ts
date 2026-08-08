export type Profile = {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  age: number | null;
  fitness_level: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  weight_unit?: 'kg' | 'lb' | null;
  height_unit?: 'cm' | 'in' | null;
  gender: string | null;
  activity_level: string | null;
  goal: string | null;
  workout_days_target: number;
  maintenance_calories: number | null;
  protein_target_g: number | null;
  onboarding_complete: boolean;
  login_streak: number;
  workout_streak: number;
  tokens: number;
};

export type Food = {
  id?: string;
  name: string;
  serving: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source?: string;
};

export type Exercise = {
  id?: string;
  name: string;
  category: string;
  equipment: string;
  metric_type: 'strength' | 'distance' | 'time';
  icon_emoji: string;
  rep_min?: number | null;
  rep_max?: number | null;
};

export type WorkoutPost = {
  id: string;
  user_id: string;
  session_id?: string;
  username?: string;
  avatar_url?: string | null;
  summary: string;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  exercise_count?: number;
  total_sets?: number;
  total_volume?: number;
  total_distance?: number;
  exercise_names?: string;
};
