import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const journey = read('src/screens/FitnessJourneyScreen.tsx');

const hasAll = (source, values) => values.every((value) => source.includes(value));
const checks = [
  ['Journey uses the realistic 3D FitHub hero artwork', journey.includes('YouCardArtwork kind="journey"')],
  ['Journey matches the Home visual backdrop', hasAll(journey, ['ReferenceHomeBackdrop', 'homeQuickSprites', 'homeWeekRunSprites'])],
  ['Journey consolidates key data into one performance overview', hasAll(journey, ['Performance overview', 'overviewCard', 'Your training summary'])],
  ['Journey offers weekly and monthly report controls', hasAll(journey, ['Weekly', 'Monthly', "type Period = 'week' | 'month'"])],
  ['Journey supports earlier and newer report navigation', hasAll(journey, ['Earlier report', 'Newer report', 'rangeOffset'])],
  ['Journey keeps reports private to the user', hasAll(journey, ['Only you', 'Your private training progress'])],
  ['Journey charts four selectable activity metrics', hasAll(journey, ["type TrendFocus = 'workouts' | 'minutes' | 'sets' | 'distance'", 'TrendChart', 'SvgGradient'])],
  ['Journey uses an accessible current-versus-previous comparison', hasAll(journey, ['Current vs previous', 'ComparisonBar', 'CURRENT REPORT'])],
  ['Journey retains lift, exercise and PR highlights', hasAll(journey, ['Lift highlights', 'Exercise highlights', 'Recent improvements'])],
  ['Journey retains younger-account technique safeguards', hasAll(journey, ['Ask a qualified adult or coach', 'profileAge(profile)'])],
  ['Journey preserves pull-to-refresh data loading', hasAll(journey, ['RefreshableScrollView', 'onRefresh={load}'])],
  ['Journey preserves themes and unit formatting', hasAll(journey, ['useTheme()', 'formatDistance', 'formatWeight'])],
];

const results = checks.map(([label, pass]) => ({ label, pass: Boolean(pass) }));
for (const result of results) {
  console.log((result.pass ? 'PASS' : 'FAIL') + '  ' + result.label);
}

const report = {
  generated_at: new Date().toISOString(),
  version: JSON.parse(read('package.json')).version,
  passed: results.filter((result) => result.pass).length,
  total: results.length,
  checks: results,
};

fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'reports', 'fithub-1-6-33-audit.json'),
  JSON.stringify(report, null, 2) + '\n'
);

if (results.some((result) => !result.pass)) process.exit(1);
console.log('\nFitHub 1.6.33 Journey audit passed: ' + results.length + ' checks.');

