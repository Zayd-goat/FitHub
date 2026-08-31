import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const friends = read('src/screens/tabs/FriendsTab.tsx');
const icons = read('src/components/FitHubSocialIcons.tsx');
const main = read('src/screens/MainApp.tsx');

const checks = [
  ['Four social views exist', ["'feed'", "'following'", "'invites'", "'mine'"].every((value) => friends.includes(value))],
  ['Approved tab labels render', ['Feed', 'Following', 'Invites', 'My Posts'].every((value) => friends.includes(`label=\"${value}\"`))],
  ['My Posts is isolated by the signed-in user', friends.includes("posts.filter((post) => post.user_id === profile.id)")],
  ['My Posts has search and grid/list layouts', friends.includes('Search your posts') && friends.includes("MineLayout = 'grid' | 'list'")],
  ['Feed filters cover workouts, PRs and progress', ['Workouts', 'PRs', 'Progress'].every((value) => friends.includes(`label=\"${value}\"`))],
  ['Gym invite accept and decline remain wired', friends.includes("respondToInvite(invite, 'accepted')") && friends.includes("respondToInvite(invite, 'declined')")],
  ['Friend request confirm and remove remain wired', friends.includes('acceptFriend(request.id)') && friends.includes('removeFriendRequest(request.id)')],
  ['Post reactions, comments, sharing and editing remain wired', ['reactToPost', 'addComment', 'Share.share', 'editPost'].every((value) => friends.includes(value))],
  ['Main app connects Create Post and View Profile', main.includes('onCreatePost={() => chooseTab(\'workout\')}') && main.includes('onViewProfile={() => chooseTab(\'profile\')}')],
  ['Purpose-built social icon family is substantial', (icons.match(/name ===/g) ?? []).length >= 20],
  ['Social screen uses custom vector icons', friends.includes("from '../../components/FitHubSocialIcons'")],
  ['No new database migration is referenced', !friends.includes('UPDATE_2026_08_31')],
];

let failed = false;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`);
  if (!pass) failed = true;
}
if (failed) process.exit(1);
console.log(`\nFitHub Friends UI audit passed: ${checks.length} checks.`);

