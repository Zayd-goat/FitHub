import { ImageSourcePropType } from 'react-native';
import { LibraryExercise } from './exerciseLibrary';

export type ExerciseVisualGender = 'male' | 'female';
export type ExerciseVisualKey = "alternating_dumbbell_curl" | "barbell_curl" | "bayesian_curl" | "cable_curl" | "concentration_curl" | "dumbbell_curl" | "ez_bar_curl" | "hammer_curl" | "incline_dumbbell_curl" | "preacher_curl" | "reverse_curl" | "spider_curl" | "zottman_curl" | "wrist_curl" | "reverse_wrist_curl" | "plate_pinch_hold" | "outdoor_running" | "treadmill_running" | "outdoor_walking" | "treadmill_walking" | "incline_treadmill_walking" | "outdoor_cycling" | "stationary_bike" | "air_bike" | "rowing_machine" | "elliptical" | "stairmaster" | "skierg" | "jump_rope" | "versaclimber" | "swimming" | "stationary_bike_sprint" | "back_squat" | "front_squat" | "goblet_squat" | "hack_squat" | "leg_press" | "romanian_deadlift" | "conventional_deadlift" | "trap_bar_deadlift" | "walking_lunge" | "bulgarian_split_squat" | "hip_thrust" | "seated_leg_curl" | "lying_leg_curl" | "leg_extension" | "standing_calf_raise" | "cable_hip_abduction" | "bench_press" | "incline_dumbbell_press" | "cable_chest_fly" | "chest_press_machine" | "barbell_row" | "seated_cable_row" | "lat_pulldown" | "pull_up" | "dumbbell_shoulder_press" | "cable_lateral_raise" | "rope_pushdown" | "overhead_cable_extension" | "cable_crunch" | "cable_wood_chop" | "bird_dog" | "medicine_ball_slam" | "battle_ropes" | "box_jump" | "agility_ladder" | "bear_crawl" | "power_clean" | "snatch" | "clean_and_jerk" | "kettlebell_swing" | "farmer_carry" | "suitcase_carry" | "sandbag_carry" | "front_rack_carry" | "sled_push" | "sled_pull" | "tire_flip" | "atlas_stone" | "push_up" | "diamond_push_up" | "archer_push_up" | "handstand_push_up" | "dips" | "trx_push_up" | "muscle_up" | "inverted_row" | "plank" | "side_plank" | "bicycle_crunch" | "hanging_leg_raise" | "russian_twist" | "ab_wheel" | "landmine_press" | "face_pull" | "barbell_overhead_press" | "shoulder_press_machine" | "dumbbell_front_raise" | "cable_rear_delt_fly" | "reverse_pec_deck" | "upright_row" | "ez_bar_skull_crusher" | "dumbbell_overhead_extension" | "jm_press" | "triceps_kickback" | "bodyweight_squat" | "cable_glute_kickback" | "seated_calf_raise" | "single_leg_calf_raise" | "smith_machine_squat" | "sumo_deadlift" | "back_extension" | "good_morning" | "kettlebell_clean" | "kettlebell_press" | "kettlebell_snatch" | "cable_pull_through" | "kettlebell_halo" | "log_press" | "hip_abductor_machine" | "hip_adductor_machine" | "donkey_calf_raise" | "yoke_walk" | "overhead_carry" | "turkish_get_up" | "kettlebell_windmill" | "medicine_ball_chest_pass";

