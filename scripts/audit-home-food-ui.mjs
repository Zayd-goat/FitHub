import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = {
  home: read('src/screens/tabs/DashboardTabV2.tsx'),
  food: read('src/screens/tabs/FoodTab.tsx'),
  main: read('src/screens/MainApp.tsx'),
  icons: read('src/components/FitHubReferenceIcons.tsx'),
  community: read('src/screens/CommunityHubScreenV2.tsx'),
};

const checks = [];
const check = (name, passed, evidence) => checks.push({ name, passed: Boolean(passed), evidence });

check('Main app renders the rebuilt Home tab', /from '\.\/tabs\/DashboardTabV2'/.test(files.main), 'DashboardTabV2 import');
check('Home uses the locked reference icon system', /FitHubReferenceIcons/.test(files.home) && !/FitHubFreshIcons/.test(files.home), 'reference-only Home icons');
check('Food uses the locked reference icon system for its visible diary', /ReferenceFoodDiaryIcon/.test(files.food) && /ReferenceBreakfastIcon/.test(files.food) && /ReferenceWaterBottleIcon/.test(files.food), 'reference diary, meal and hydration icons');
check('Bottom navigation uses the locked reference icon system', /FitHubReferenceIcons/.test(files.main) && /ReferenceTrainNavIcon/.test(files.main) && !/Fresh(?:Home|Friends|Train|Food|Profile)NavIcon/.test(files.main), 'reference navigation icons');
check('Reference icon system is substantial', (files.icons.match(/export const Reference[A-Za-z]+Icon/g) ?? []).length >= 28, `${(files.icons.match(/export const Reference[A-Za-z]+Icon/g) ?? []).length} purpose-built icon components`);
check('Home adapts at compact phone widths', /useWindowDimensions\(\)\.width\s*<\s*390/.test(files.home), 'compact breakpoint at 390 dp');
check('Home has protected navigation clearance', /wrap:\s*\{[^}]*paddingBottom:\s*(?:8[6-9]|9\d|1\d\d)/s.test(files.home), 'Home bottom padding >= 86 dp');
check('Food has protected navigation clearance', /wrap:\s*\{[^}]*paddingBottom:\s*(?:9\d|1\d\d)/s.test(files.food), 'Food bottom padding >= 90 dp');
check('Compact Home controls keep expanded touch targets', /headerIcon:\s*\{[^}]*width:\s*44[^}]*height:\s*44/s.test(files.home) && (files.home.match(/hitSlop=\{4\}/g) ?? []).length >= 2 && /primaryAction:\s*\{[^}]*minHeight:\s*43/s.test(files.home) && /hitSlop=\{3\}/.test(files.home), '44 dp header controls plus expanded compact action targets');
check('Interactive Food controls use 48 dp targets', /mealToggle:\s*\{[^}]*width:\s*48[^}]*height:\s*48/s.test(files.food) && /redPlus:\s*\{[^}]*width:\s*48[^}]*height:\s*48/s.test(files.food), '48 dp meal controls');
check('Community label is explicitly constrained', /label="Community Challenges"/.test(files.home) && /numberOfLines=\{2\}/.test(files.home), 'two-line card labels');
check('Home omits the rejected oversized HOME heading', !/<Text style=\{styles\.homeTitle\}>HOME<\/Text>/.test(files.home), 'greeting begins the approved composition');
check('Home uses the approved Today plan equipment artwork', /todays_plan_equipment_v2\.png/.test(files.home), 'transparent bench, rack, loaded barbell, shaker and towel asset');
for (const asset of ['pull', 'legs', 'upper', 'full_body', 'cardio', 'shoulders', 'arms', 'core', 'recovery']) {
  check('Home includes dedicated ' + asset.replace('_', ' ') + ' equipment artwork', new RegExp('todays_plan_' + asset + '_equipment_v1\\.png').test(files.home), asset + ' equipment scene');
}
check('Home uses the approved gym-pattern background', /ReferenceHomeBackdrop/.test(files.home) && /export const ReferenceHomeBackdrop/.test(files.icons), 'subtle FitHub gym-pattern wash');
check('Your Week heading sits inside the progress card', /<Text style=\{styles\.weekCardHeading\}>YOUR WEEK<\/Text>/.test(files.home) && !/weekHeadline/.test(files.home), 'locked compact week composition');
check('Home keeps one compact friend-feed item', /slice\(0, 1\)/.test(files.home) && !/openFeedRow/.test(files.home), 'single recent friend activity row');
check('Quick Access uses the approved compact tile proportions', /quickTile:\s*\{[^}]*minHeight:\s*70/s.test(files.home) && /quickTileWide:\s*\{[^}]*width:\s*'100%'[^}]*minHeight:\s*58/s.test(files.home), 'two compact rows plus full-width Run Metrics');
check('Bottom navigation uses the approved slim raised-Train proportions', /nav:\s*\{[^}]*minHeight:\s*68/s.test(files.main) && /trainButton:\s*\{[^}]*width:\s*64[^}]*height:\s*64/s.test(files.main), '68 dp bar with 64 dp raised Train control');
check('Run Metrics is a full-width destination', /wide icon=\{<ReferenceRunMetricsIcon/.test(files.home) && /quickTileWide:\s*\{[^}]*width:\s*'100%'/s.test(files.home), 'full-width Run Metrics card');
check('Food has the approved illustrated side timeline', /mealTimelineRail/.test(files.food) && /mealTimelineDot/.test(files.food), 'four timeline meal rows');
check('Food removes the rejected extra search banner', !/primaryFoodAction|primaryFoodTitle/.test(files.food), 'four shortcuts follow the diary hero directly');
check('Food uses the exact approved diary copy', files.food.includes('Keep your meals organised in one place'), 'locked reference subtitle');
check('Food provides the exact four adult shortcuts', /ReferenceFoodSearchIcon/.test(files.food) && /ReferenceBarcodeIcon/.test(files.food) && /ReferenceRecentIcon/.test(files.food) && /ReferenceSavedMealsIcon/.test(files.food), 'Search, Scan, Recent, Saved Meals');
check('Food meal rows begin collapsed like the reference', /\{breakfast:false,lunch:false,dinner:false,snacks:false\}/.test(files.food), 'all four meal rows collapsed initially');
check('Younger profiles do not receive online nutrition search', /if\(!query\.trim\(\)\|\|locked\) return/.test(files.food) && /if\(locked\|\|scanned\)return/.test(files.food) && files.food.includes('{!locked?<Pressable onPress={()=>{setScanned(false);setScannerOpen(true)}}'), 'search and scan gated by age');
check('Younger profiles do not receive nutrition targets', /\{!locked\?<Card style=\{styles\.nutritionCard\}/.test(files.food), 'nutrition overview gated by age');
check('Navigation contains five primary destinations', /\['home', 'Home'\][\s\S]*\['friends', 'Friends'\][\s\S]*\['workout', 'Train'\][\s\S]*\['food', 'Food'\][\s\S]*\['profile', 'You'\]/.test(files.main), 'Home, Friends, Train, Food, You');
check('Main app renders the redesigned Community hub', /CommunityHubScreenV2/.test(files.main), 'CommunityHubScreenV2 import');
check('Community has Challenges and Clubs as top-level tabs', /label="Challenges"[\s\S]*label="Clubs"/.test(files.community), 'Challenges followed by Clubs');
check('Community challenge creation uses three guided steps', /Step \{builderStep\} of 3/.test(files.community) && /BuilderSteps current=\{builderStep\}/.test(files.community), 'Details, Goal and Invite steps');
check('Community supports Explore, Active, Invites and Completed filters', /label="Explore"[\s\S]*label="Active"[\s\S]*label="Invites"[\s\S]*label="Completed"/.test(files.community), 'four challenge filters');
check('Challenge progress still comes from completed workout history', /calculateProgress/.test(files.community) && /workout_sessions/.test(files.community) && /workout_sets/.test(files.community), 'session and set history');
check('Challenge invite accept and decline actions remain available', /Accept invite/.test(files.community) && /declineInvite\(challenge\.id\)/.test(files.community), 'visible invite actions');
check('Clubs still refresh and backfill from workout history', /refresh_my_current_clubs/.test(files.community) && /get_my_current_clubs_with_counts/.test(files.community), 'club refresh RPCs');
check('Club cards compare personal best with the active club mark', /YOUR BEST/.test(files.community) && /CLUB MARK/.test(files.community), 'side-by-side comparison');
check('Load-based Clubs remain hidden for under-18 accounts', /if \(adult\)/.test(files.community) && /!adult \? \(/.test(files.community) && /Load-based clubs are hidden/.test(files.community), 'age-aware club gate');

for (const [name, source] of Object.entries({ home: files.home, food: files.food, main: files.main, community: files.community })) {
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
