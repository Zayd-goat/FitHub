# FitHub 1.6.32 complete update guide

## What this release changes

- Gym Together sends real notification-backed invites from the page itself.
- A leader can add more confirmed friends to the same shared workout room.
- Gym Together, Supplement Tracker, My Fitness Journey, Weekly Split and Customize FitHub have clearer, more realistic FitHub interfaces.
- Removed supplement reminders retain their earlier check-in history.
- Journey reports can move between current and past periods.
- Existing Home, Food, Friends, You, popup, workout, post, notification and younger-account behavior remains in place.

## Option A — update an existing FitHub 1.6.31 repository

1. Download and extract `FitHub_1.6.32_PATCH_FROM_1.6.31.zip`.
2. Open its `FitHub_1.6.32_PATCH_FROM_1.6.31` folder.
3. Copy every file and folder inside it into the root of your FitHub repository.
4. Keep the supplied paths exactly as shown and confirm replacements.
5. Do not delete files that are not included in the patch.
6. Commit the changes on a new branch.

## Option B — replace an older or uncertain repository

1. Download and extract `FitHub_1.6.32_COMPLETE_UPDATE.zip`.
2. Use the extracted `FitHub_1.6.32_COMPLETE_UPDATE` contents as the complete project source.
3. Restore deployment values through GitHub Secrets, GitHub Variables or a local uncommitted environment file.
4. Never commit Firebase configuration, API keys, signing material or other secrets.

## Required Supabase update

1. Sign in to the Supabase project used by FitHub.
2. Open **SQL Editor** and create a new query.
3. Open `supabase/UPDATE_2026_09_02_FITHUB_1_6_32_ADDITIVE.sql` from this release.
4. Copy the entire SQL file into the editor.
5. Run it once and confirm the query completes without an error.

The migration is additive and safe to run again. It adds reminder archiving, links additional gym invites to an existing room, updates invite synchronization and protects invite ownership fields.

Do not rerun the whole historical migration set on a database already running FitHub 1.6.31.

## Notification backend

Keep the existing `friend-notifications` Edge Function deployed. This release calls the same authenticated function immediately after creating or responding to an invite. No function file changed in 1.6.32.

Confirm these existing values are still configured:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_EXPO_PROJECT_ID`
- `GOOGLE_SERVICES_JSON_BASE64` for the Android workflow
- `FRIEND_NOTIFICATION_CRON_SECRET` in Supabase if the retry cron is enabled

## Build the APK in GitHub

1. Push the updated branch to GitHub.
2. Open the repository’s **Actions** tab.
3. Select **Build FitHub APK**.
4. Choose **Run workflow** on the 1.6.32 branch.
5. Wait for dependency installation, TypeScript checks, source audits, Expo prebuild and the Android release build to complete.
6. Download `FitHub-1.6.32-APK` from the completed workflow.

## Runtime files replaced by the 1.6.32 patch

- `.github/workflows/build-apk.yml`
- `README.md`
- `app.json`
- `package.json`
- `package-lock.json`
- `src/screens/CustomizationScreen.tsx`
- `src/screens/FitnessJourneyScreen.tsx`
- `src/screens/SharedGymScreen.tsx`
- `src/screens/SupplementRemindersScreen.tsx`
- `src/screens/WorkoutSplitScreen.tsx`

## New runtime and validation files

- `supabase/UPDATE_2026_09_02_FITHUB_1_6_32_ADDITIVE.sql`
- `scripts/audit-1-6-32.mjs`
- Updated `scripts/audit-tracker-ui.mjs`
- 1.6.32 release notes, reports, patch list and source manifest

The realistic image assets used by these screens were already included in the complete 1.6.31 project, so they do not need to be uploaded again when using the 1.6.32 patch.

## Files and folders that must not be uploaded

- `.expo`
- `node_modules`
- generated `android` or `ios` folders
- build output such as `dist-android`
- `.env` or any other secret file
- `google-services.json` unless you intentionally manage it in a secure private repository
- Android keystores, signing credentials, API keys or access tokens

## Functional verification

### Gym invites

1. Use two confirmed FitHub friend accounts on two devices.
2. On the first device, open **You → Gym together**.
3. Select the friend, choose a future date/time, enter a workout name and tap **Send gym invite**.
4. Confirm the second device receives the phone notification and in-app notification.
5. Accept the invite and confirm it disappears from the notification list.
6. Confirm the first account receives an accepted response notification.
7. Repeat with Decline and confirm the sender receives the declined response.
8. Open the shared room and confirm the leader can add another confirmed friend.
9. Press Android Back inside the room and confirm it returns to the session list.

### Updated pages

1. Open **You → Supplement tracker** and verify the hero, calendar, daily statuses and reminder controls.
2. Pause a reminder and confirm it leaves the current routine count.
3. Remove a test reminder, open a date with an earlier check-in and confirm its history remains visible.
4. Open **Journey**, move to an earlier report and return to the current report.
5. Open **Weekly split**, select each day, choose image-led presets, save a custom label and clear a test day.
6. Open **Customize FitHub**, switch Appearance/Units/Features, test a theme, test System mode and restore the appearance defaults.

## Rollback

Revert the 1.6.32 code commit to restore the 1.6.31 interface. The two added database columns can safely remain unused; removing them is not required for a code rollback.