const visualAssets: Record<ExerciseVisualKey, Record<ExerciseVisualGender, ImageSourcePropType>> = {
  "alternating_dumbbell_curl": { male: require('../../assets/train_v3/male/alternating_dumbbell_curl.png'), female: require('../../assets/train_v3/female/alternating_dumbbell_curl.png') },
  "barbell_curl": { male: require('../../assets/train_v3/male/barbell_curl.png'), female: require('../../assets/train_v3/female/barbell_curl.png') },
  "bayesian_curl": { male: require('../../assets/train_v3/male/bayesian_curl.png'), female: require('../../assets/train_v3/female/bayesian_curl.png') },
  "cable_curl": { male: require('../../assets/train_v3/male/cable_curl.png'), female: require('../../assets/train_v3/female/cable_curl.png') },
  "concentration_curl": { male: require('../../assets/train_v3/male/concentration_curl.png'), female: require('../../assets/train_v3/female/concentration_curl.png') },
  "dumbbell_curl": { male: require('../../assets/train_v3/male/dumbbell_curl.png'), female: require('../../assets/train_v3/female/dumbbell_curl.png') },
  "ez_bar_curl": { male: require('../../assets/train_v3/male/ez_bar_curl.png'), female: require('../../assets/train_v3/female/ez_bar_curl.png') },
  "hammer_curl": { male: require('../../assets/train_v3/male/hammer_curl.png'), female: require('../../assets/train_v3/female/hammer_curl.png') },
  "incline_dumbbell_curl": { male: require('../../assets/train_v3/male/incline_dumbbell_curl.png'), female: require('../../assets/train_v3/female/incline_dumbbell_curl.png') },
  "preacher_curl": { male: require('../../assets/train_v3/male/preacher_curl.png'), female: require('../../assets/train_v3/female/preacher_curl.png') },
  "reverse_curl": { male: require('../../assets/train_v3/male/reverse_curl.png'), female: require('../../assets/train_v3/female/reverse_curl.png') },
  "spider_curl": { male: require('../../assets/train_v3/male/spider_curl.png'), female: require('../../assets/train_v3/female/spider_curl.png') },
  "zottman_curl": { male: require('../../assets/train_v3/male/zottman_curl.png'), female: require('../../assets/train_v3/female/zottman_curl.png') },
  "wrist_curl": { male: require('../../assets/train_v3/male/wrist_curl.png'), female: require('../../assets/train_v3/female/wrist_curl.png') },
  "reverse_wrist_curl": { male: require('../../assets/train_v3/male/reverse_wrist_curl.png'), female: require('../../assets/train_v3/female/reverse_wrist_curl.png') },
  "plate_pinch_hold": { male: require('../../assets/train_v3/male/plate_pinch_hold.png'), female: require('../../assets/train_v3/female/plate_pinch_hold.png') },
  "outdoor_running": { male: require('../../assets/train_v3/male/outdoor_running.png'), female: require('../../assets/train_v3/female/outdoor_running.png') },
  "treadmill_running": { male: require('../../assets/train_v3/male/treadmill_running.png'), female: require('../../assets/train_v3/female/treadmill_running.png') },
  "outdoor_walking": { male: require('../../assets/train_v3/male/outdoor_walking.png'), female: require('../../assets/train_v3/female/outdoor_walking.png') },
  "treadmill_walking": { male: require('../../assets/train_v3/male/treadmill_walking.png'), female: require('../../assets/train_v3/female/treadmill_walking.png') },
  "incline_treadmill_walking": { male: require('../../assets/train_v3/male/incline_treadmill_walking.png'), female: require('../../assets/train_v3/female/incline_treadmill_walking.png') },
  "outdoor_cycling": { male: require('../../assets/train_v3/male/outdoor_cycling.png'), female: require('../../assets/train_v3/female/outdoor_cycling.png') },
  "stationary_bike": { male: require('../../assets/train_v3/male/stationary_bike.png'), female: require('../../assets/train_v3/female/stationary_bike.png') },
  "air_bike": { male: require('../../assets/train_v3/male/air_bike.png'), female: require('../../assets/train_v3/female/air_bike.png') },
  "rowing_machine": { male: require('../../assets/train_v3/male/rowing_machine.png'), female: require('../../assets/train_v3/female/rowing_machine.png') },
  "elliptical": { male: require('../../assets/train_v3/male/elliptical.png'), female: require('../../assets/train_v3/female/elliptical.png') },
  "stairmaster": { male: require('../../assets/train_v3/male/stairmaster.png'), female: require('../../assets/train_v3/female/stairmaster.png') },
  "skierg": { male: require('../../assets/train_v3/male/skierg.png'), female: require('../../assets/train_v3/female/skierg.png') },
  "jump_rope": { male: require('../../assets/train_v3/male/jump_rope.png'), female: require('../../assets/train_v3/female/jump_rope.png') },
  "versaclimber": { male: require('../../assets/train_v3/male/versaclimber.png'), female: require('../../assets/train_v3/female/versaclimber.png') },
  "swimming": { male: require('../../assets/train_v3/male/swimming.png'), female: require('../../assets/train_v3/female/swimming.png') },
  "stationary_bike_sprint": { male: require('../../assets/train_v3/male/stationary_bike_sprint.png'), female: require('../../assets/train_v3/female/stationary_bike_sprint.png') },
  "back_squat": { male: require('../../assets/train_v3/male/back_squat.png'), female: require('../../assets/train_v3/female/back_squat.png') },
  "front_squat": { male: require('../../assets/train_v3/male/front_squat.png'), female: require('../../assets/train_v3/female/front_squat.png') },
  "goblet_squat": { male: require('../../assets/train_v3/male/goblet_squat.png'), female: require('../../assets/train_v3/female/goblet_squat.png') },
  "hack_squat": { male: require('../../assets/train_v3/male/hack_squat.png'), female: require('../../assets/train_v3/female/hack_squat.png') },
  "leg_press": { male: require('../../assets/train_v3/male/leg_press.png'), female: require('../../assets/train_v3/female/leg_press.png') },
  "romanian_deadlift": { male: require('../../assets/train_v3/male/romanian_deadlift.png'), female: require('../../assets/train_v3/female/romanian_deadlift.png') },
  "conventional_deadlift": { male: require('../../assets/train_v3/male/conventional_deadlift.png'), female: require('../../assets/train_v3/female/conventional_deadlift.png') },
  "trap_bar_deadlift": { male: require('../../assets/train_v3/male/trap_bar_deadlift.png'), female: require('../../assets/train_v3/female/trap_bar_deadlift.png') },
  "walking_lunge": { male: require('../../assets/train_v3/male/walking_lunge.png'), female: require('../../assets/train_v3/female/walking_lunge.png') },
  "bulgarian_split_squat": { male: require('../../assets/train_v3/male/bulgarian_split_squat.png'), female: require('../../assets/train_v3/female/bulgarian_split_squat.png') },
  "hip_thrust": { male: require('../../assets/train_v3/male/hip_thrust.png'), female: require('../../assets/train_v3/female/hip_thrust.png') },
  "seated_leg_curl": { male: require('../../assets/train_v3/male/seated_leg_curl.png'), female: require('../../assets/train_v3/female/seated_leg_curl.png') },
  "lying_leg_curl": { male: require('../../assets/train_v3/male/lying_leg_curl.png'), female: require('../../assets/train_v3/female/lying_leg_curl.png') },
  "leg_extension": { male: require('../../assets/train_v3/male/leg_extension.png'), female: require('../../assets/train_v3/female/leg_extension.png') },
  "standing_calf_raise": { male: require('../../assets/train_v3/male/standing_calf_raise.png'), female: require('../../assets/train_v3/female/standing_calf_raise.png') },
  "cable_hip_abduction": { male: require('../../assets/train_v3/male/cable_hip_abduction.png'), female: require('../../assets/train_v3/female/cable_hip_abduction.png') },
  "bench_press": { male: require('../../assets/train_v3/male/bench_press.png'), female: require('../../assets/train_v3/female/bench_press.png') },
  "incline_dumbbell_press": { male: require('../../assets/train_v3/male/incline_dumbbell_press.png'), female: require('../../assets/train_v3/female/incline_dumbbell_press.png') },
  "cable_chest_fly": { male: require('../../assets/train_v3/male/cable_chest_fly.png'), female: require('../../assets/train_v3/female/cable_chest_fly.png') },
  "chest_press_machine": { male: require('../../assets/train_v3/male/chest_press_machine.png'), female: require('../../assets/train_v3/female/chest_press_machine.png') },
  "barbell_row": { male: require('../../assets/train_v3/male/barbell_row.png'), female: require('../../assets/train_v3/female/barbell_row.png') },
  "seated_cable_row": { male: require('../../assets/train_v3/male/seated_cable_row.png'), female: require('../../assets/train_v3/female/seated_cable_row.png') },
  "lat_pulldown": { male: require('../../assets/train_v3/male/lat_pulldown.png'), female: require('../../assets/train_v3/female/lat_pulldown.png') },
  "pull_up": { male: require('../../assets/train_v3/male/pull_up.png'), female: require('../../assets/train_v3/female/pull_up.png') },
  "dumbbell_shoulder_press": { male: require('../../assets/train_v3/male/dumbbell_shoulder_press.png'), female: require('../../assets/train_v3/female/dumbbell_shoulder_press.png') },
  "cable_lateral_raise": { male: require('../../assets/train_v3/male/cable_lateral_raise.png'), female: require('../../assets/train_v3/female/cable_lateral_raise.png') },
  "rope_pushdown": { male: require('../../assets/train_v3/male/rope_pushdown.png'), female: require('../../assets/train_v3/female/rope_pushdown.png') },
  "overhead_cable_extension": { male: require('../../assets/train_v3/male/overhead_cable_extension.png'), female: require('../../assets/train_v3/female/overhead_cable_extension.png') },
  "cable_crunch": { male: require('../../assets/train_v3/male/cable_crunch.png'), female: require('../../assets/train_v3/female/cable_crunch.png') },
  "cable_wood_chop": { male: require('../../assets/train_v3/male/cable_wood_chop.png'), female: require('../../assets/train_v3/female/cable_wood_chop.png') },
  "bird_dog": { male: require('../../assets/train_v3/male/bird_dog.png'), female: require('../../assets/train_v3/female/bird_dog.png') },
  "medicine_ball_slam": { male: require('../../assets/train_v3/male/medicine_ball_slam.png'), female: require('../../assets/train_v3/female/medicine_ball_slam.png') },
  "battle_ropes": { male: require('../../assets/train_v3/male/battle_ropes.png'), female: require('../../assets/train_v3/female/battle_ropes.png') },
  "box_jump": { male: require('../../assets/train_v3/male/box_jump.png'), female: require('../../assets/train_v3/female/box_jump.png') },
  "agility_ladder": { male: require('../../assets/train_v3/male/agility_ladder.png'), female: require('../../assets/train_v3/female/agility_ladder.png') },
  "bear_crawl": { male: require('../../assets/train_v3/male/bear_crawl.png'), female: require('../../assets/train_v3/female/bear_crawl.png') },
  "power_clean": { male: require('../../assets/train_v3/male/power_clean.png'), female: require('../../assets/train_v3/female/power_clean.png') },
  "snatch": { male: require('../../assets/train_v3/male/snatch.png'), female: require('../../assets/train_v3/female/snatch.png') },
  "clean_and_jerk": { male: require('../../assets/train_v3/male/clean_and_jerk.png'), female: require('../../assets/train_v3/female/clean_and_jerk.png') },
  "kettlebell_swing": { male: require('../../assets/train_v3/male/kettlebell_swing.png'), female: require('../../assets/train_v3/female/kettlebell_swing.png') },
  "farmer_carry": { male: require('../../assets/train_v3/male/farmer_carry.png'), female: require('../../assets/train_v3/female/farmer_carry.png') },
  "suitcase_carry": { male: require('../../assets/train_v3/male/suitcase_carry.png'), female: require('../../assets/train_v3/female/suitcase_carry.png') },
  "sandbag_carry": { male: require('../../assets/train_v3/male/sandbag_carry.png'), female: require('../../assets/train_v3/female/sandbag_carry.png') },
  "front_rack_carry": { male: require('../../assets/train_v3/male/front_rack_carry.png'), female: require('../../assets/train_v3/female/front_rack_carry.png') },
  "sled_push": { male: require('../../assets/train_v3/male/sled_push.png'), female: require('../../assets/train_v3/female/sled_push.png') },
  "sled_pull": { male: require('../../assets/train_v3/male/sled_pull.png'), female: require('../../assets/train_v3/female/sled_pull.png') },
  "tire_flip": { male: require('../../assets/train_v3/male/tire_flip.png'), female: require('../../assets/train_v3/female/tire_flip.png') },
  "atlas_stone": { male: require('../../assets/train_v3/male/atlas_stone.png'), female: require('../../assets/train_v3/female/atlas_stone.png') },
  "push_up": { male: require('../../assets/train_v3/male/push_up.png'), female: require('../../assets/train_v3/female/push_up.png') },
  "diamond_push_up": { male: require('../../assets/train_v3/male/diamond_push_up.png'), female: require('../../assets/train_v3/female/diamond_push_up.png') },
  "archer_push_up": { male: require('../../assets/train_v3/male/archer_push_up.png'), female: require('../../assets/train_v3/female/archer_push_up.png') },
  "handstand_push_up": { male: require('../../assets/train_v3/male/handstand_push_up.png'), female: require('../../assets/train_v3/female/handstand_push_up.png') },
  "dips": { male: require('../../assets/train_v3/male/dips.png'), female: require('../../assets/train_v3/female/dips.png') },
  "trx_push_up": { male: require('../../assets/train_v3/male/trx_push_up.png'), female: require('../../assets/train_v3/female/trx_push_up.png') },
  "muscle_up": { male: require('../../assets/train_v3/male/muscle_up.png'), female: require('../../assets/train_v3/female/muscle_up.png') },
  "inverted_row": { male: require('../../assets/train_v3/male/inverted_row.png'), female: require('../../assets/train_v3/female/inverted_row.png') },
  "plank": { male: require('../../assets/train_v3/male/plank.png'), female: require('../../assets/train_v3/female/plank.png') },
  "side_plank": { male: require('../../assets/train_v3/male/side_plank.png'), female: require('../../assets/train_v3/female/side_plank.png') },
  "bicycle_crunch": { male: require('../../assets/train_v3/male/bicycle_crunch.png'), female: require('../../assets/train_v3/female/bicycle_crunch.png') },
  "hanging_leg_raise": { male: require('../../assets/train_v3/male/hanging_leg_raise.png'), female: require('../../assets/train_v3/female/hanging_leg_raise.png') },
  "russian_twist": { male: require('../../assets/train_v3/male/russian_twist.png'), female: require('../../assets/train_v3/female/russian_twist.png') },
  "ab_wheel": { male: require('../../assets/train_v3/male/ab_wheel.png'), female: require('../../assets/train_v3/female/ab_wheel.png') },
  "landmine_press": { male: require('../../assets/train_v3/male/landmine_press.png'), female: require('../../assets/train_v3/female/landmine_press.png') },
  "face_pull": { male: require('../../assets/train_v3/male/face_pull.png'), female: require('../../assets/train_v3/female/face_pull.png') },
  "barbell_overhead_press": { male: require('../../assets/train_v3/male/barbell_overhead_press.png'), female: require('../../assets/train_v3/female/barbell_overhead_press.png') },
  "shoulder_press_machine": { male: require('../../assets/train_v3/male/shoulder_press_machine.png'), female: require('../../assets/train_v3/female/shoulder_press_machine.png') },
  "dumbbell_front_raise": { male: require('../../assets/train_v3/male/dumbbell_front_raise.png'), female: require('../../assets/train_v3/female/dumbbell_front_raise.png') },
  "cable_rear_delt_fly": { male: require('../../assets/train_v3/male/cable_rear_delt_fly.png'), female: require('../../assets/train_v3/female/cable_rear_delt_fly.png') },
  "reverse_pec_deck": { male: require('../../assets/train_v3/male/reverse_pec_deck.png'), female: require('../../assets/train_v3/female/reverse_pec_deck.png') },
  "upright_row": { male: require('../../assets/train_v3/male/upright_row.png'), female: require('../../assets/train_v3/female/upright_row.png') },
  "ez_bar_skull_crusher": { male: require('../../assets/train_v3/male/ez_bar_skull_crusher.png'), female: require('../../assets/train_v3/female/ez_bar_skull_crusher.png') },
  "dumbbell_overhead_extension": { male: require('../../assets/train_v3/male/dumbbell_overhead_extension.png'), female: require('../../assets/train_v3/female/dumbbell_overhead_extension.png') },
  "jm_press": { male: require('../../assets/train_v3/male/jm_press.png'), female: require('../../assets/train_v3/female/jm_press.png') },
  "triceps_kickback": { male: require('../../assets/train_v3/male/triceps_kickback.png'), female: require('../../assets/train_v3/female/triceps_kickback.png') },
  "bodyweight_squat": { male: require('../../assets/train_v3/male/bodyweight_squat.png'), female: require('../../assets/train_v3/female/bodyweight_squat.png') },
  "cable_glute_kickback": { male: require('../../assets/train_v3/male/cable_glute_kickback.png'), female: require('../../assets/train_v3/female/cable_glute_kickback.png') },
  "seated_calf_raise": { male: require('../../assets/train_v3/male/seated_calf_raise.png'), female: require('../../assets/train_v3/female/seated_calf_raise.png') },
  "single_leg_calf_raise": { male: require('../../assets/train_v3/male/single_leg_calf_raise.png'), female: require('../../assets/train_v3/female/single_leg_calf_raise.png') },
  "smith_machine_squat": { male: require('../../assets/train_v3/male/smith_machine_squat.png'), female: require('../../assets/train_v3/female/smith_machine_squat.png') },
  "sumo_deadlift": { male: require('../../assets/train_v3/male/sumo_deadlift.png'), female: require('../../assets/train_v3/female/sumo_deadlift.png') },
  "back_extension": { male: require('../../assets/train_v3/male/back_extension.png'), female: require('../../assets/train_v3/female/back_extension.png') },
  "good_morning": { male: require('../../assets/train_v3/male/good_morning.png'), female: require('../../assets/train_v3/female/good_morning.png') },
  "kettlebell_clean": { male: require('../../assets/train_v3/male/kettlebell_clean.png'), female: require('../../assets/train_v3/female/kettlebell_clean.png') },
  "kettlebell_press": { male: require('../../assets/train_v3/male/kettlebell_press.png'), female: require('../../assets/train_v3/female/kettlebell_press.png') },
  "kettlebell_snatch": { male: require('../../assets/train_v3/male/kettlebell_snatch.png'), female: require('../../assets/train_v3/female/kettlebell_snatch.png') },
  "cable_pull_through": { male: require('../../assets/train_v3/male/cable_pull_through.png'), female: require('../../assets/train_v3/female/cable_pull_through.png') },
  "kettlebell_halo": { male: require('../../assets/train_v3/male/kettlebell_halo.png'), female: require('../../assets/train_v3/female/kettlebell_halo.png') },
  "log_press": { male: require('../../assets/train_v3/male/log_press.png'), female: require('../../assets/train_v3/female/log_press.png') },
  "hip_abductor_machine": { male: require('../../assets/train_v3/male/hip_abductor_machine.png'), female: require('../../assets/train_v3/female/hip_abductor_machine.png') },
  "hip_adductor_machine": { male: require('../../assets/train_v3/male/hip_adductor_machine.png'), female: require('../../assets/train_v3/female/hip_adductor_machine.png') },
  "donkey_calf_raise": { male: require('../../assets/train_v3/male/donkey_calf_raise.png'), female: require('../../assets/train_v3/female/donkey_calf_raise.png') },
  "yoke_walk": { male: require('../../assets/train_v3/male/yoke_walk.png'), female: require('../../assets/train_v3/female/yoke_walk.png') },
  "overhead_carry": { male: require('../../assets/train_v3/male/overhead_carry.png'), female: require('../../assets/train_v3/female/overhead_carry.png') },
  "turkish_get_up": { male: require('../../assets/train_v3/male/turkish_get_up.png'), female: require('../../assets/train_v3/female/turkish_get_up.png') },
  "kettlebell_windmill": { male: require('../../assets/train_v3/male/kettlebell_windmill.png'), female: require('../../assets/train_v3/female/kettlebell_windmill.png') },
  "medicine_ball_chest_pass": { male: require('../../assets/train_v3/male/medicine_ball_chest_pass.png'), female: require('../../assets/train_v3/female/medicine_ball_chest_pass.png') },
};

