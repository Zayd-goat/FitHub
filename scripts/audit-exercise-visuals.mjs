import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const libraryFile = path.join(root, 'src/data/exerciseLibrary.ts');
const visualFile = path.join(root, 'src/data/exerciseVisuals.ts');
const libraryText = fs.readFileSync(libraryFile, 'utf8');
const visualText = fs.readFileSync(visualFile, 'utf8');

function evaluateTypeScript(file, dependencies = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  const localRequire = (request) => {
    if (Object.hasOwn(dependencies, request)) return dependencies[request];
    if (/\.(png|jpe?g|webp)$/i.test(request)) return path.resolve(path.dirname(file), request);
    if (request === 'react-native' || request.endsWith('/lib/types')) return {};
    throw new Error(`Unsupported audit-time import ${request} in ${path.relative(root, file)}`);
  };
  Function('require', 'module', 'exports', '__filename', '__dirname', code)(
    localRequire,
    module,
    module.exports,
    file,
    path.dirname(file),
  );
  return module.exports;
}

const libraryRuntime = evaluateTypeScript(libraryFile);
const visualRuntime = evaluateTypeScript(visualFile, { './exerciseLibrary': libraryRuntime });
const exercises = libraryRuntime.exerciseLibrary;
if (!Array.isArray(exercises)) throw new Error('Could not evaluate the exercise catalogue at runtime.');

const coverage = visualRuntime.exerciseVisualCoverage(exercises);
const runtimeRows = [];
const runtimeIssues = [];
for (const exercise of exercises) {
  const result = coverage.find((row) => row.slug === exercise.slug);
  const male = visualRuntime.imageForExercise(exercise, 'male');
  const female = visualRuntime.imageForExercise(exercise, 'female');
  const expectedMaleRoot = path.join(root, 'assets/train_v3/male') + path.sep;
  const expectedFemaleRoot = path.join(root, 'assets/train_v3/female') + path.sep;
  const maleValid = typeof male === 'string' && male.startsWith(expectedMaleRoot) && fs.existsSync(male);
  const femaleValid = typeof female === 'string' && female.startsWith(expectedFemaleRoot) && fs.existsSync(female);
  if (!result?.exact || !maleValid || !femaleValid) {
    runtimeIssues.push({
      slug: exercise.slug,
      exact: Boolean(result?.exact),
      male: typeof male === 'string' ? path.relative(root, male) : null,
      female: typeof female === 'string' ? path.relative(root, female) : null,
    });
  }
  runtimeRows.push({
    slug: exercise.slug,
    name: exercise.name,
    key: result?.key ?? null,
    exact: Boolean(result?.exact),
    male: maleValid ? path.relative(root, male) : null,
    female: femaleValid ? path.relative(root, female) : null,
  });
}

