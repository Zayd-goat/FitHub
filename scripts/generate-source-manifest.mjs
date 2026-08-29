import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outputName = 'SOURCE_MANIFEST_SHA256.txt';
const excludedDirectories = new Set(['.git', 'node_modules']);

const files = [];
const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(absolute);
    else if (entry.isFile() && entry.name !== outputName) files.push(absolute);
  }
};

visit(root);
const lines = files.map((absolute) => {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
  const relative = `./${path.relative(root, absolute).split(path.sep).join('/')}`;
  return `${hash}  ${relative}`;
});

fs.writeFileSync(path.join(root, outputName), `${lines.join('\n')}\n`);
console.log(`Wrote ${lines.length} SHA-256 entries to ${outputName}.`);
