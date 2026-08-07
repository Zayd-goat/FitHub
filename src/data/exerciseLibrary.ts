import { Exercise } from '../lib/types';

export type PresetExercise = Exercise & {
  tags: string[];
  subgroup?: string;
  image_urls: string[];
  track_weight?: boolean;
  track_sets?: boolean;
};

type Group = { tag: string; subgroup?: string; names: string[] };

const groups: Group[] = [
  { tag: 'Compound', subgroup: 'Squat Movements', names: [
    'Barbell Back Squat','Front Squat','Goblet Squat','Hack Squat','Smith Machine Squat','Zercher Squat','Bulgarian Split Squat','Split Squat','Pistol Squat','Sumo Squat'
  ]},
  { tag: 'Compound', subgroup: 'Hip Hinge Movements', names: [
    'Conventional Deadlift','Romanian Deadlift (RDL)','Stiff-Leg Deadlift','Sumo Deadlift','Trap Bar Deadlift','Good Morning','Hip Thrust','Barbell Glute Bridge','Kettlebell Swing'
  ]},
  { tag: 'Compound', subgroup: 'Horizontal Push', names: [
    'Bench Press','Incline Bench Press','Decline Bench Press','Dumbbell Bench Press','Dumbbell Floor Press','Push-Up','Machine Chest Press'
  ]},
  { tag: 'Compound', subgroup: 'Vertical Push', names: [
    'Overhead Press','Military Press','Dumbbell Shoulder Press','Arnold Press','Push Press','Handstand Push-Up'
  ]},
  { tag: 'Compound', subgroup: 'Horizontal Pull', names: [
    'Barbell Row','Pendlay Row','Seated Cable Row','Chest Supported Row','One-Arm Dumbbell Row','T-Bar Row','Inverted Row'
  ]},
  { tag: 'Compound', subgroup: 'Vertical Pull', names: [
    'Pull-Up','Chin-Up','Lat Pulldown','Assisted Pull-Up','Neutral Grip Pull-Up'
  ]},
  { tag: 'Compound', subgroup: 'Loaded Carries', names: [
    "Farmer's Carry",'Suitcase Carry','Overhead Carry','Front Rack Carry','Sandbag Carry'
  ]},

  { tag: 'Chest', names: [
    'Barbell Bench Press','Incline Barbell Bench Press','Decline Bench Press','Dumbbell Bench Press','Incline Dumbbell Press','Decline Dumbbell Press','Dumbbell Fly','Cable Fly','Low-to-High Cable Fly','High-to-Low Cable Fly','Pec Deck Fly','Machine Chest Press','Push-Up','Weighted Push-Up','Dips','Dumbbell Pullover'
  ]},

  { tag: 'Shoulders', subgroup: 'Front Delts', names: [
    'Overhead Press','Military Press','Dumbbell Shoulder Press','Arnold Press','Front Raise','Plate Raise','Landmine Press'
  ]},
  { tag: 'Shoulders', subgroup: 'Side Delts', names: [
    'Dumbbell Lateral Raise','Cable Lateral Raise','Machine Lateral Raise','Leaning Lateral Raise','Upright Row'
  ]},
  { tag: 'Shoulders', subgroup: 'Rear Delts', names: [
    'Reverse Pec Deck','Rear Delt Fly','Cable Rear Delt Fly','Face Pull','Chest Supported Rear Delt Raise'
  ]},

  { tag: 'Back', subgroup: 'Lats', names: [
    'Pull-Up','Chin-Up','Lat Pulldown','Straight Arm Pulldown','Dumbbell Pullover'
  ]},
  { tag: 'Back', subgroup: 'Mid Back', names: [
    'Barbell Row','Pendlay Row','T-Bar Row','Seated Cable Row','Chest Supported Row','Machine Row','One-Arm Dumbbell Row'
  ]},
  { tag: 'Back', subgroup: 'Upper Traps', names: [
    'Barbell Shrug','Dumbbell Shrug','Trap Bar Shrug'
  ]},
  { tag: 'Back', subgroup: 'Lower Back', names: [
    'Back Extension','Good Morning','Romanian Deadlift','Deadlift'
  ]},

  { tag: 'Biceps', names: [
    'Barbell Curl','EZ Bar Curl','Dumbbell Curl','Alternating Dumbbell Curl','Hammer Curl','Incline Dumbbell Curl','Concentration Curl','Spider Curl','Preacher Curl','Cable Curl','Bayesian Curl','Reverse Curl','Zottman Curl'
  ]},
  { tag: 'Triceps', names: [
    'Rope Pushdown','Straight Bar Pushdown','V-Bar Pushdown','Skull Crushers','EZ Bar Skull Crushers','Overhead Cable Extension','Dumbbell Overhead Extension','Close Grip Bench Press','JM Press','Bench Dips','Parallel Bar Dips','Tricep Kickback'
  ]},
  { tag: 'Forearms', names: [
    'Wrist Curl','Reverse Wrist Curl','Hammer Curl','Reverse Curl',"Farmer's Carry",'Plate Pinch Hold','Dead Hang'
  ]},

  { tag: 'Legs', subgroup: 'Quadriceps', names: [
    'Back Squat','Front Squat','Hack Squat','Leg Press','Bulgarian Split Squat','Walking Lunge','Step-Up','Leg Extension','Goblet Squat','Sissy Squat'
  ]},
  { tag: 'Legs', subgroup: 'Hamstrings', names: [
    'Romanian Deadlift','Stiff-Leg Deadlift','Lying Leg Curl','Seated Leg Curl','Nordic Curl','Glute Ham Raise','Good Morning'
  ]},
  { tag: 'Legs', subgroup: 'Glutes', names: [
    'Hip Thrust','Barbell Glute Bridge','Cable Kickback','Frog Pumps','Hip Abduction Machine','Single-Leg Hip Thrust'
  ]},
  { tag: 'Legs', subgroup: 'Calves', names: [
    'Standing Calf Raise','Seated Calf Raise','Donkey Calf Raise','Single-Leg Calf Raise','Leg Press Calf Raise','Tibialis Raise'
  ]},

  { tag: 'Core', subgroup: 'Upper Abs', names: ['Crunch','Cable Crunch','Sit-Up','Decline Sit-Up']},
  { tag: 'Core', subgroup: 'Lower Abs', names: ['Reverse Crunch','Hanging Knee Raise','Hanging Leg Raise','Lying Leg Raise','Toes-to-Bar']},
  { tag: 'Core', subgroup: 'Obliques', names: ['Russian Twist','Cable Wood Chop','Side Plank','Bicycle Crunch','Windshield Wipers']},
  { tag: 'Core', subgroup: 'Core Stability', names: ['Plank','Side Plank','Hollow Hold','Dead Bug','Bird Dog','Pallof Press','Ab Wheel Rollout']},

  { tag: 'Bodyweight', names: [
    'Push-Up','Diamond Push-Up','Archer Push-Up','Decline Push-Up','Pike Push-Up','Handstand Push-Up','Pull-Up','Chin-Up','Muscle-Up','Australian Row','Bodyweight Squat','Jump Squat','Walking Lunge','Bulgarian Split Squat','Pistol Squat','Box Jump','Dips','Plank','Mountain Climbers','V-Ups','Bicycle Crunches','Burpees'
  ]},
  { tag: 'Plyometrics', names: [
    'Box Jump','Broad Jump','Depth Jump','Jump Squat','Medicine Ball Slam','Medicine Ball Chest Pass','Clap Push-Up','Bounding','Skater Jumps'
  ]},
  { tag: 'Olympic', names: ['Clean','Power Clean','Hang Clean','Snatch','Power Snatch','Clean and Jerk','Push Jerk','Split Jerk']},
  { tag: 'Strongman', names: ['Atlas Stone Lift','Log Press','Yoke Walk','Tire Flip','Sandbag Carry','Sled Push','Sled Pull',"Farmer's Walk"]},
  { tag: 'Kettlebell', names: ['Kettlebell Swing','Goblet Squat','Turkish Get-Up','Kettlebell Clean','Kettlebell Snatch','Kettlebell Press','Windmill','Halo',"Farmer's Carry"]},
  { tag: 'Cable', names: [
    'Cable Fly','Cable Curl','Rope Pushdown','Straight Bar Pushdown','Overhead Cable Extension','Cable Lateral Raise','Face Pull','Straight Arm Pulldown','Lat Pulldown','Seated Cable Row','Cable Crunch','Cable Wood Chop','Cable Pull-Through','Cable Kickback','Cable Front Raise'
  ]},
  { tag: 'Machine', names: [
    'Chest Press Machine','Shoulder Press Machine','Pec Deck','Reverse Pec Deck','Lat Pulldown Machine','Seated Row Machine','Assisted Pull-Up Machine','Leg Press','Hack Squat Machine','Leg Extension','Seated Leg Curl','Lying Leg Curl','Hip Abductor Machine','Hip Adductor Machine','Standing Calf Raise Machine','Seated Calf Raise Machine','Smith Machine'
  ]},
  { tag: 'Cardio', names: ['Treadmill','StairMaster','Elliptical','Stationary Bike','Air Bike','Rowing Machine','SkiErg',"Jacob's Ladder",'VersaClimber','Jump Rope']},
  { tag: 'Functional', names: ['Battle Ropes','TRX Rows','TRX Push-Ups','Sled Push','Sled Pull','Medicine Ball Throws','Sandbag Carries','Agility Ladder','Tire Flips','Bear Crawl','Crab Walk']}
];