const has = (value: string, ...parts: string[]) => parts.some((part) => value.includes(part));

export function visualKeyForExercise(exercise: LibraryExercise): ExerciseVisualKey {
  const n = exercise.name.toLowerCase();
  const e = exercise.equipment.toLowerCase();

  // Exact names containing broad family words must resolve before those families.
  if (n === 'reverse pec deck') return 'reverse_pec_deck';
  if (n === 'upright row') return 'upright_row';

  // Cardio: exact activity and machine always wins before generic movement words.
  if (n === 'swimming') return 'swimming';
  if (n === 'skierg') return 'skierg';
  if (n === 'versaclimber') return 'versaclimber';
  if (n === 'jump rope') return 'jump_rope';
  if (n === 'elliptical') return 'elliptical';
  if (n === 'stairmaster') return 'stairmaster';
  if (n === 'rowing machine') return 'rowing_machine';
  if (n === 'air bike') return 'air_bike';
  if (n === 'stationary bike') return 'stationary_bike';
  if (n === 'outdoor cycling') return 'outdoor_cycling';
  if (n === 'incline treadmill walking') return 'incline_treadmill_walking';
  if (n === 'treadmill walking') return 'treadmill_walking';
  if (n === 'outdoor walking') return 'outdoor_walking';
  if (n === 'treadmill running') return 'treadmill_running';
  if (n === 'outdoor running') return 'outdoor_running';

  // Curls and forearms: distinguish bar shape, grip, cable, bench and dumbbells.
  if (n === 'alternating dumbbell curl') return 'alternating_dumbbell_curl';
  if (n === 'barbell curl') return 'barbell_curl';
  if (n === 'bayesian curl') return 'bayesian_curl';
  if (n === 'cable curl') return 'cable_curl';
  if (n === 'concentration curl') return 'concentration_curl';
  if (n === 'dumbbell curl') return 'dumbbell_curl';
  if (n === 'ez bar curl') return 'ez_bar_curl';
  if (n === 'hammer curl') return 'hammer_curl';
  if (n === 'incline dumbbell curl') return 'incline_dumbbell_curl';
  if (n === 'preacher curl') return 'preacher_curl';
  if (n === 'reverse curl') return 'reverse_curl';
  if (n === 'spider curl') return 'spider_curl';
  if (n === 'zottman curl') return 'zottman_curl';
  if (n === 'wrist curl') return 'wrist_curl';
  if (n === 'reverse wrist curl') return 'reverse_wrist_curl';
  if (n === 'plate pinch hold' || n === 'dead hang') return 'plate_pinch_hold';

  // Chest and pressing equipment.
  if (n === 'archer push-up') return 'archer_push_up';
  if (n === 'diamond push-up') return 'diamond_push_up';
  if (n === 'handstand push-up') return 'handstand_push_up';
  if (n === 'trx push-ups') return 'trx_push_up';
  if (has(n, 'push-up', 'push up', 'clap push-up', 'weighted push-up')) return 'push_up';
  if (n === 'dips' || n === 'bench dips' || n === 'parallel bar dips') return 'dips';
  if (has(n, 'cable fly', 'low-to-high cable fly', 'high-to-low cable fly')) return 'cable_chest_fly';
  if (has(n, 'pec deck', 'chest press machine', 'machine chest press')) return 'chest_press_machine';
  if (has(n, 'incline dumbbell press', 'decline dumbbell press')) return 'incline_dumbbell_press';
  if (has(n, 'bench press', 'floor press', 'dumbbell bench press', 'decline bench press', 'incline barbell bench press', 'close grip bench press', 'jm press')) return n === 'jm press' ? 'jm_press' : 'bench_press';
  if (n === 'dumbbell fly' || n === 'dumbbell pullover') return 'incline_dumbbell_press';

  // Back: distinguish cable, machine/barbell horizontal rows and vertical pulling.
  if (n === 'seated cable row' || n === 'straight arm pulldown') return 'seated_cable_row';
  if (has(n, 'lat pulldown')) return 'lat_pulldown';
  if (has(n, 'pull-up', 'pull up', 'chin-up')) return 'pull_up';
  if (n === 'muscle-up') return 'muscle_up';
  if (n === 'inverted row' || n === 'australian row' || n === 'trx rows') return 'inverted_row';
  if (has(n, 'row', 't-bar row', 'pendlay row', 'barbell row', 'one-arm dumbbell row', 'medicine ball throws')) return n === 'seated cable row' ? 'seated_cable_row' : 'barbell_row';
  if (n === 'good morning') return 'good_morning';
  if (n === 'back extension') return 'back_extension';
  if (has(n, 'shrug')) return 'barbell_row';

  // Shoulders and triceps: preserve machine/cable/barbell/dumbbell differences.
  if (n === 'landmine press') return 'landmine_press';
  if (n === 'face pull') return 'face_pull';
  if (n === 'reverse pec deck') return 'reverse_pec_deck';
  if (n === 'cable rear delt fly') return 'cable_rear_delt_fly';
  if (n === 'upright row') return 'upright_row';
  if (n === 'shoulder press machine') return 'shoulder_press_machine';
  if (has(n, 'military press', 'overhead press', 'push press')) return 'barbell_overhead_press';
  if (has(n, 'dumbbell shoulder press', 'arnold press')) return 'dumbbell_shoulder_press';
  if (has(n, 'front raise', 'plate raise')) return 'dumbbell_front_raise';
  if (has(n, 'lateral raise', 'rear delt fly')) return e.includes('cable') ? 'cable_lateral_raise' : 'dumbbell_front_raise';
  if (n === 'ez bar skull crushers' || n === 'skull crushers') return 'ez_bar_skull_crusher';
  if (n === 'dumbbell overhead extension') return 'dumbbell_overhead_extension';
  if (n === 'overhead cable extension') return 'overhead_cable_extension';
  if (n === 'tricep kickback') return 'triceps_kickback';
  if (has(n, 'pushdown')) return 'rope_pushdown';

  // Lower body: exact stance, machine and hinge equipment.
  if (n === 'smith machine squat' || n === 'smith machine') return 'smith_machine_squat';
  if (n === 'bodyweight squat' || n === 'jump squat' || n === 'sissy squat') return 'bodyweight_squat';
  if (n === 'front squat' || n === 'zercher squat') return 'front_squat';
  if (n === 'goblet squat' || n === 'kettlebell swing') return n === 'kettlebell swing' ? 'kettlebell_swing' : 'goblet_squat';
  if (n === 'sumo squat' || n === 'sumo deadlift') return 'sumo_deadlift';
  if (n === 'hack squat' || n === 'hack squat machine') return 'hack_squat';
  if (has(n, 'back squat', 'barbell back squat')) return 'back_squat';
  if (n === 'leg press' || n === 'leg press calf raise') return 'leg_press';
  if (has(n, 'romanian deadlift', 'stiff-leg deadlift')) return 'romanian_deadlift';
  if (n === 'trap bar deadlift') return 'trap_bar_deadlift';
  if (has(n, 'deadlift')) return 'conventional_deadlift';
  if (n === 'bulgarian split squat' || n === 'split squat') return 'bulgarian_split_squat';
  if (n === 'walking lunge' || n === 'step-up' || n === 'pistol squat') return 'walking_lunge';
  if (has(n, 'hip thrust', 'glute bridge', 'frog pumps')) return 'hip_thrust';
  if (n === 'cable kickback') return 'cable_glute_kickback';
  if (n === 'cable pull-through') return 'cable_pull_through';
  if (has(n, 'hip abductor machine', 'hip abduction machine')) return 'hip_abductor_machine';
  if (has(n, 'hip adductor machine', 'hip adduction machine')) return 'hip_adductor_machine';
  if (has(n, 'hip abduction', 'hip adduction', 'hip abductor', 'hip adductor')) return 'cable_hip_abduction';
  if (n === 'lying leg curl' || n === 'nordic curl' || n === 'glute ham raise') return 'lying_leg_curl';
  if (n === 'seated leg curl') return 'seated_leg_curl';
  if (n === 'leg extension') return 'leg_extension';
  if (has(n, 'seated calf raise')) return 'seated_calf_raise';
  if (has(n, 'single-leg calf raise', 'tibialis raise')) return 'single_leg_calf_raise';
  if (n === 'donkey calf raise') return 'donkey_calf_raise';
  if (has(n, 'calf raise')) return 'standing_calf_raise';

  // Core: cable direction, hanging, floor and anti-rotation patterns stay separate.
  if (n === 'ab wheel rollout') return 'ab_wheel';
  if (has(n, 'bicycle crunch')) return 'bicycle_crunch';
  if (n === 'bird dog' || n === 'dead bug') return 'bird_dog';
  if (n === 'cable crunch') return 'cable_crunch';
  if (n === 'cable wood chop' || n === 'pallof press') return 'cable_wood_chop';
  if (has(n, 'hanging knee raise', 'hanging leg raise', 'toes-to-bar', 'v-ups', 'lying leg raise')) return 'hanging_leg_raise';
  if (n === 'side plank') return 'side_plank';
  if (has(n, 'russian twist', 'windshield wipers')) return 'russian_twist';
  if (has(n, 'plank', 'hollow hold')) return 'plank';
  if (has(n, 'crunch', 'sit-up', 'reverse crunch')) return 'bicycle_crunch';

  // Functional, Olympic and strongman equipment.
  if (n === 'battle ropes') return 'battle_ropes';
  if (n === 'agility ladder' || n === 'skater jumps' || n === 'bounding' || n === 'broad jump' || n === 'depth jump') return 'agility_ladder';
  if (n === 'box jump') return 'box_jump';
  if (n === 'bear crawl' || n === 'crab walk' || n === 'mountain climbers' || n === 'burpees') return 'bear_crawl';
  if (n === 'kettlebell clean') return 'kettlebell_clean';
  if (n === 'kettlebell press') return 'kettlebell_press';
  if (n === 'kettlebell snatch') return 'kettlebell_snatch';
  if (n === 'halo') return 'kettlebell_halo';
  if (n === 'windmill') return 'kettlebell_windmill';
  if (n === 'turkish get-up') return 'turkish_get_up';
  if (n === 'clean and jerk' || n === 'push jerk' || n === 'split jerk') return 'clean_and_jerk';
  if (has(n, 'snatch')) return 'snatch';
  if (has(n, 'clean', 'hang clean')) return 'power_clean';
  if (n === 'medicine ball chest pass') return 'medicine_ball_chest_pass';
  if (n === 'medicine ball slam') return 'medicine_ball_slam';
  if (n === 'atlas stone lift') return 'atlas_stone';
  if (has(n, 'tire flip')) return 'tire_flip';
  if (n === 'sled push') return 'sled_push';
  if (n === 'sled pull') return 'sled_pull';
  if (has(n, 'sandbag carr')) return 'sandbag_carry';
  if (n === 'suitcase carry') return 'suitcase_carry';
  if (n === 'overhead carry') return 'overhead_carry';
  if (n === 'yoke walk') return 'yoke_walk';
  if (n === 'front rack carry') return 'front_rack_carry';
  if (has(n, "farmer's carry", "farmer's walk")) return 'farmer_carry';
  if (n === 'kettlebell swing') return 'kettlebell_swing';
  if (n === 'log press') return 'log_press';

  // Category fallbacks are intentional and equipment-aware, never cardio-as-running.
  if (exercise.targetArea === 'Cardio') return 'outdoor_running';
  if (exercise.targetArea === 'Chest') return e.includes('machine') ? 'chest_press_machine' : 'bench_press';
  if (exercise.targetArea === 'Back') return e.includes('cable') || e.includes('station') ? 'seated_cable_row' : 'barbell_row';
  if (exercise.targetArea === 'Biceps') return e.includes('cable') ? 'cable_curl' : e.includes('barbell') ? 'barbell_curl' : 'dumbbell_curl';
  if (exercise.targetArea === 'Triceps') return e.includes('cable') ? 'rope_pushdown' : 'dumbbell_overhead_extension';
  if (exercise.targetArea === 'Forearms') return 'wrist_curl';
  if (exercise.targetArea === 'Shoulders') return e.includes('machine') ? 'shoulder_press_machine' : e.includes('cable') ? 'cable_lateral_raise' : 'dumbbell_shoulder_press';
  if (exercise.targetArea === 'Legs') return e.includes('machine') ? 'leg_press' : 'back_squat';
  if (exercise.targetArea === 'Core') return 'plank';
  return 'medicine_ball_slam';
}

