import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const libraryText = fs.readFileSync(path.join(root, 'src/data/exerciseLibrary.ts'), 'utf8');
const visualText = fs.readFileSync(path.join(root, 'src/data/exerciseVisuals.ts'), 'utf8');
const exercises = [...libraryText.matchAll(/\{ name: "([^"]+)",[\s\S]*?equipment: "([^"]+)",[\s\S]*?slug: "([^"]+)"[\s\S]*?targetArea: "([^"]+)"/g)]
  .map(([, name, equipment, slug, targetArea]) => ({ name, equipment, slug, targetArea }));
const required = [...visualText.matchAll(/require\('\.\.\/\.\.\/assets\/train_v3\/(male|female)\/([^']+\.png)'\)/g)]
  .map(([, gender, file]) => ({ gender, file }));

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const aliasBlock = visualText.match(/const exactVisualAliases:[\s\S]*?= \{([\s\S]*?)\n\};/)?.[1] ?? '';
const dedicatedBlock = visualText.match(/const dedicatedExerciseAssets:[\s\S]*?= \{([\s\S]*?)\n\};/)?.[1] ?? '';
const exactAliasSlugs = new Set([...aliasBlock.matchAll(/^\s*'([^']+)':/gm)].map(([, slug]) => slug));
const dedicatedSlugs = new Set([...dedicatedBlock.matchAll(/^\s*'([^']+)':\s*\{/gm)].map(([, slug]) => slug));

function pngInfo(file) {
  const data = fs.readFileSync(file);
  const signature = data.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error(`Invalid PNG signature: ${file}`);
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width < 256 || height < 256) throw new Error(`Exercise visual is too small: ${file} (${width}x${height})`);
  return { width, height, sha256: crypto.createHash('sha256').update(data).digest('hex') };
}

const assetRows = required.map(({ gender, file }) => {
  const fullPath = path.join(root, 'assets/train_v3', gender, file);
  if (!fs.existsSync(fullPath)) throw new Error(`Missing ${gender} asset: ${file}`);
  return { gender, file, ...pngInfo(fullPath) };
});

const male = new Set(assetRows.filter((x) => x.gender === 'male').map((x) => x.file));
const female = new Set(assetRows.filter((x) => x.gender === 'female').map((x) => x.file));
const parityIssues = [...new Set([...male, ...female])].filter((file) => !male.has(file) || !female.has(file));
const duplicateHashes = assetRows.reduce((acc, row) => {
  const key = `${row.gender}:${row.sha256}`;
  (acc[key] ??= []).push(row.file);
  return acc;
}, {});
const duplicateGroups = Object.values(duplicateHashes).filter((files) => files.length > 1);
const visualFileKeys = new Set([...male].map((file) => file.replace(/\.png$/, '')));
const exactCandidates = exercises.filter((exercise) => dedicatedSlugs.has(exercise.slug) || exactAliasSlugs.has(exercise.slug) || visualFileKeys.has(normalize(exercise.slug)));
const pendingDedicated = exercises.filter((exercise) => !exactCandidates.some((candidate) => candidate.slug === exercise.slug));

const report = {
  version: '1.6.8',
  generated_at: new Date().toISOString(),
  catalogue_exercises: exercises.length,
  male_visuals: male.size,
  female_visuals: female.size,
  gender_parity_issues: parityIssues,
  byte_identical_duplicate_groups: duplicateGroups,
  pngs_checked: assetRows.length,
  exact_or_dedicated_candidates: exactCandidates.length,
  pending_dedicated_count: pendingDedicated.length,
  pending_dedicated_exercises: pendingDedicated,
  release_ready: pendingDedicated.length === 0,
  policy: 'An exercise may only display a movement image when FitHub has an exact approved exercise-to-asset match. Unverified family fallbacks fail closed.',
  exercises,
};

const outDir = path.join(root, 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'exercise-visual-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
if (exercises.length !== 230) throw new Error(`Expected 230 exercises, found ${exercises.length}`);
if (parityIssues.length) throw new Error(`Male/female asset parity failed for: ${parityIssues.join(', ')}`);
console.log(`FitHub exercise visual audit passed: ${exercises.length} exercises, ${assetRows.length} PNG references, ${male.size} male/${female.size} female visual families, ${pendingDedicated.length} exercises still pending dedicated review.`);
