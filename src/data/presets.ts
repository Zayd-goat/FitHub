import { Exercise, Food } from '../lib/types';

export const presetFoods: Food[] = [
  { name: 'Banana', serving: '1 medium', calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4, source: 'preset' },
  { name: 'Apple', serving: '1 medium', calories: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3, source: 'preset' },
  { name: 'Oats, cooked', serving: '1 cup', calories: 154, protein_g: 6, carbs_g: 27, fat_g: 3, source: 'preset' },
  { name: 'Greek yogurt, plain', serving: '170 g', calories: 100, protein_g: 17, carbs_g: 6, fat_g: 0.7, source: 'preset' },
  { name: 'Egg', serving: '1 large', calories: 72, protein_g: 6.3, carbs_g: 0.4, fat_g: 4.8, source: 'preset' },
  { name: 'Chicken breast, cooked', serving: '100 g', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, source: 'preset' },
  { name: 'Lean beef, cooked', serving: '100 g', calories: 217, protein_g: 26, carbs_g: 0, fat_g: 12, source: 'preset' },
  { name: 'Tuna in water', serving: '100 g', calories: 116, protein_g: 26, carbs_g: 0, fat_g: 1, source: 'preset' },
  { name: 'Salmon, cooked', serving: '100 g', calories: 206, protein_g: 22, carbs_g: 0, fat_g: 12, source: 'preset' },
  { name: 'Rice, cooked', serving: '1 cup', calories: 205, protein_g: 4.3, carbs_g: 45, fat_g: 0.4, source: 'preset' },
  { name: 'Brown rice, cooked', serving: '1 cup', calories: 216, protein_g: 5, carbs_g: 45, fat_g: 1.8, source: 'preset' },
  { name: 'Pasta, cooked', serving: '1 cup', calories: 221, protein_g: 8.1, carbs_g: 43, fat_g: 1.3, source: 'preset' },
  { name: 'Whole-wheat bread', serving: '1 slice', calories: 81, protein_g: 4, carbs_g: 14, fat_g: 1.1, source: 'preset' },
  { name: 'Peanut butter', serving: '2 tbsp', calories: 188, protein_g: 8, carbs_g: 7, fat_g: 16, source: 'preset' },
  { name: 'Avocado', serving: '1/2 medium', calories: 120, protein_g: 1.5, carbs_g: 6, fat_g: 11, source: 'preset' },
  { name: 'Milk, 2%', serving: '1 cup', calories: 122, protein_g: 8, carbs_g: 12, fat_g: 5, source: 'preset' },
  { name: 'Cottage cheese', serving: '1 cup', calories: 206, protein_g: 28, carbs_g: 8, fat_g: 9, source: 'preset' },
  { name: 'Potato, baked', serving: '1 medium', calories: 161, protein_g: 4.3, carbs_g: 37, fat_g: 0.2, source: 'preset' },
  { name: 'Sweet potato, baked', serving: '1 medium', calories: 112, protein_g: 2, carbs_g: 26, fat_g: 0.1, source: 'preset' },
  { name: 'Broccoli, cooked', serving: '1 cup', calories: 55, protein_g: 3.7, carbs_g: 11, fat_g: 0.6, source: 'preset' },
  { name: 'Almonds', serving: '28 g', calories: 164, protein_g: 6, carbs_g: 6, fat_g: 14, source: 'preset' },
  { name: 'Protein shake', serving: '1 scoop with water', calories: 120, protein_g: 24, carbs_g: 3, fat_g: 2, source: 'preset' },
  { name: 'Orange', serving: '1 medium', calories: 62, protein_g: 1.2, carbs_g: 15, fat_g: 0.2, source: 'preset' },
  { name: 'Cheddar cheese', serving: '28 g', calories: 113, protein_g: 7, carbs_g: 0.4, fat_g: 9.3, source: 'preset' }
];

export type PresetExercise = Exercise & { image: any };
export const presetExercises: PresetExercise[] = [
  { name: 'Bench Press', category: 'Chest', equipment: 'Barbell + bench', metric_type: 'strength', icon_emoji: '🏋️', rep_min: 6, rep_max: 12, image: require('../../assets/exercises/bench.png') },
  { name: 'Back Squat', category: 'Legs', equipment: 'Barbell / rack', metric_type: 'strength', icon_emoji: '🏋️', rep_min: 5, rep_max: 10, image: require('../../assets/exercises/squat.png') },
  { name: 'Deadlift', category: 'Posterior chain', equipment: 'Barbell', metric_type: 'strength', icon_emoji: '🏋️', rep_min: 3, rep_max: 8, image: require('../../assets/exercises/deadlift.png') },
  { name: 'Seated Cable Row', category: 'Back', equipment: 'Cable machine', metric_type: 'strength', icon_emoji: '🎯', rep_min: 8, rep_max: 12, image: require('../../assets/exercises/row.png') },
  { name: 'Lat Pulldown', category: 'Back', equipment: 'Pulldown machine', metric_type: 'strength', icon_emoji: '🎯', rep_min: 8, rep_max: 12, image: require('../../assets/exercises/lat_pulldown.png') },
  { name: 'Leg Press', category: 'Legs', equipment: 'Leg press machine', metric_type: 'strength', icon_emoji: '🦵', rep_min: 8, rep_max: 15, image: require('../../assets/exercises/leg_press.png') },
  { name: 'Push-up', category: 'Chest', equipment: 'Bodyweight', metric_type: 'strength', icon_emoji: '💪', rep_min: 6, rep_max: 20, image: require('../../assets/exercises/pushup.png') },
  { name: 'Plank', category: 'Core', equipment: 'Bodyweight', metric_type: 'time', icon_emoji: '⏱️', rep_min: null, rep_max: null, image: require('../../assets/exercises/plank.png') },
  { name: 'Running', category: 'Cardio', equipment: 'Treadmill / outdoors', metric_type: 'distance', icon_emoji: '🏃', rep_min: null, rep_max: null, image: require('../../assets/exercises/run.png') },
  { name: 'Cycling', category: 'Cardio', equipment: 'Bike / stationary bike', metric_type: 'distance', icon_emoji: '🚴', rep_min: null, rep_max: null, image: require('../../assets/exercises/cycle.png') }
];

export const presetChallenges = [
  { title: '3 Workouts This Week', description: 'Complete three workout sessions in seven days.', metric: 'workouts', target_value: 3, unit: 'workouts' },
  { title: 'Consistency 5', description: 'Log movement or a workout on five different days.', metric: 'active_days', target_value: 5, unit: 'days' },
  { title: '10 km Together', description: 'Accumulate 10 km of running or cycling.', metric: 'distance', target_value: 10, unit: 'km' },
  { title: 'Strength Starter', description: 'Complete four resistance-training sessions.', metric: 'strength_sessions', target_value: 4, unit: 'sessions' }
];