const timed = new Set([
  'Plank','Side Plank','Hollow Hold','Dead Hang','Plate Pinch Hold','StairMaster','Air Bike',"Jacob's Ladder",'VersaClimber','Jump Rope','Battle Ropes','Agility Ladder','Bear Crawl','Crab Walk'
]);
const distance = new Set([
  'Treadmill','Elliptical','Stationary Bike','Rowing Machine','SkiErg',"Farmer's Carry",'Suitcase Carry','Overhead Carry','Front Rack Carry','Sandbag Carry','Yoke Walk',"Farmer's Walk",'Sled Push','Sled Pull','Sandbag Carries','Bounding'
]);
const carries = new Set(["Farmer's Carry",'Suitcase Carry','Overhead Carry','Front Rack Carry','Sandbag Carry','Yoke Walk',"Farmer's Walk",'Sled Push','Sled Pull','Sandbag Carries']);
const weightedTimed = new Set(['Plate Pinch Hold']);
const bodyweightNames = new Set([
  'Push-Up','Weighted Push-Up','Dips','Bench Dips','Parallel Bar Dips','Diamond Push-Up','Archer Push-Up','Decline Push-Up','Pike Push-Up','Handstand Push-Up','Pull-Up','Chin-Up','Assisted Pull-Up','Neutral Grip Pull-Up','Muscle-Up','Australian Row','Inverted Row','Bodyweight Squat','Jump Squat','Walking Lunge','Bulgarian Split Squat','Split Squat','Pistol Squat','Box Jump','Broad Jump','Depth Jump','Clap Push-Up','Mountain Climbers','V-Ups','Bicycle Crunches','Bicycle Crunch','Burpees','Crunch','Sit-Up','Decline Sit-Up','Reverse Crunch','Hanging Knee Raise','Hanging Leg Raise','Lying Leg Raise','Toes-to-Bar','Russian Twist','Windshield Wipers','Dead Bug','Bird Dog','Ab Wheel Rollout','Nordic Curl','Glute Ham Raise','Frog Pumps','Single-Leg Hip Thrust','Single-Leg Calf Raise','Sissy Squat'
]);