const normalizedVisualName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// Only these aliases are allowed to use a visual whose filename is not the
// exercise slug. Everything else fails closed instead of showing equipment or
// an angle that belongs to another movement.
const exactVisualAliases: Partial<Record<string, ExerciseVisualKey>> = {
  'barbell-bench-press': 'bench_press',
  'bench-press': 'bench_press',
  'machine-chest-press': 'chest_press_machine',
  'chest-press-machine': 'chest_press_machine',
  'cable-fly': 'cable_chest_fly',
  'trx-push-ups': 'trx_push_up',
  'ez-bar-skull-crushers': 'ez_bar_skull_crusher',
  'tricep-kickback': 'triceps_kickback',
  'romanian-deadlift-rdl': 'romanian_deadlift',
  'barbell-back-squat': 'back_squat',
  'farmers-carry': 'farmer_carry',
  'farmers-walk': 'farmer_carry',
};

// Exercise-specific assets produced after the original visual-family registry.
// Keeping these keyed by catalogue slug prevents angle or equipment variants
// from being collapsed into a similar-looking family image.
const dedicatedExerciseAssets: Partial<Record<string, Record<ExerciseVisualGender, ImageSourcePropType>>> = {
  'australian-row': { male: require('../../assets/train_v3/male/australian_row_v2.png'), female: require('../../assets/train_v3/female/australian_row_v2.png') },
  'barbell-shrug': { male: require('../../assets/train_v3/male/barbell_shrug_v2.png'), female: require('../../assets/train_v3/female/barbell_shrug_v2.png') },
  'chest-supported-row': { male: require('../../assets/train_v3/male/chest_supported_row_v2.png'), female: require('../../assets/train_v3/female/chest_supported_row_v2.png') },
  'chin-up': { male: require('../../assets/train_v3/male/chin_up_v2.png'), female: require('../../assets/train_v3/female/chin_up_v2.png') },
  'dumbbell-shrug': { male: require('../../assets/train_v3/male/dumbbell_shrug_v2.png'), female: require('../../assets/train_v3/female/dumbbell_shrug_v2.png') },
  'lat-pulldown-machine': { male: require('../../assets/train_v3/male/lat_pulldown_machine_v2.png'), female: require('../../assets/train_v3/female/lat_pulldown_machine_v2.png') },
  'machine-row': { male: require('../../assets/train_v3/male/machine_row_v2.png'), female: require('../../assets/train_v3/female/machine_row_v2.png') },
  'medicine-ball-throws': { male: require('../../assets/train_v3/male/medicine_ball_throws_v2.png'), female: require('../../assets/train_v3/female/medicine_ball_throws_v2.png') },
  'neutral-grip-pull-up': { male: require('../../assets/train_v3/male/neutral_grip_pull_up_v2.png'), female: require('../../assets/train_v3/female/neutral_grip_pull_up_v2.png') },
  'one-arm-dumbbell-row': { male: require('../../assets/train_v3/male/one_arm_dumbbell_row_v2.png'), female: require('../../assets/train_v3/female/one_arm_dumbbell_row_v2.png') },
  'pendlay-row': { male: require('../../assets/train_v3/male/pendlay_row_v2.png'), female: require('../../assets/train_v3/female/pendlay_row_v2.png') },
  'seated-row-machine': { male: require('../../assets/train_v3/male/seated_row_machine_v2.png'), female: require('../../assets/train_v3/female/seated_row_machine_v2.png') },
  'straight-arm-pulldown': { male: require('../../assets/train_v3/male/straight_arm_pulldown_v2.png'), female: require('../../assets/train_v3/female/straight_arm_pulldown_v2.png') },
  't-bar-row': { male: require('../../assets/train_v3/male/t_bar_row_v2.png'), female: require('../../assets/train_v3/female/t_bar_row_v2.png') },
  'trx-rows': { male: require('../../assets/train_v3/male/trx_rows_v2.png'), female: require('../../assets/train_v3/female/trx_rows_v2.png') },
  'trap-bar-shrug': { male: require('../../assets/train_v3/male/trap_bar_shrug_v2.png'), female: require('../../assets/train_v3/female/trap_bar_shrug_v2.png') },
  'clap-push-up': { male: require('../../assets/train_v3/male/clap_push_up_v2.png'), female: require('../../assets/train_v3/female/clap_push_up_v2.png') },
  'dumbbell-floor-press': { male: require('../../assets/train_v3/male/dumbbell_floor_press_v2.png'), female: require('../../assets/train_v3/female/dumbbell_floor_press_v2.png') },
  'dumbbell-pullover': { male: require('../../assets/train_v3/male/dumbbell_pullover_v2.png'), female: require('../../assets/train_v3/female/dumbbell_pullover_v2.png') },
  'high-to-low-cable-fly': { male: require('../../assets/train_v3/male/high_to_low_cable_fly_v2.png'), female: require('../../assets/train_v3/female/high_to_low_cable_fly_v2.png') },
  'incline-bench-press': { male: require('../../assets/train_v3/male/incline_bench_press_v2.png'), female: require('../../assets/train_v3/female/incline_bench_press_v2.png') },
  'low-to-high-cable-fly': { male: require('../../assets/train_v3/male/low_to_high_cable_fly_v2.png'), female: require('../../assets/train_v3/female/low_to_high_cable_fly_v2.png') },
  'pec-deck': { male: require('../../assets/train_v3/male/pec_deck_v2.png'), female: require('../../assets/train_v3/female/pec_deck_v2.png') },
  'pec-deck-fly': { male: require('../../assets/train_v3/male/pec_deck_fly_v2.png'), female: require('../../assets/train_v3/female/pec_deck_fly_v2.png') },
  'weighted-push-up': { male: require('../../assets/train_v3/male/weighted_push_up_v2.png'), female: require('../../assets/train_v3/female/weighted_push_up_v2.png') },
  'ab-wheel-rollout': { male: require('../../assets/train_v3/male/ab_wheel_rollout_v2.png'), female: require('../../assets/train_v3/female/ab_wheel_rollout_v2.png') },
  'bicycle-crunches': { male: require('../../assets/train_v3/male/bicycle_crunches_v2.png'), female: require('../../assets/train_v3/female/bicycle_crunches_v2.png') },
  'crunch': { male: require('../../assets/train_v3/male/crunch_v2.png'), female: require('../../assets/train_v3/female/crunch_v2.png') },
  'dead-bug': { male: require('../../assets/train_v3/male/dead_bug_v2.png'), female: require('../../assets/train_v3/female/dead_bug_v2.png') },
  'decline-sit-up': { male: require('../../assets/train_v3/male/decline_sit_up_v2.png'), female: require('../../assets/train_v3/female/decline_sit_up_v2.png') },
  'hanging-knee-raise': { male: require('../../assets/train_v3/male/hanging_knee_raise_v2.png'), female: require('../../assets/train_v3/female/hanging_knee_raise_v2.png') },
  'hollow-hold': { male: require('../../assets/train_v3/male/hollow_hold_v2.png'), female: require('../../assets/train_v3/female/hollow_hold_v2.png') },
  'lying-leg-raise': { male: require('../../assets/train_v3/male/lying_leg_raise_v2.png'), female: require('../../assets/train_v3/female/lying_leg_raise_v2.png') },
  'pallof-press': { male: require('../../assets/train_v3/male/pallof_press_v2.png'), female: require('../../assets/train_v3/female/pallof_press_v2.png') },
  'reverse-crunch': { male: require('../../assets/train_v3/male/reverse_crunch_v2.png'), female: require('../../assets/train_v3/female/reverse_crunch_v2.png') },
  'sit-up': { male: require('../../assets/train_v3/male/sit_up_v2.png'), female: require('../../assets/train_v3/female/sit_up_v2.png') },
  'toes-to-bar': { male: require('../../assets/train_v3/male/toes_to_bar_v2.png'), female: require('../../assets/train_v3/female/toes_to_bar_v2.png') },
  'v-ups': { male: require('../../assets/train_v3/male/v_ups_v2.png'), female: require('../../assets/train_v3/female/v_ups_v2.png') },
  'windshield-wipers': { male: require('../../assets/train_v3/male/windshield_wipers_v2.png'), female: require('../../assets/train_v3/female/windshield_wipers_v2.png') },
  'dead-hang': { male: require('../../assets/train_v3/male/dead_hang_v2.png'), female: require('../../assets/train_v3/female/dead_hang_v2.png') },
  'atlas-stone-lift': { male: require('../../assets/train_v3/male/atlas_stone_lift_v2.png'), female: require('../../assets/train_v3/female/atlas_stone_lift_v2.png') },
  'bounding': { male: require('../../assets/train_v3/male/bounding_v2.png'), female: require('../../assets/train_v3/female/bounding_v2.png') },
  'broad-jump': { male: require('../../assets/train_v3/male/broad_jump_v2.png'), female: require('../../assets/train_v3/female/broad_jump_v2.png') },
  'burpees': { male: require('../../assets/train_v3/male/burpees_v2.png'), female: require('../../assets/train_v3/female/burpees_v2.png') },
  'clean': { male: require('../../assets/train_v3/male/clean_v2.png'), female: require('../../assets/train_v3/female/clean_v2.png') },
  'crab-walk': { male: require('../../assets/train_v3/male/crab_walk_v2.png'), female: require('../../assets/train_v3/female/crab_walk_v2.png') },
  'depth-jump': { male: require('../../assets/train_v3/male/depth_jump_v2.png'), female: require('../../assets/train_v3/female/depth_jump_v2.png') },
  'farmer-s-carry': { male: require('../../assets/train_v3/male/farmer_s_carry_v2.png'), female: require('../../assets/train_v3/female/farmer_s_carry_v2.png') },
  'farmer-s-walk': { male: require('../../assets/train_v3/male/farmer_s_walk_v2.png'), female: require('../../assets/train_v3/female/farmer_s_walk_v2.png') },
  'halo': { male: require('../../assets/train_v3/male/halo_v2.png'), female: require('../../assets/train_v3/female/halo_v2.png') },
  'hang-clean': { male: require('../../assets/train_v3/male/hang_clean_v2.png'), female: require('../../assets/train_v3/female/hang_clean_v2.png') },
  'mountain-climbers': { male: require('../../assets/train_v3/male/mountain_climbers_v2.png'), female: require('../../assets/train_v3/female/mountain_climbers_v2.png') },
  'power-snatch': { male: require('../../assets/train_v3/male/power_snatch_v2.png'), female: require('../../assets/train_v3/female/power_snatch_v2.png') },
  'push-jerk': { male: require('../../assets/train_v3/male/push_jerk_v2.png'), female: require('../../assets/train_v3/female/push_jerk_v2.png') },
  'sandbag-carries': { male: require('../../assets/train_v3/male/sandbag_carries_v2.png'), female: require('../../assets/train_v3/female/sandbag_carries_v2.png') },
  'skater-jumps': { male: require('../../assets/train_v3/male/skater_jumps_v2.png'), female: require('../../assets/train_v3/female/skater_jumps_v2.png') },
  'smith-machine': { male: require('../../assets/train_v3/male/smith_machine_v2.png'), female: require('../../assets/train_v3/female/smith_machine_v2.png') },
  'split-jerk': { male: require('../../assets/train_v3/male/split_jerk_v2.png'), female: require('../../assets/train_v3/female/split_jerk_v2.png') },
  'tire-flips': { male: require('../../assets/train_v3/male/tire_flips_v2.png'), female: require('../../assets/train_v3/female/tire_flips_v2.png') },
  'windmill': { male: require('../../assets/train_v3/male/windmill_v2.png'), female: require('../../assets/train_v3/female/windmill_v2.png') },
  'barbell-glute-bridge': { male: require('../../assets/train_v3/male/barbell_glute_bridge_v2.png'), female: require('../../assets/train_v3/female/barbell_glute_bridge_v2.png') },
  'cable-kickback': { male: require('../../assets/train_v3/male/cable_kickback_v2.png'), female: require('../../assets/train_v3/female/cable_kickback_v2.png') },
  'deadlift': { male: require('../../assets/train_v3/male/deadlift_v2.png'), female: require('../../assets/train_v3/female/deadlift_v2.png') },
  'frog-pumps': { male: require('../../assets/train_v3/male/frog_pumps_v2.png'), female: require('../../assets/train_v3/female/frog_pumps_v2.png') },
  'glute-ham-raise': { male: require('../../assets/train_v3/male/glute_ham_raise_v2.png'), female: require('../../assets/train_v3/female/glute_ham_raise_v2.png') },
  'hack-squat-machine': { male: require('../../assets/train_v3/male/hack_squat_machine_v2.png'), female: require('../../assets/train_v3/female/hack_squat_machine_v2.png') },
  'hip-abduction-machine': { male: require('../../assets/train_v3/male/hip_abduction_machine_v2.png'), female: require('../../assets/train_v3/female/hip_abduction_machine_v2.png') },
  'jump-squat': { male: require('../../assets/train_v3/male/jump_squat_v2.png'), female: require('../../assets/train_v3/female/jump_squat_v2.png') },
  'leg-press-calf-raise': { male: require('../../assets/train_v3/male/leg_press_calf_raise_v2.png'), female: require('../../assets/train_v3/female/leg_press_calf_raise_v2.png') },
  'nordic-curl': { male: require('../../assets/train_v3/male/nordic_curl_v2.png'), female: require('../../assets/train_v3/female/nordic_curl_v2.png') },
  'pistol-squat': { male: require('../../assets/train_v3/male/pistol_squat_v2.png'), female: require('../../assets/train_v3/female/pistol_squat_v2.png') },
  'seated-calf-raise-machine': { male: require('../../assets/train_v3/male/seated_calf_raise_machine_v2.png'), female: require('../../assets/train_v3/female/seated_calf_raise_machine_v2.png') },
  'single-leg-hip-thrust': { male: require('../../assets/train_v3/male/single_leg_hip_thrust_v2.png'), female: require('../../assets/train_v3/female/single_leg_hip_thrust_v2.png') },
  'sissy-squat': { male: require('../../assets/train_v3/male/sissy_squat_v2.png'), female: require('../../assets/train_v3/female/sissy_squat_v2.png') },
  'split-squat': { male: require('../../assets/train_v3/male/split_squat_v2.png'), female: require('../../assets/train_v3/female/split_squat_v2.png') },
  'standing-calf-raise-machine': { male: require('../../assets/train_v3/male/standing_calf_raise_machine_v2.png'), female: require('../../assets/train_v3/female/standing_calf_raise_machine_v2.png') },
  'step-up': { male: require('../../assets/train_v3/male/step_up_v2.png'), female: require('../../assets/train_v3/female/step_up_v2.png') },
  'stiff-leg-deadlift': { male: require('../../assets/train_v3/male/stiff_leg_deadlift_v2.png'), female: require('../../assets/train_v3/female/stiff_leg_deadlift_v2.png') },
  'sumo-squat': { male: require('../../assets/train_v3/male/sumo_squat_v2.png'), female: require('../../assets/train_v3/female/sumo_squat_v2.png') },
  'tibialis-raise': { male: require('../../assets/train_v3/male/tibialis_raise_v2.png'), female: require('../../assets/train_v3/female/tibialis_raise_v2.png') },
  'zercher-squat': { male: require('../../assets/train_v3/male/zercher_squat_v2.png'), female: require('../../assets/train_v3/female/zercher_squat_v2.png') },
  'arnold-press': { male: require('../../assets/train_v3/male/arnold_press_v2.png'), female: require('../../assets/train_v3/female/arnold_press_v2.png') },
  'cable-front-raise': { male: require('../../assets/train_v3/male/cable_front_raise_v2.png'), female: require('../../assets/train_v3/female/cable_front_raise_v2.png') },
  'chest-supported-rear-delt-raise': { male: require('../../assets/train_v3/male/chest_supported_rear_delt_raise_v2.png'), female: require('../../assets/train_v3/female/chest_supported_rear_delt_raise_v2.png') },
  'dumbbell-lateral-raise': { male: require('../../assets/train_v3/male/dumbbell_lateral_raise_v2.png'), female: require('../../assets/train_v3/female/dumbbell_lateral_raise_v2.png') },
  'front-raise': { male: require('../../assets/train_v3/male/front_raise_v2.png'), female: require('../../assets/train_v3/female/front_raise_v2.png') },
  'leaning-lateral-raise': { male: require('../../assets/train_v3/male/leaning_lateral_raise_v2.png'), female: require('../../assets/train_v3/female/leaning_lateral_raise_v2.png') },
  'machine-lateral-raise': { male: require('../../assets/train_v3/male/machine_lateral_raise_v2.png'), female: require('../../assets/train_v3/female/machine_lateral_raise_v2.png') },
  'military-press': { male: require('../../assets/train_v3/male/military_press_v2.png'), female: require('../../assets/train_v3/female/military_press_v2.png') },
  'overhead-press': { male: require('../../assets/train_v3/male/overhead_press_v2.png'), female: require('../../assets/train_v3/female/overhead_press_v2.png') },
  'pike-push-up': { male: require('../../assets/train_v3/male/pike_push_up_v2.png'), female: require('../../assets/train_v3/female/pike_push_up_v2.png') },
  'plate-raise': { male: require('../../assets/train_v3/male/plate_raise_v2.png'), female: require('../../assets/train_v3/female/plate_raise_v2.png') },
  'push-press': { male: require('../../assets/train_v3/male/push_press_v2.png'), female: require('../../assets/train_v3/female/push_press_v2.png') },
  'rear-delt-fly': { male: require('../../assets/train_v3/male/rear_delt_fly_v2.png'), female: require('../../assets/train_v3/female/rear_delt_fly_v2.png') },
  'bench-dips': { male: require('../../assets/train_v3/male/bench_dips_v2.png'), female: require('../../assets/train_v3/female/bench_dips_v2.png') },
  'close-grip-bench-press': { male: require('../../assets/train_v3/male/close_grip_bench_press_v2.png'), female: require('../../assets/train_v3/female/close_grip_bench_press_v2.png') },
  'parallel-bar-dips': { male: require('../../assets/train_v3/male/parallel_bar_dips_v2.png'), female: require('../../assets/train_v3/female/parallel_bar_dips_v2.png') },
  'skull-crushers': { male: require('../../assets/train_v3/male/skull_crushers_v2.png'), female: require('../../assets/train_v3/female/skull_crushers_v2.png') },
  'straight-bar-pushdown': { male: require('../../assets/train_v3/male/straight_bar_pushdown_v2.png'), female: require('../../assets/train_v3/female/straight_bar_pushdown_v2.png') },
  'v-bar-pushdown': { male: require('../../assets/train_v3/male/v_bar_pushdown_v2.png'), female: require('../../assets/train_v3/female/v_bar_pushdown_v2.png') },
  'decline-bench-press': {
    male: require('../../assets/train_v3/male/decline_bench_press.png'),
    female: require('../../assets/train_v3/female/decline_bench_press.png'),
  },
  'decline-dumbbell-press': {
    male: require('../../assets/train_v3/male/decline_dumbbell_press.png'),
    female: require('../../assets/train_v3/female/decline_dumbbell_press.png'),
  },
  'decline-push-up': {
    male: require('../../assets/train_v3/male/decline_push_up.png'),
    female: require('../../assets/train_v3/female/decline_push_up.png'),
  },
  'dumbbell-bench-press': {
    male: require('../../assets/train_v3/male/dumbbell_bench_press.png'),
    female: require('../../assets/train_v3/female/dumbbell_bench_press.png'),
  },
  'dumbbell-fly': {
    male: require('../../assets/train_v3/male/dumbbell_fly_v2.png'),
    female: require('../../assets/train_v3/female/dumbbell_fly_v2.png'),
  },
  'incline-barbell-bench-press': {
    male: require('../../assets/train_v3/male/incline_barbell_bench_press_v2.png'),
    female: require('../../assets/train_v3/female/incline_barbell_bench_press_v2.png'),
  },
  'assisted-pull-up-machine': {
    male: require('../../assets/train_v3/male/assisted_pull_up_machine_v2.png'),
    female: require('../../assets/train_v3/female/assisted_pull_up_machine_v2.png'),
  },
  'assisted-pull-up': {
    male: require('../../assets/train_v3/male/assisted_pull_up_band_v2.png'),
    female: require('../../assets/train_v3/female/assisted_pull_up_band_v2.png'),
  },
};

export function isExerciseVisualExact(exercise: LibraryExercise): boolean {
  if (dedicatedExerciseAssets[exercise.slug]) return true;
  const key = visualKeyForExercise(exercise);
  const slugKey = normalizedVisualName(exercise.slug);
  return slugKey === key || exactVisualAliases[exercise.slug] === key;
}

export function imageForExercise(exercise: LibraryExercise, gender: string | null | undefined): ImageSourcePropType | undefined {
  const visualGender: ExerciseVisualGender = gender === 'female' ? 'female' : 'male';
  const dedicated = dedicatedExerciseAssets[exercise.slug];
  if (dedicated) return dedicated[visualGender];
  if (!isExerciseVisualExact(exercise)) return undefined;
  return visualAssets[visualKeyForExercise(exercise)][visualGender];
}

export function exerciseVisualCoverage(exercises: LibraryExercise[]) {
  return exercises.map((exercise) => ({ slug: exercise.slug, key: visualKeyForExercise(exercise), exact: isExerciseVisualExact(exercise) }));
}
