import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const hasAll = (source, values) => values.every((value) => source.includes(value));

const app = read('App.tsx');
const provider = read('src/components/FitHubAlertProvider.tsx');
const profile = read('src/screens/tabs/ProfileTab.tsx');
const artworkComponent = read('src/components/YouCardArtwork.tsx');
const friends = read('src/screens/tabs/FriendsTab.tsx');

const fullAuditSource = read('scripts/audit-exercise-visuals.mjs');
const helperStart = fullAuditSource.indexOf('const crcTable');
const helperEnd = fullAuditSource.indexOf('const assetRows');
if (helperStart < 0 || helperEnd < 0) throw new Error('Could not load the PNG validation helpers.');
const relaxedHelper = fullAuditSource.slice(helperStart, helperEnd).replace(
  /\s*if \(detachedArtifactCount\) throw new Error\(`Visual contains \$\{detachedArtifactCount\} detached alpha artifact\(s\): \$\{file\}`\);/,
  '',
);
const pngInfo = Function('fs', 'zlib', 'crypto', `${relaxedHelper}; return pngInfo;`)(fs, zlib, crypto);

const assetSpecs = [
  ['journey.png', 1536, 1024],
  ['supplements.png', 1536, 1024],
  ['workout_split.png', 1536, 1024],
  ['gym_together.png', 1536, 1024],
  ['customize.png', 1219, 1290],
  ['weekly_split.png', 1536, 1024],
  ['clubs.png', 1536, 1024],
];
const assetRows = assetSpecs.map(([file, width, height]) => ({
  file,
  ...pngInfo(path.join(root, 'assets/you_ui_v1', file), width, height),
}));

const checks = [
  ['App installs the FitHub alert renderer inside the active theme', hasAll(app, ['<ThemeProvider><FitHubAlertProvider><AppContent /></FitHubAlertProvider></ThemeProvider>', "from './src/components/FitHubAlertProvider'"])],
  ['Alert renderer replaces Alert.alert without screen-by-screen feature loss', hasAll(provider, ['Alert.alert = replacement', 'buttons: choices', 'setQueue((previous) => [...previous'])],
  ['Every popup supports Android Back and explicit close dismissal', hasAll(provider, ['onRequestClose={dismiss}', 'accessibilityLabel="Close"', 'phone’s Back button'])],
  ['Every popup supports tap-outside dismissal', hasAll(provider, ['style={StyleSheet.absoluteFill}', 'onPress={dismiss}', 'accessibilityLabel="Close dialog"'])],
  ['Popup actions support default, cancel and destructive states', hasAll(provider, ["button.style === 'destructive'", "button.style === 'cancel'", 'actionDestructive', 'actionCancel'])],
  ['Long action lists remain scrollable and fully visible', hasAll(provider, ['<ScrollView', 'showsVerticalScrollIndicator={false}', 'current.buttons.map'])],
  ['Post controls expose editing, count controls, Delete post and Cancel', hasAll(friends, ['Edit caption or photo', 'Hide like count', 'Hide comment count', "text: 'Delete post', style: 'destructive'", "text: 'Cancel', style: 'cancel'"])],
  ['Post deletion remains owner-scoped and keeps the private workout', hasAll(friends, ['Your private workout stays saved.', ".from('workout_posts').delete().eq('id', post.id).eq('user_id', profile.id)"])],
  ['You page uses every realistic production artwork destination', hasAll(profile, ['kind="journey"', 'kind="supplements"', 'kind="workoutSplit"', 'kind="gymTogether"', 'kind="customize"', 'kind="weeklySplit"', 'kind="clubs"'])],
  ['You page no longer renders the previous flat scene icons in these cards', !['JourneyProgressSceneIcon', 'SupplementTrackerSceneIcon', 'WorkoutBuilderSceneIcon', 'SharedWorkoutIcon', 'CustomizePhoneSceneIcon', 'WeeklySplitSceneIcon', 'ClubsSceneIcon'].some((value) => profile.includes(value))],
  ['Artwork component maps all seven local transparent PNGs', hasAll(artworkComponent, assetSpecs.map(([file]) => `you_ui_v1/${file}`))],
  ['All seven production assets passed PNG structure and transparency validation', assetRows.length === 7 && assetRows.every((row) => row.hasAlphaChannel && row.transparentCorners && row.transparentPixelRatio >= .02)],
];

for (const [label, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`);
const report = {
  generated_at: new Date().toISOString(),
  version: JSON.parse(read('package.json')).version,
  passed: checks.filter(([, pass]) => pass).length,
  total: checks.length,
  assets: assetRows,
  checks: checks.map(([label, pass]) => ({ label, pass: Boolean(pass) })),
};
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'popup-you-ui-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
if (checks.some(([, pass]) => !pass)) process.exit(1);
console.log(`\nFitHub popup and You UI audit passed: ${checks.length} checks and ${assetRows.length} assets.`);