const mediaAliases: Record<string, string> = {
  'Barbell Back Squat': 'Barbell_Squat',
  'Back Squat': 'Barbell_Squat',
  'Front Squat': 'Front_Barbell_Squat',
  'Conventional Deadlift': 'Barbell_Deadlift',
  'Deadlift': 'Barbell_Deadlift',
  'Romanian Deadlift (RDL)': 'Romanian_Deadlift_With_Dumbbells',
  'Romanian Deadlift': 'Romanian_Deadlift_With_Dumbbells',
  'Bench Press': 'Barbell_Bench_Press_-_Medium_Grip',
  'Barbell Bench Press': 'Barbell_Bench_Press_-_Medium_Grip',
  'Incline Bench Press': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'Incline Barbell Bench Press': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'Dumbbell Bench Press': 'Dumbbell_Bench_Press',
  'Incline Dumbbell Press': 'Incline_Dumbbell_Press',
  'Push-Up': 'Pushups',
  'Pull-Up': 'Pullups',
  'Chin-Up': 'Chin-Up',
  'Lat Pulldown': 'Wide-Grip_Lat_Pulldown',
  'Seated Cable Row': 'Seated_Cable_Rows',
  'One-Arm Dumbbell Row': 'One-Arm_Dumbbell_Row',
  'Overhead Press': 'Standing_Military_Press',
  'Military Press': 'Standing_Military_Press',
  'Dumbbell Shoulder Press': 'Dumbbell_Shoulder_Press',
  'Arnold Press': 'Arnold_Dumbbell_Press',
  'Dumbbell Lateral Raise': 'Side_Lateral_Raise',
  'Face Pull': 'Face_Pull',
  'Barbell Curl': 'Barbell_Curl',
  'Dumbbell Curl': 'Dumbbell_Bicep_Curl',
  'Hammer Curl': 'Hammer_Curls',
  'Preacher Curl': 'Preacher_Curl',
  'Rope Pushdown': 'Triceps_Pushdown_-_Rope_Attachment',
  'Skull Crushers': 'Lying_Triceps_Press',
  'Leg Press': 'Leg_Press',
  'Leg Extension': 'Leg_Extensions',
  'Seated Leg Curl': 'Seated_Leg_Curl',
  'Lying Leg Curl': 'Lying_Leg_Curls',
  'Hip Thrust': 'Barbell_Hip_Thrust',
  'Standing Calf Raise': 'Standing_Calf_Raises',
  'Seated Calf Raise': 'Seated_Calf_Raise',
  'Crunch': 'Crunches',
  'Cable Crunch': 'Cable_Crunch',
  'Hanging Leg Raise': 'Hanging_Leg_Raise',
  'Russian Twist': 'Russian_Twist',
  'Plank': 'Plank',
  'Kettlebell Swing': 'One-Arm_Kettlebell_Swings',
  'Goblet Squat': 'Goblet_Squat',
  'Turkish Get-Up': 'Turkish_Get-Up',
  'Clean': 'Clean',
  'Power Clean': 'Power_Clean',
  'Snatch': 'Snatch',
  'Clean and Jerk': 'Clean_and_Jerk',
  'Box Jump': 'Box_Jump_Multiple_Response',
  'Burpees': 'Burpee',
  'Battle Ropes': 'Battling_Ropes',
  'Treadmill': 'Walking_Treadmill',
  'Stationary Bike': 'Bicycling_Stationary',
  'Rowing Machine': 'Rowing_Stationary'
};

