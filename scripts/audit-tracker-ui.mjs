import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const profile = read('src/screens/tabs/ProfileTab.tsx');
const workout = read('src/screens/tabs/WorkoutTab.tsx');
const journey = read('src/screens/FitnessJourneyScreen.tsx');
const supplements = read('src/screens/SupplementRemindersScreen.tsx');
const food = read('src/screens/tabs/FoodTab.tsx');
const icons = read('src/components/FitHubTrackerIcons.tsx');

const hasAll = (source, values) => values.every((value) => source.includes(value));
const checks = [
  ['Tracker icon family contains the primary and account scenes', hasAll(icons, ['ProfileSceneIcon', 'WorkoutBuilderSceneIcon', 'JourneyProgressSceneIcon', 'SupplementTrackerSceneIcon', 'CustomizePhoneSceneIcon', 'WeeklySplitSceneIcon', 'ClubsSceneIcon', 'ProfileIdSceneIcon', 'ProfileDetailIcon'])],
  ['You tab has profile dashboard, snapshots and quick access', hasAll(profile, ['YOUR FITHUB', 'Quick access', 'Snapshot', 'ActionTile', 'App & account'])],
  ['You tab uses illustrated account cards and grouped personal details', hasAll(profile, ['AccountArtCard', 'DetailGroup', 'PROFILE', 'TRAINING', 'PREFERENCES', 'ProfileIdSceneIcon'])],
  ['You tab retains editable profile and sign out', hasAll(profile, ['uploadAvatar', 'save', 'Sign out'])],
  ['Workout opens directly on the muscle-group grid', hasAll(workout, ['muscleGridFirst', "{label:'Chest'", "{label:'Back'"])],
  ['Workout removes the extra hero, progress rail and Step 1 introduction', !['BUILD YOUR SESSION', 'BuildStep', 'Choose your focus'].some((value) => workout.includes(value))],
  ['Workout retains saved plans, preview, active recovery and reordering', hasAll(workout, ['savedWorkouts', 'showWorkoutPreview', 'activeStartedAt', 'DraggableOrderRow'])],
  ['Workout retains movement guidance and Android Back handling', hasAll(workout, ['showExerciseGuide', 'MOVEMENT GUIDE', 'useImperativeHandle'])],
  ['Journey has period hero, progress and prior-period comparison', hasAll(journey, ['JourneyProgressSceneIcon', 'completionProgress', 'workoutDelta', 'vs previous'])],
  ['Journey retains weekly/monthly reporting and pull to refresh', hasAll(journey, ["'week'", "'month'", 'RefreshableScrollView', 'onRefresh={load}'])],
  ['Supplements has routine, calendar, daily check-in and schedule', hasAll(supplements, ["TODAY'S ROUTINE", 'Calendar', 'Daily check-in', 'Your schedule'])],
  ['Supplements retains reminder and status actions', hasAll(supplements, ['scheduleDailySupplementReminder', 'setStatus', 'clearStatus', 'reschedule'])],
  ['Supplements includes younger-account support wording and no dose recommendations', hasAll(supplements, ['TRACK WITH SUPPORT', 'parent, guardian or qualified clinician', 'does not recommend supplements or doses'])],
  ['Add Meal matches Food visuals and offers meal, search and quick-add steps', hasAll(food, ['Add food', 'ADDING TO', 'CHOOSE MEAL', 'SEARCH FOOD', 'QUICK ADD', 'FoodScreenBackdrop'])],
  ['Add Meal retains recent, saved, custom, barcode and verified paths', hasAll(food, ['setHistoryOpen(true)', 'setLibraryOpen(true)', 'manualOpen', 'setScannerOpen(true)', 'onlineSearch'])],
  ['Younger Food accounts remain a neutral journal without nutrition search or targets', hasAll(food, ['const locked', 'if(!query.trim()||locked)', '!locked&&providerFoods.length', "locked?'Meals logged':'Foods eaten'"])],
  ['Food retains pull to refresh and hardware/software Back support', hasAll(food, ['onRefresh={load}', 'useImperativeHandle', 'closeFinder'])],
];

const results = checks.map(([label, pass]) => ({ label, pass: Boolean(pass) }));
for (const result of results) console.log(`${result.pass ? 'PASS' : 'FAIL'}  ${result.label}`);
const report = {
  generated_at: new Date().toISOString(),
  version: '1.6.30',
  passed: results.filter((result) => result.pass).length,
  total: results.length,
  checks: results,
};
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'tracker-ui-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
if (results.some((result) => !result.pass)) process.exit(1);
console.log(`\nFitHub tracker UI audit passed: ${results.length} checks.`);
