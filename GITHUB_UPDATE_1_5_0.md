# FitHub 1.5.0 — GitHub + APK update

## Important: Supabase is already done

This app update is written against the FitHub 1.5.0 additive migration that you already ran in Supabase on 14 August 2026.

**Do not run the old `schema.sql`. Do not rerun the 1.5.0 migration for this update.**

The app expects the existing 1.5.0 tables for preferences, supplement reminders, workout split, PR events, Clubs and community challenges.

## 1. Download and extract

1. Download `FitHub_Update_1.5.0.zip`.
2. Extract it.
3. Open the extracted `FitHub_Update_1.5.0` folder.

The update contains root app files, a partial `src` folder containing only files that changed/new files, and an updated APK workflow.

## 2. Back up GitHub first

Optional but strongly recommended: before uploading, download the current repository ZIP or create a backup branch from `main`.

## 3. Open the repository

1. Open the existing FitHub GitHub repository.
2. Choose **Code**.
3. Make sure the branch is **main**.

## 4. Upload the root app files

Use **Add file → Upload files** and upload/replace:

- `App.tsx`
- `app.json`
- `package.json`

Do not delete other root files.

## 5. Upload the `src` update

Upload the **whole `src` folder from this update over the existing `src` folder**.

Do **not** delete the existing repository `src` folder first. This update only contains changed/new source files, so unrelated existing 1.4 files must remain.

Correct examples after upload:

- `src/components/UI.tsx`
- `src/components/PRCelebrationModal.tsx`
- `src/lib/notifications.ts`
- `src/lib/prs.ts`
- `src/lib/units.ts`
- `src/screens/FitnessJourneyScreen.tsx`
- `src/screens/SupplementRemindersScreen.tsx`
- `src/screens/WorkoutSplitScreen.tsx`
- `src/screens/CustomizationScreen.tsx`
- `src/screens/ClubsScreen.tsx`
- `src/screens/tabs/DashboardTab.tsx`
- `src/screens/tabs/FriendsTab.tsx`
- `src/screens/tabs/ProfileTab.tsx`
- `src/screens/tabs/WorkoutTab.tsx`

Wrong example:

- `FitHub_Update_1.5.0/src/...`

If GitHub shows the wrong outer wrapper folder, stop before committing.

## 6. Update the APK workflow

Replace:

`.github/workflows/build-apk.yml`

This keeps the existing builder and adds one optional public variable used in external PR sharing:

`EXPO_PUBLIC_FITHUB_DOWNLOAD_URL`

Your Supabase secrets are unchanged.

If you do not have a public FitHub download/store/landing-page URL yet, **do not create a fake one**. Leave the repository variable unset. The build still works.

## 7. Commit

Suggested commit message:

`Update FitHub to 1.5.0 - journey clubs themes reminders challenges`

Commit directly to `main`.

## 8. Optional public PR download link

Only do this if you already have a real public HTTPS FitHub page:

1. GitHub repository → **Settings**.
2. **Secrets and variables → Actions**.
3. Open **Variables**.
4. Create `EXPO_PUBLIC_FITHUB_DOWNLOAD_URL`.
5. Paste your real public FitHub URL.

If you do not have one, skip this step.

## 9. Build the APK

1. Open **Actions**.
2. Choose **Build FitHub APK**.
3. Use the newest run triggered by the 1.5.0 commit.
4. If no run starts, choose **Run workflow**, select `main`, then run it.
5. Wait for the build to finish.

If it fails, open the **first red step** and capture the first actual error. Do not rerun database migrations or delete source files based only on `exit code 1`.

## 10. Download the APK

After a successful run:

1. Open the successful workflow run.
2. Scroll to **Artifacts**.
3. Download **FitHub-APK**.
4. Extract the downloaded ZIP.
5. Inside, find `FitHub.apk`.

## 11. Install/update on Android

1. Transfer `FitHub.apk` to the phone.
2. Open it from the Files app.
3. Choose **Update** when Android offers to update the existing FitHub installation.
4. If Android requires permission to install from that source, enable the permission and return to the installer.

FitHub 1.5.0 uses Android `versionCode` 8.

## 12. Test in this order

1. Sign in and confirm the existing Home/Train/Food/Friends/You tabs still load.
2. **You → Customize FitHub**: try all six theme families, System/Dark/Light, an accent colour, kg/lb, km/mi, and hide/unhide one feature.
3. **You → Supplement Reminders**: add a custom reminder, test the Creatine quick add on an adult account, toggle one off/on, and delete one.
4. **You → Workout Split**: set the seven-day split. On the next eligible first app entry for a local day, confirm the Today prompt appears.
5. Complete a workout that genuinely beats an earlier recorded result. Confirm the confetti PR popup states exactly what changed.
6. Share that PR to the FitHub feed, then test the Android share sheet.
7. **Home → My Fitness Journey**: open the Weekly and Monthly reports.
8. **Clubs**: on an adult account, confirm eligible load-based Clubs reflect saved PR unlocks. Under-18 accounts should not show load-club targets.
9. **Friends → Challenges**: create a private challenge, invite a friend, confirm the creator is shown, then test joined/in-progress/completed progress.
10. Re-test existing 1.4 active-workout controls and notification actions: NEXT SET, END WORKOUT, End & Save and Delete Workout.

## Build validation note

The update was checked for missing relative imports, missing required image assets, and TypeScript/JSX parse-class errors. The full Android/Expo compile still happens in your GitHub Actions environment, where the project dependencies are installed.