function mediaId(name: string) {
  const alias = mediaAliases[name];
  if (alias) return alias;
  return name
    .replace(/\(RDL\)/gi, '')
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w ? w[0].toUpperCase() + w.slice(1) : w)
    .join('_');
}

function mediaUrls(name: string) {
  const id = mediaId(name);
  const base = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${encodeURIComponent(id)}`;
  return [`${base}/0.jpg`, `${base}/1.jpg`];
}

function inferEquipment(name: string) {
  const n = name.toLowerCase();
  if (bodyweightNames.has(name)) return 'Bodyweight';
  if (n.includes('smith machine') || name === 'Smith Machine') return 'Smith machine';
  if (n.includes('cable') || n.includes('pulldown') || n.includes('pushdown') || n.includes('face pull')) return 'Cable machine';
  if (n.includes('dumbbell') || n.includes('arnold')) return 'Dumbbells';
  if (n.includes('kettlebell')) return 'Kettlebell';
  if (n.includes('barbell') || n.includes('good morning') || n.includes('zercher') || n.includes('landmine')) return 'Barbell';
  if (n.includes('ez bar')) return 'EZ bar';
  if (n.includes('trap bar')) return 'Trap bar';
  if (n.includes('machine') || n.includes('pec deck') || n.includes('leg press') || n.includes('leg extension') || n.includes('leg curl') || n.includes('hack squat') || n.includes('hip abductor') || n.includes('hip adductor')) return 'Machine';
  if (n.includes('medicine ball')) return 'Medicine ball';
  if (n.includes('sandbag')) return 'Sandbag';
  if (n.includes('sled')) return 'Sled';
  if (n.includes('tire')) return 'Tire';
  if (n.includes('trx')) return 'TRX';
  if (n.includes('battle rope')) return 'Battle ropes';
  if (n.includes('treadmill')) return 'Treadmill';
  if (n.includes('stairmaster')) return 'StairMaster';
  if (n.includes('elliptical')) return 'Elliptical';
  if (n.includes('bike')) return 'Bike';
  if (n.includes('rowing')) return 'Rowing machine';
  if (n.includes('skierg')) return 'SkiErg';
  if (n.includes('jacob')) return "Jacob's Ladder";
  if (n.includes('versaclimber')) return 'VersaClimber';
  if (n.includes('jump rope')) return 'Jump rope';
  if (n.includes('atlas stone')) return 'Atlas stone';
  if (n.includes('log press')) return 'Strongman log';
  if (n.includes('yoke')) return 'Yoke';
  if (n.includes('plate')) return 'Weight plate';
  return 'Gym / free weights';
}

function inferRepRange(name: string): [number | null, number | null] {
  if (timed.has(name) || distance.has(name)) return [null, null];
  const n = name.toLowerCase();
  if (n.includes('deadlift') || n === 'clean' || n.includes('snatch') || n.includes('jerk')) return [3, 8];
  if (n.includes('squat') || n.includes('bench press') || n.includes('overhead press') || n.includes('military press') || n.includes('row')) return [5, 12];
  if (n.includes('raise') || n.includes('curl') || n.includes('fly') || n.includes('pushdown') || n.includes('extension') || n.includes('kickback')) return [8, 15];
  return [6, 15];
}

export function buildExerciseLibrary(): PresetExercise[] {
  const byName = new Map<string, PresetExercise>();
  for (const group of groups) {
    for (const name of group.names) {
      const existing = byName.get(name);
      if (existing) {
        if (!existing.tags.includes(group.tag)) existing.tags.push(group.tag);
        if (!existing.subgroup && group.subgroup) existing.subgroup = group.subgroup;
        continue;
      }
      const metric_type: Exercise['metric_type'] = timed.has(name) ? 'time' : distance.has(name) ? 'distance' : 'strength';
      const [rep_min, rep_max] = inferRepRange(name);
      byName.set(name, {
        name,
        category: group.tag,
        subgroup: group.subgroup,
        tags: [group.tag],
        equipment: inferEquipment(name),
        metric_type,
        icon_emoji: metric_type === 'time' ? '⏱️' : metric_type === 'distance' ? '🏃' : '🏋️',
        rep_min,
        rep_max,
        image_urls: mediaUrls(name),
        track_weight: metric_type === 'strength' || carries.has(name) || weightedTimed.has(name),
        track_sets: metric_type === 'strength' || carries.has(name)
      });
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const presetExercises = buildExerciseLibrary();
export const exerciseTags = ['All','Compound','Chest','Shoulders','Back','Biceps','Triceps','Forearms','Legs','Core','Bodyweight','Plyometrics','Olympic','Strongman','Kettlebell','Cable','Machine','Cardio','Functional'];
