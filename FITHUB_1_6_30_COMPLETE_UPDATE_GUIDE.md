# FitHub 1.6.30 complete update guide

## What this release changes

- Train now moves straight from the Workout header into the muscle-group artwork.
- The removed area includes the old Build your session hero, Choose/Configure/Start rail, and Step 1 introduction.
- Active-workout recovery, saved plans, exercise selection, preview, starting, drag reordering and movement guidance remain available.
- You now uses illustrated App & account destination cards and grouped Personal details panels.
- Profile editing, avatar upload, units, theme settings, weekly split, Clubs and sign out remain wired to their existing actions.

## Option A — update an existing FitHub 1.6.29 repository

1. Download and extract `FitHub_1.6.30_PATCH_FROM_1.6.29.zip`.
2. Open its `FitHub_1.6.30_PATCH_FROM_1.6.29` folder.
3. Copy every file and folder inside it into the root of your FitHub repository.
4. Keep the folder structure exactly as supplied and confirm replacements.
5. Commit the changes on a new branch.

## Option B — replace an older or uncertain repository

1. Download `FitHub_1.6.30_COMPLETE_UPDATE.zip`.
2. Extract the `FitHub_1.6.30_COMPLETE_UPDATE` folder.
3. Use those extracted contents as the complete project source.
4. Restore your own deployment secrets only through GitHub Secrets or your local environment. Do not commit them.

## Build the APK in GitHub

1. Push the updated project to GitHub.
2. Open the repository's **Actions** tab.
3. Select the Android APK workflow.
4. Choose **Run workflow** on the 1.6.30 branch.
5. Wait for the workflow to finish successfully.
6. Open the completed run and download `FitHub-1.6.30-APK`.

## Specific runtime files replaced by the patch

- `.github/workflows/build-apk.yml`
- `app.json`
- `package.json`
- `package-lock.json`
- `src/components/FitHubTrackerIcons.tsx`
- `src/screens/tabs/ProfileTab.tsx`
- `src/screens/tabs/WorkoutTab.tsx`

The patch also includes its audit script, generated report, release notes, instructions and source manifest.

## Files that must not be uploaded

- `.expo`
- `node_modules`
- `dist-android`
- `.env` or any other secret file
- `google-services.json` unless you intentionally manage it through a secure private workflow
- Android keystores, signing credentials, API keys or access tokens

## Verification after installation

1. Open Train. The muscle-group artwork should begin immediately under the Workout header.
2. Open search and Saved Workouts and confirm both still work.
3. Start or resume a workout and confirm preview, set editing, drag reordering and exercise guidance still work.
4. Open You. Confirm Customize FitHub and Weekly split appear as two illustrated cards and Clubs appears as a wide illustrated card when available.
5. In Personal details, confirm Profile, Training and Preferences groups display correctly.
6. Tap Edit, change a harmless preference, save it, reopen the page and confirm it persisted.
7. Confirm Home, Friends, Food, Journey, Supplements and Add Meal still open normally.

## Database and backend

No new SQL, storage change, Edge Function or environment variable is required for FitHub 1.6.30.
