import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourceFiles = [];

function walk(target) {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) walk(path.join(target, entry));
  } else if (/\.(tsx?|jsx?)$/.test(target)) sourceFiles.push(target);
}

for (const target of ['src', 'App.tsx', 'index.js']) {
  const resolved = path.join(root, target);
  if (fs.existsSync(resolved)) walk(resolved);
}

const suffixes = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '.png', '.jpg', '.jpeg', '/index.ts', '/index.tsx', '/index.js'];
const references = [];
const missing = [];
const pattern = /(?:from\s+|require\s*\(|import\s*\()\s*['"]([^'"]+)['"]/g;

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(pattern)) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) continue;
    references.push({ file: path.relative(root, file), specifier });
    const base = path.resolve(path.dirname(file), specifier);
    if (!suffixes.some((suffix) => fs.existsSync(base + suffix))) {
      missing.push(`${path.relative(root, file)}: ${specifier}`);
    }
  }
}

if (missing.length) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log(`Resolved ${references.length} relative source and asset references across ${sourceFiles.length} source files.`);
