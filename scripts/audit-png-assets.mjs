import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const fullAuditSource = fs.readFileSync(path.join(root, 'scripts/audit-exercise-visuals.mjs'), 'utf8');
const helperStart = fullAuditSource.indexOf('const crcTable');
const helperEnd = fullAuditSource.indexOf('const assetRows');
if (helperStart < 0 || helperEnd < 0) throw new Error('Could not load the PNG validation helpers.');
const pngInfo = Function('fs', 'zlib', 'crypto', `${fullAuditSource.slice(helperStart, helperEnd)}; return pngInfo;`)(fs, zlib, crypto);
const pngInfoAllowIntentionalParts = Function(
  'fs',
  'zlib',
  'crypto',
  `${fullAuditSource.slice(helperStart, helperEnd).replace(/\s*if \(detachedArtifactCount\) throw new Error\(`Visual contains \$\{detachedArtifactCount\} detached alpha artifact\(s\): \$\{file\}`\);/, '')}; return pngInfo;`,
)(fs, zlib, crypto);

const visualText = fs.readFileSync(path.join(root, 'src/data/exerciseVisuals.ts'), 'utf8');
const required = [...visualText.matchAll(/require\('\.\.\/\.\.\/assets\/train_v3\/(male|female)\/([^']+\.png)'\)/g)]
  .map(([, gender, file]) => ({ gender, file }));
const uniqueRequired = [...new Map(required.map((row) => [`${row.gender}/${row.file}`, row])).values()];

const exerciseRows = uniqueRequired.map(({ gender, file }) => {
  const target = path.join(root, 'assets/train_v3', gender, file);
  if (!fs.existsSync(target)) throw new Error(`Missing ${gender} asset: ${file}`);
  return { gender, file, ...pngInfo(target, 768, 512) };
});
const groupRows = ['male', 'female'].flatMap((gender) =>
  fs.readdirSync(path.join(root, 'assets/train_v4/groups', gender))
    .filter((file) => file.endsWith('.png'))
    .map((file) => ({ gender, file, ...pngInfo(path.join(root, 'assets/train_v4/groups', gender, file), 384, 512) })),
);
const legacyHomeRows = ['rest_day_male_v2.png', 'rest_day_female_v2.png'].map((file) => ({
  file,
  ...pngInfo(path.join(root, 'assets/home', file), 1672, 941),
}));
const equipmentHomeRows = [
  'todays_plan_equipment_v2.png',
  'todays_plan_pull_equipment_v1.png',
  'todays_plan_legs_equipment_v1.png',
  'todays_plan_upper_equipment_v1.png',
  'todays_plan_full_body_equipment_v1.png',
  'todays_plan_cardio_equipment_v1.png',
  'todays_plan_shoulders_equipment_v1.png',
  'todays_plan_arms_equipment_v1.png',
  'todays_plan_core_equipment_v1.png',
  'todays_plan_recovery_equipment_v1.png',
].map((file) => ({
  file,
  ...pngInfoAllowIntentionalParts(path.join(root, 'assets/home', file), 1402, 1122),
}));
const homeRows = [...legacyHomeRows, ...equipmentHomeRows];

const male = new Set(exerciseRows.filter((row) => row.gender === 'male').map((row) => row.file));
const female = new Set(exerciseRows.filter((row) => row.gender === 'female').map((row) => row.file));
const parityIssues = [...new Set([...male, ...female])].filter((file) => !male.has(file) || !female.has(file));
const unreferencedFiles = ['male', 'female'].flatMap((gender) => {
  const referenced = gender === 'male' ? male : female;
  return fs.readdirSync(path.join(root, 'assets/train_v3', gender))
    .filter((file) => file.endsWith('.png') && !referenced.has(file))
    .map((file) => `${gender}/${file}`);
});
const duplicateGroups = Object.values(exerciseRows.reduce((groups, row) => {
  const key = `${row.gender}:${row.sha256}`;
  (groups[key] ??= []).push(row.file);
  return groups;
}, {})).filter((files) => files.length > 1);

const report = {
  version: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version,
  generated_at: new Date().toISOString(),
  exercise_pngs_checked: exerciseRows.length,
  male_visuals: male.size,
  female_visuals: female.size,
  group_pngs_checked: groupRows.length,
  home_pngs_checked: homeRows.length,
  gender_parity_issues: parityIssues,
  unreferenced_exercise_files: unreferencedFiles,
  byte_identical_duplicate_groups: duplicateGroups,
  release_ready: exerciseRows.length === 472 && male.size === 236 && female.size === 236 && groupRows.length === 16 && homeRows.length === 12 && !parityIssues.length && !unreferencedFiles.length && !duplicateGroups.length,
};

fs.writeFileSync(path.join(root, 'reports/png-asset-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
if (!report.release_ready) throw new Error(`PNG asset audit failed: ${JSON.stringify(report)}`);
console.log(`PNG asset audit passed: ${exerciseRows.length} exercise PNGs, ${groupRows.length} group PNGs and ${homeRows.length} Home PNGs.`);
