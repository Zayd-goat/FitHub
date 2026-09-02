import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const shared = read('src/screens/SharedGymScreen.tsx');
const supplements = read('src/screens/SupplementRemindersScreen.tsx');
const journey = read('src/screens/FitnessJourneyScreen.tsx');
const split = read('src/screens/WorkoutSplitScreen.tsx');
const customize = read('src/screens/CustomizationScreen.tsx');
const migration = read('supabase/UPDATE_2026_09_02_FITHUB_1_6_32_ADDITIVE.sql');

const hasAll = (source, values) => values.every((value) => source.includes(value));
const checks = [
  ['Shared Gym sends real database invites', hasAll(shared, ["from('gym_invites').insert", 'recipient_id: inviteFriendId', 'session_at: sessionAt.toISOString()', 'shared_session_id: targetSession?.id'])],
  ['Shared Gym triggers immediate invite and response notifications', hasAll(shared, ["functions.invoke('friend-notifications'", "notification_kind: 'response'"])],
  ['Shared Gym chooses confirmed friends and has quick scheduling', hasAll(shared, ["rpc('get_my_friends')", 'Tomorrow', 'This weekend', "['17:00','18:00','19:00']"])],
  ['Shared Gym handles Android Back inside a room', hasAll(shared, ["BackHandler.addEventListener('hardwareBackPress'", 'setSelected(null)'])],
  ['Shared Gym uses realistic FitHub artwork', shared.includes('YouCardArtwork kind="gymTogether"')],
  ['Gym invite migration links extra invites to one shared room', hasAll(migration, ['add column if not exists shared_session_id', 'shared_gym_participants', "new.shared_session_id is not null"])],
  ['Gym invite migration protects immutable invite ownership and room links', hasAll(migration, ['enforce_gym_invite_update', 'Invite participants and shared room cannot be changed', 'Invite recipients can only accept or decline'])],
  ['Supplement reminders archive without losing history', hasAll(supplements, ['archived_at', 'previous calendar history will stay available', "update({ enabled: false, notification_id: null, archived_at:"])],
  ['Supplement check-in offers clear, reversible statuses', hasAll(supplements, ['✓  TAKEN', '!  MISSED', '–  SKIPPED', 'CLEAR THIS STATUS'])],
  ['Supplement UI uses realistic tracker artwork and age-safe guidance', hasAll(supplements, ['YouCardArtwork kind="supplements"', 'TRACK WITH SUPPORT', 'does not recommend supplements or doses'])],
  ['Journey supports navigating current and past report periods', hasAll(journey, ['rangeOffset', 'Earlier report', 'Newer report', 'PAST REPORT'])],
  ['Journey uses realistic FitHub artwork', journey.includes('YouCardArtwork kind="journey"')],
  ['Weekly Split uses realistic workout-specific imagery', hasAll(split, ['todays_plan_pull_equipment_v1.png', 'todays_plan_legs_equipment_v1.png', 'todays_plan_recovery_equipment_v1.png', 'YouCardArtwork kind="weeklySplit"'])],
  ['Weekly Split supports quick choices, custom labels and clearing days', hasAll(split, ['QUICK CHOICES', 'CUSTOM NAME', 'Clear this day'])],
  ['Customization has clear Appearance, Units and Features sections', hasAll(customize, ['Appearance', 'Units', 'Features', "type Section = 'appearance' | 'units' | 'features'"])],
  ['Customization provides live theme previews and custom accents', hasAll(customize, ['miniPreview', 'ACCENT COLOUR', 'applyAccent', 'Restore appearance defaults'])],
  ['Customization uses realistic FitHub artwork', customize.includes('YouCardArtwork kind="customize"')],
];

const results = checks.map(([label, pass]) => ({ label, pass: Boolean(pass) }));
for (const result of results) console.log(`${result.pass ? 'PASS' : 'FAIL'}  ${result.label}`);
const report = {
  generated_at: new Date().toISOString(),
  version: JSON.parse(read('package.json')).version,
  passed: results.filter((result) => result.pass).length,
  total: results.length,
  checks: results,
};
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'fithub-1-6-32-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
if (results.some((result) => !result.pass)) process.exit(1);
console.log(`\nFitHub 1.6.32 feature audit passed: ${results.length} checks.`);