const required = [...visualText.matchAll(/require\('\.\.\/\.\.\/assets\/train_v3\/(male|female)\/([^']+\.png)'\)/g)]
  .map(([, gender, file]) => ({ gender, file }));
const uniqueRequired = [...new Map(required.map((row) => [`${row.gender}/${row.file}`, row])).values()];

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let current = value;
  for (let bit = 0; bit < 8; bit += 1) current = (current & 1) ? (0xedb88320 ^ (current >>> 1)) : (current >>> 1);
  return current >>> 0;
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function pngInfo(file, expectedWidth, expectedHeight) {
  const data = fs.readFileSync(file);
  if (data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG signature: ${file}`);

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = -1;
  let sawHeader = false;
  let sawEnd = false;
  let chunkCount = 0;
  const idat = [];

  while (offset < data.length) {
    if (offset + 12 > data.length) throw new Error(`Truncated PNG chunk header: ${file}`);
    const length = data.readUInt32BE(offset);
    const typeStart = offset + 4;
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + length;
    if (chunkEnd + 4 > data.length) throw new Error(`Truncated PNG chunk payload: ${file}`);
    const type = data.subarray(typeStart, chunkStart).toString('ascii');
    if (crc32(data.subarray(typeStart, chunkEnd)) !== data.readUInt32BE(chunkEnd)) throw new Error(`PNG CRC mismatch in ${type}: ${file}`);
    chunkCount += 1;
    if (type === 'IHDR') {
      if (sawHeader || length !== 13) throw new Error(`Invalid PNG IHDR: ${file}`);
      sawHeader = true;
      width = data.readUInt32BE(chunkStart);
      height = data.readUInt32BE(chunkStart + 4);
      bitDepth = data[chunkStart + 8];
      colorType = data[chunkStart + 9];
      interlace = data[chunkStart + 12];
    } else if (type === 'IDAT') {
      idat.push(data.subarray(chunkStart, chunkEnd));
    }
    offset = chunkEnd + 4;
    if (type === 'IEND') {
      if (length !== 0) throw new Error(`Invalid PNG IEND: ${file}`);
      sawEnd = true;
      break;
    }
  }

  if (!sawHeader || !sawEnd || !idat.length) throw new Error(`Incomplete PNG structure: ${file}`);
  if (offset !== data.length) throw new Error(`Unexpected bytes after PNG IEND: ${file}`);
  if (width !== expectedWidth || height !== expectedHeight) throw new Error(`Visual must be ${expectedWidth}x${expectedHeight}: ${file} (${width}x${height})`);
  if (bitDepth !== 8 || ![4, 6].includes(colorType) || interlace !== 0) throw new Error(`Visual must be a non-interlaced, 8-bit PNG with an alpha channel: ${file}`);

  const bytesPerPixel = colorType === 6 ? 4 : 2;
  const alphaOffset = bytesPerPixel - 1;
  const stride = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  if (inflated.length !== height * (stride + 1)) throw new Error(`Unexpected decoded PNG length: ${file}`);

  let previous = Buffer.alloc(stride);
  let transparentPixels = 0;
  const cornerAlpha = [];
  const alphaMask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const filter = inflated[rowStart];
    const raw = inflated.subarray(rowStart + 1, rowStart + 1 + stride);
    const current = Buffer.allocUnsafe(stride);
    for (let index = 0; index < stride; index += 1) {
      const left = index >= bytesPerPixel ? current[index - bytesPerPixel] : 0;
      const above = previous[index];
      const upperLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
      if (filter === 0) current[index] = raw[index];
      else if (filter === 1) current[index] = (raw[index] + left) & 255;
      else if (filter === 2) current[index] = (raw[index] + above) & 255;
      else if (filter === 3) current[index] = (raw[index] + Math.floor((left + above) / 2)) & 255;
      else if (filter === 4) current[index] = (raw[index] + paeth(left, above, upperLeft)) & 255;
      else throw new Error(`Unsupported PNG row filter ${filter}: ${file}`);
    }
    for (let x = 0; x < width; x += 1) {
      const alpha = current[x * bytesPerPixel + alphaOffset];
      if (alpha < 250) transparentPixels += 1;
      if (alpha > 10) alphaMask[y * width + x] = 1;
    }
    if (y === 0 || y === height - 1) {
      cornerAlpha.push(current[alphaOffset], current[(width - 1) * bytesPerPixel + alphaOffset]);
    }
    previous = current;
  }

  const transparentPixelRatio = transparentPixels / (width * height);
  const transparentCorners = cornerAlpha.every((alpha) => alpha <= 10);
  if (transparentPixelRatio < 0.02) throw new Error(`Visual needs at least 2% transparent pixels: ${file}`);
  if (!transparentCorners) throw new Error(`Visual corners must be transparent for theme-safe rendering: ${file}`);

  const visited = new Uint8Array(alphaMask.length);
  const components = [];
  const queueX = new Int32Array(alphaMask.length);
  const queueY = new Int32Array(alphaMask.length);
  for (let startY = 0; startY < height; startY += 1) for (let startX = 0; startX < width; startX += 1) {
    const startIndex = startY * width + startX;
    if (!alphaMask[startIndex] || visited[startIndex]) continue;
    let head = 0, tail = 0, area = 0, touchesBorder = false;
    queueX[tail] = startX; queueY[tail] = startY; tail += 1; visited[startIndex] = 1;
    while (head < tail) {
      const x = queueX[head], y = queueY[head]; head += 1; area += 1;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if (!offsetX && !offsetY) continue;
        const nextX = x + offsetX, nextY = y + offsetY;
        if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
        const nextIndex = nextY * width + nextX;
        if (!alphaMask[nextIndex] || visited[nextIndex]) continue;
        visited[nextIndex] = 1; queueX[tail] = nextX; queueY[tail] = nextY; tail += 1;
      }
    }
    components.push({ area, touchesBorder });
  }
  components.sort((a, b) => b.area - a.area);
  const detachedArtifactCount = components.slice(1).filter((component) => component.area < 300 || component.touchesBorder).length;
  if (detachedArtifactCount) throw new Error(`Visual contains ${detachedArtifactCount} detached alpha artifact(s): ${file}`);

  return {
    width,
    height,
    bitDepth,
    colorType,
    hasAlphaChannel: true,
    transparentPixelRatio: Number(transparentPixelRatio.toFixed(6)),
    transparentCorners,
    alphaComponentCount: components.length,
    detachedArtifactCount,
    chunkCount,
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
  };
}

const assetRows = uniqueRequired.map(({ gender, file }) => {
  const fullPath = path.join(root, 'assets/train_v3', gender, file);
  if (!fs.existsSync(fullPath)) throw new Error(`Missing ${gender} asset: ${file}`);
  return { gender, file, ...pngInfo(fullPath, 768, 512) };
});

const groupRows = ['male', 'female'].flatMap((gender) =>
  fs.readdirSync(path.join(root, 'assets/train_v4/groups', gender))
    .filter((file) => file.endsWith('.png'))
    .map((file) => ({ gender, file, ...pngInfo(path.join(root, 'assets/train_v4/groups', gender, file), 384, 512) })),
);

const homeRows = ['rest_day_male_v2.png', 'rest_day_female_v2.png'].map((file) => ({
  file,
  ...pngInfo(path.join(root, 'assets/home', file), 1672, 941),
}));

const male = new Set(assetRows.filter((row) => row.gender === 'male').map((row) => row.file));
const female = new Set(assetRows.filter((row) => row.gender === 'female').map((row) => row.file));
const parityIssues = [...new Set([...male, ...female])].filter((file) => !male.has(file) || !female.has(file));
const actualFiles = Object.fromEntries(['male', 'female'].map((gender) => [gender, fs.readdirSync(path.join(root, 'assets/train_v3', gender)).filter((file) => file.endsWith('.png')).sort()]));
const unreferencedFiles = ['male', 'female'].flatMap((gender) => actualFiles[gender].filter((file) => !(gender === 'male' ? male : female).has(file)).map((file) => `${gender}/${file}`));

const hashes = assetRows.reduce((groups, row) => {
  const key = `${row.gender}:${row.sha256}`;
  (groups[key] ??= []).push(row.file);
  return groups;
}, {});
const duplicateGroups = Object.values(hashes).filter((files) => new Set(files).size > 1);
const pendingDedicated = runtimeRows.filter((row) => !row.exact);

const report = {
  version: '1.6.17',
  generated_at: new Date().toISOString(),
  catalogue_exercises: exercises.length,
  runtime_resolved_exercises: runtimeRows.length,
  runtime_resolution_issues: runtimeIssues,
  male_visuals: male.size,
  female_visuals: female.size,
  png_references_checked: assetRows.length,
  unique_exercise_pngs_checked: assetRows.length,
  group_pngs_checked: groupRows.length,
  home_pngs_checked: homeRows.length,
  gender_parity_issues: parityIssues,
  unreferenced_exercise_files: unreferencedFiles,
  byte_identical_duplicate_groups: duplicateGroups,
  pending_dedicated_count: pendingDedicated.length,
  pending_dedicated_exercises: pendingDedicated,
  png_structure_checks: [
    'signature', 'chunk bounds', 'chunk CRC', 'IHDR', 'IDAT inflate', 'IEND', 'trailing bytes',
    'expected dimensions', '8-bit alpha channel', 'row-filter decoding', 'transparent pixel ratio', 'transparent corners',
    'detached alpha components', 'edge-touching fragment detection',
  ],
  home_art: homeRows,
  group_art: groupRows,
  runtime_mappings: runtimeRows,
  release_ready: exercises.length === 230 && assetRows.length === 472 && male.size === 236 && female.size === 236 && runtimeIssues.length === 0 && parityIssues.length === 0 && unreferencedFiles.length === 0 && duplicateGroups.length === 0 && pendingDedicated.length === 0,
  policy: 'Every catalogue exercise must resolve at runtime to an approved male and female movement asset. All exercise, muscle-group, and Rest Day PNGs must pass decoded alpha, dimensions, integrity, parity, orphan-file, and duplicate checks before release.',
};

const outDir = path.join(root, 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'exercise-visual-audit.json'), `${JSON.stringify(report, null, 2)}\n`);

if (exercises.length !== 230) throw new Error(`Expected 230 exercises, found ${exercises.length}`);
if (assetRows.length !== 472 || male.size !== 236 || female.size !== 236) throw new Error(`Expected 472 unique exercise PNGs (236 male/236 female), found ${assetRows.length} (${male.size} male/${female.size} female)`);
if (runtimeIssues.length) throw new Error(`Runtime mapping failed for: ${runtimeIssues.map((row) => row.slug).join(', ')}`);
if (parityIssues.length) throw new Error(`Male/female asset parity failed for: ${parityIssues.join(', ')}`);
if (unreferencedFiles.length) throw new Error(`Unreferenced exercise assets found: ${unreferencedFiles.join(', ')}`);
if (duplicateGroups.length) throw new Error(`Unexpected byte-identical exercise assets found: ${JSON.stringify(duplicateGroups)}`);
if (pendingDedicated.length) throw new Error(`Exercises still pending exact visual coverage: ${pendingDedicated.map((row) => row.slug).join(', ')}`);

console.log(`FitHub exercise visual audit passed: ${exercises.length} exercises, ${assetRows.length} PNG references, ${assetRows.length} unique exercise PNGs, ${male.size} male/${female.size} female visual families, ${pendingDedicated.length} exercises still pending dedicated review.`);
