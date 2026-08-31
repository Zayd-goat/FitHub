import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = {
  home: read('src/screens/tabs/DashboardTabV2.tsx'),
  food: read('src/screens/tabs/FoodTab.tsx'),
  main: read('src/screens/MainApp.tsx'),
  icons: read('src/components/FitHubReferenceIcons.tsx'),
  foodIcons: read('src/components/FitHubFoodIcons.tsx'),
  navIcons: read('src/components/FitHubNavIcons.tsx'),
  sprite: read('src/components/FitHubSpriteArt.tsx'),
  community: read('src/screens/CommunityHubScreenV2.tsx'),
};

const pngMeta = (file) => {
  const data = fs.readFileSync(path.join(root, file));
  return {
    signature: data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    colorType: data[25],
  };
};

const checks = [];
const check = (name, passed, evidence) => checks.push({ name, passed: Boolean(passed), evidence });

check('Main app renders the rebuilt Home tab', /from '\.\/tabs\/DashboardTabV2'/.test(files.main), 'DashboardTabV2 import');
check('Home uses production mini-scene artwork without flattening the interface', /FitHubSpriteArt/.test(files.home) && /home_quick_sprites\.png/.test(files.home) && /home_week_run_sprites\.png/.test(files.home), 'native cards with transparent cropped artwork');
check('Food uses production mini-scene artwork without flattening the interface', /FitHubSpriteArt/.test(files.food) && /food_shortcut_sprites\.png/.test(files.food) && /food_meal_sprites\.png/.test(files.food) && /food_hero_water_sprites\.png/.test(files.food), 'native diary, shortcut, meal and hydration cards');
check('Food no longer uses the superseded reference Food icons', !/Reference(?:FoodDiary|FoodSearch|Barcode|Recent|SavedMeals|Breakfast|Lunch|Dinner|Snacks|WaterBottle|WaterDrop|WaterGlass)Icon/.test(files.food), 'visible Food icons come only from FitHubFoodIcons');
check('Bottom navigation uses the new consistent icon family', /FitHubNavIcons/.test(files.main) && /FitHubTrainNavIcon/.test(files.main) && !/Reference(?:Home|Friends|Train|Food|Profile)NavIcon/.test(files.main), 'new FitHub navigation icons');
check('Reference icon system is substantial', (files.icons.match(/export const Reference[A-Za-z]+Icon/g) ?? []).length >= 28, `${(files.icons.match(/export const Reference[A-Za-z]+Icon/g) ?? []).length} purpose-built icon components`);
check('New Food icon system is substantial', (files.foodIcons.match(/export const Food[A-Za-z]+Icon/g) ?? []).length >= 14, `${(files.foodIcons.match(/export const Food[A-Za-z]+Icon/g) ?? []).length} original Food icon components`);
check('New navigation icon system covers all five destinations', (files.navIcons.match(/export const FitHub[A-Za-z]+NavIcon/g) ?? []).length === 5, 'Home, Friends, Train, Food and You icons');
check('Sprite renderer performs a true native crop', /column = quadrant % 2/.test(files.sprite) && /overflow: 'hidden'/.test(files.sprite) && /width: size \* 2/.test(files.sprite), 'single transparent sheet, four native cells');
for (const asset of ['assets/home_ui_v4/home_quick_sprites.png', 'assets/home_ui_v4/home_week_run_sprites.png', 'assets/food_ui_v4/food_shortcut_sprites.png', 'assets/food_ui_v4/food_meal_sprites.png', 'assets/food_ui_v4/food_hero_water_sprites.png']) {
  const meta = pngMeta(asset);
  check(`Artwork is square transparent PNG: ${path.basename(asset)}`, meta.signature && meta.width === meta.height && [4, 6].includes(meta.colorType), `${meta.width}x${meta.height}, PNG color type ${meta.colorType}`);
}
check('Home adapts at compact phone widths', /useWindowDimensions\(\)\.width\s*<\s*390/.test(files.home), 'compact breakpoint at 390 dp');
check('Home has protected navigation clearance', /wrap:\s*\{[^}]*paddingBottom:\s*(?:8[6-9]|9\d|1\d\d)/s.test(files.home), 'Home bottom padding >= 86 dp');
check('Food has protected navigation clearance', /wrap:\s*\{[^}]*paddingBottom:\s*(?:9\d|1\d\d)/s.test(files.food), 'Food bottom padding >= 90 dp');
check('Compact Home controls keep expanded touch targets', /headerIcon:\s*\{[^}]*width:\s*44[^}]*height:\s*44/s.test(files.home) && (files.home.match(/hitSlop=\{4\}/g) ?? []).length >= 2 && /primaryAction:\s*\{[^}]*minHeight:\s*43/s.test(files.home) && /hitSlop=\{3\}/.test(files.home), '44 dp header controls plus expanded compact action targets');
check('Interactive Food controls use at least 48 dp targets', /mealToggle:\s*\{[^}]*width:\s*48[^}]*height:\s*48/s.test(files.food) && /redPlus:\s*\{[^}]*width:\s*50[^}]*height:\s*50/s.test(files.food) && /waterPlus:\s*\{[^}]*width:\s*50[^}]*height:\s*50/s.test(files.food), '48–50 dp meal and water controls');
check('Community label is explicitly constrained', /label="Community Challenges"/.test(files.home) && /numberOfLines=\{2\}/.test(files.home), 'two-line card labels');
check('Home omits the rejected oversized HOME heading', !/<Text style=\{styles\.homeTitle\}>HOME<\/Text>/.test(files.home), 'greeting begins the approved composition');
check('Home uses the approved Today plan equipment artwork', /todays_plan_equipment_v2\.png/.test(files.home), 'transparent bench, rack, loaded barbell, shaker and towel asset');
for (const asset of ['pull', 'legs', 'upper', 'full_body', 'cardio', 'shoulders', 'arms', 'core', 'recovery']) {
  check('Home includes dedicated ' + asset.replace('_', ' ') + ' equipment artwork', new RegExp('todays_plan_' + asset + '_equipment_v1\\.png').test(files.home), asset + ' equipment scene');
}
check('Home uses the approved gym-pattern background', /ReferenceHomeBackdrop/.test(files.home) && /export const ReferenceHomeBackdrop/.test(files.icons), 'subtle FitHub gym-pattern wash');
check('Your Week heading sits inside the progress card', /<Text style=\{styles\.weekCardHeading\}>YOUR WEEK<\/Text>/.test(files.home) && !/weekHeadline/.test(files.home), 'locked compact week composition');
check('Home keeps one compact friend-feed item', /slice\(0, 1\)/.test(files.home) && !/openFeedRow/.test(files.home), 'single recent friend activity row');
check('Quick Access uses the approved image-led tile proportions', /quickTile:\s*\{[^}]*minHeight:\s*compact \? 139 : 148/s.test(files.home) && /quickTileWide:\s*\{[^}]*width:\s*'100%'[^}]*minHeight:\s*compact \? 100 : 110/s.test(files.home), 'four image-led cards plus full-width Run Metrics');
check('Bottom navigation uses the improved old-style raised-Train proportions', /nav:\s*\{[^}]*minHeight:\s*70/s.test(files.main) && /trainButton:\s*\{[^}]*width:\s*66[^}]*height:\s*66/s.test(files.main) && /activeTabLine/.test(files.main), '70 dp bar, 66 dp Train control and short active line');
check('Run Metrics is a full-width destination', /wide icon=\{<FitHubSpriteArt[^>]*quadrant=\{2\}/.test(files.home) && /quickTileWide:\s*\{[^}]*width:\s*'100%'/s.test(files.home), 'full-width Run Metrics card');
check('Food has the approved illustrated side timeline', /mealTimelineRail/.test(files.food) && /mealTimelineDot/.test(files.food), 'four timeline meal rows');
check('Food uses the approved subtle gym-pattern backdrop', /FoodScreenBackdrop/.test(files.food) && /export const FoodScreenBackdrop/.test(files.foodIcons), 'theme-aware Food background wash');
check('Food removes the rejected extra search banner', !/primaryFoodAction|primaryFoodTitle/.test(files.food), 'four shortcuts follow the diary hero directly');
check('Food uses the exact approved diary copy', files.food.includes('Plan your meals and hydration'), 'approved preview subtitle');
check('Food provides the exact four adult shortcuts', /accessibilityLabel="Search foods"/.test(files.food) && /accessibilityLabel="Scan food barcode"/.test(files.food) && /accessibilityLabel="Open recent meals"/.test(files.food) && /accessibilityLabel="Open saved meals"/.test(files.food), 'Search, Scan, Recent, Saved Meals');
check('Food replaces the failing absolute-fill style', !/absoluteFillObject/.test(files.food) && /foodBackdrop:\{position:'absolute',top:0,right:0,bottom:0,left:0/.test(files.food), 'explicit absolute bounds compile on React Native 0.86');
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
