import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = {
  home: read('src/screens/tabs/DashboardTabV2.tsx'),
  food: read('src/screens/tabs/FoodTab.tsx'),
  main: read('src/screens/MainApp.tsx'),
  icons: read('src/components/FitHubFreshIcons.tsx'),
};

const checks = [];
const check = (name, passed, evidence) => checks.push({ name, passed: Boolean(passed), evidence });

check('Main app renders the rebuilt Home tab', /from '\.\/tabs\/DashboardTabV2'/.test(files.main), 'DashboardTabV2 import');
check('Home uses the fresh icon system only', /FitHubFreshIcons/.test(files.home) && !/FitHubIcons'/.test(files.home), 'fresh icon import; no legacy import');
check('Food uses the fresh icon system only', /FitHubFreshIcons/.test(files.food) && !/FitHubIcons'/.test(files.food), 'fresh icon import; no legacy import');
check('Bottom navigation uses the fresh icon system only', /FitHubFreshIcons/.test(files.main) && !/FitHubIcons'/.test(files.main), 'fresh navigation icons');
check('Fresh icon system is substantial', (files.icons.match(/export const Fresh[A-Za-z]+Icon/g) ?? []).length >= 30, `${(files.icons.match(/export const Fresh[A-Za-z]+Icon/g) ?? []).length} new icon components`);
check('Home adapts at compact phone widths', /useWindowDimensions\(\)\.width\s*<\s*390/.test(files.home), 'compact breakpoint at 390 dp');
check('Home has protected navigation clearance', /wrap:\s*\{[^}]*paddingBottom:\s*(?:8[6-9]|9\d|1\d\d)/s.test(files.home), 'Home bottom padding >= 86 dp');
check('Food has protected navigation clearance', /wrap:\s*\{[^}]*paddingBottom:\s*(?:9\d|1\d\d)/s.test(files.food), 'Food bottom padding >= 90 dp');
check('Interactive Home controls use 48 dp targets', /headerIcon:\s*\{[^}]*width:\s*48[^}]*height:\s*48/s.test(files.home) && /minHeight:\s*48/.test(files.home), '48 dp header and action targets');
check('Interactive Food controls use 48 dp targets', /mealToggle:\s*\{[^}]*width:\s*48[^}]*height:\s*48/s.test(files.food) && /redPlus:\s*\{[^}]*width:\s*48[^}]*height:\s*48/s.test(files.food), '48 dp meal controls');
check('Community label is explicitly constrained', /label="Community Challenges"/.test(files.home) && /numberOfLines=\{2\}/.test(files.home), 'two-line card labels');
check('Run Metrics is a full-width destination', /wide icon=\{<FreshRunIcon/.test(files.home) && /quickTileWide:\s*\{[^}]*width:\s*'100%'/s.test(files.home), 'full-width Run Metrics card');
check('Food meal cards no longer use a side timeline', !/mealTimeline|timelineRail|timelineLine/.test(files.food), 'full-width meal cards');
check('Food primary action is separated from shortcuts', /primaryFoodAction/.test(files.food) && /primaryFoodTitle/.test(files.food), 'primary add/search action');
check('Younger profiles do not receive online nutrition search', /if\(!query\.trim\(\)\|\|locked\) return/.test(files.food) && /if\(locked\|\|scanned\)return/.test(files.food) && files.food.includes('{!locked?<Pressable onPress={()=>{setScanned(false);setScannerOpen(true)}}'), 'search and scan gated by age');
check('Younger profiles do not receive nutrition targets', /\{!locked\?<Card style=\{styles\.nutritionCard\}/.test(files.food), 'nutrition overview gated by age');
check('Navigation contains five primary destinations', /\['home', 'Home'\][\s\S]*\['friends', 'Friends'\][\s\S]*\['workout', 'Train'\][\s\S]*\['food', 'Food'\][\s\S]*\['profile', 'You'\]/.test(files.main), 'Home, Friends, Train, Food, You');

for (const [name, source] of Object.entries({ home: files.home, food: files.food, main: files.main })) {
  const definitions = new Set([...source.matchAll(/(?:^|[,\n]\s*)([A-Za-z][A-Za-z0-9_]*):\s*\{/g)].map((match) => match[1]));
  const uses = new Set([...source.matchAll(/\b(?:styles|s)\.([A-Za-z][A-Za-z0-9_]*)/g)].map((match) => match[1]));
  const missing = [...uses].filter((key) => !definitions.has(key));
  check(`${name} style references resolve`, missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${uses.size} references resolved`);
}

const failures = checks.filter((item) => !item.passed);
const report = {
  version: JSON.parse(read('package.json')).version,
  generated_at: new Date().toISOString(),
  checks,
  passed: failures.length === 0,
};
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'home-food-ui-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
for (const item of checks) console.log(`${item.passed ? 'PASS' : 'FAIL'}  ${item.name} — ${item.evidence}`);
if (failures.length) {
  console.error(`\n${failures.length} Home/Food UI audit check(s) failed.`);
  process.exit(1);
}
console.log(`\nFitHub Home/Food UI audit passed: ${checks.length} checks.`);
