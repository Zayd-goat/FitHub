# FitHub 1.6.11 complete update guide

This guide begins after downloading and extracting the update ZIP on Windows.

## 1. Back up the current app

1. In GitHub, open the FitHub repository.
2. Select **Code** > **Download ZIP** and keep it as the pre-1.6.11 backup.
3. Keep a copy of the last working APK.
4. In Supabase, confirm the project and tables are healthy before changing anything.

## 2. Understand the update folder

The ZIP contains a folder named `FitHub`. That folder is the project root. It contains `package.json`, `app.json`, `App.tsx`, `src`, `assets`, `supabase`, and the hidden `.github` folder.

Do not upload:

- `node_modules`
- `.expo`
- `.env`
- a locally generated `android` folder
- old ZIP files or APK files

## 3. Recommended: replace the project with GitHub Desktop

This is the reliable way to replace an entire `assets` folder and remove obsolete images.

1. Install and open GitHub Desktop.
2. Select **File** > **Clone repository**.
3. Choose the FitHub repository and clone it.
4. Open the local cloned folder in File Explorer.
5. Close any terminal or editor using that folder.
6. Delete only the cloned project's old `assets` folder.
7. Copy the complete new `assets` folder from this update into the cloned project root.
8. Copy the rest of the new `FitHub` contents into the cloned project and choose **Replace files in the destination**.
9. Do not delete the cloned `.git` folder.
10. In GitHub Desktop, review the changed files.
11. Enter `Update FitHub to 1.6.11` as the summary.
12. Select **Commit to main**, then **Push origin**.

## 4. Alternative: upload through the GitHub website

The web uploader can merge folders but cannot reliably remove all obsolete files from a folder in one action.

1. Open the repository's main page.
2. Select **Add file** > **Upload files**.
3. Drag the visible project files plus `assets`, `src`, `scripts`, `supabase`, and `reports` into the page.
4. Commit the upload.
5. For `.github`, open **Add file** > **Create new file** and type `.github/workflows/build-apk.yml` as the filename. Paste the workflow from the update and commit it.
6. Hidden local files such as `.gitignore` can also be recreated with **Create new file**.
7. If old asset files must be removed, delete those files individually in GitHub or use the GitHub Desktop method above.

## 5. Verify the required GitHub paths

Confirm these paths exist:

- `.github/workflows/build-apk.yml`
- `assets/home/rest_day.png`
- `assets/train_v2/groups/`
- `assets/train_v3/male/`
- `assets/train_v3/female/`
- `src/screens/tabs/DashboardTab.tsx`
- `src/screens/tabs/WorkoutTab.tsx`
- `src/screens/SupplementRemindersScreen.tsx`
- `scripts/audit-exercise-visuals.mjs`

Exercise PNG files must stay inside their male or female directory. They should not appear loose on the repository's main page.

## 6. Supabase database update

There is no new SQL migration for the 1.6.11 visual/navigation update. Do not rerun `UPDATE_2026_08_14_FITHUB_1_5_0.sql` or any migration already applied.

Keep the existing Edge Functions and database tables. If Edge Functions were never deployed from an earlier release, deploy only the missing function from the existing `supabase/functions` folder.

## 7. Keep API secrets server-side

FatSecret client secrets and USDA keys belong in Supabase Edge Function secrets, never in the app source.

From a Command Prompt opened in the extracted `FitHub` folder:

```bat
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REFERENCE
npx supabase secrets set FATSECRET_CLIENT_ID="YOUR_CLIENT_ID" FATSECRET_CLIENT_SECRET="YOUR_CLIENT_SECRET" USDA_API_KEY="YOUR_USDA_API_KEY"
```

Your project reference is the project ID shown in Supabase URLs and API settings. Do not paste secret values into GitHub commits, screenshots, chat, `app.json`, or variables beginning with `EXPO_PUBLIC_`.

## 8. Check GitHub Actions variables

In GitHub open **Settings** > **Secrets and variables** > **Actions**. Preserve the existing public runtime configuration used by the workflow. Only the Supabase URL and publishable/anonymous client key may be provided to the Android client. Provider secrets remain in Supabase.

## 9. Build the APK

1. Open the repository's **Actions** tab.
2. Choose **Build FitHub APK**.
3. Select **Run workflow** > **Run workflow**.
4. Wait for the `android-apk` job to turn green.
5. Open the completed run.
6. Under **Artifacts**, download `FitHub-1.6.11-APK`.
7. Extract the artifact ZIP to obtain the APK.

The workflow performs TypeScript checking, the exercise-visual audit, Android prebuild, and Gradle release assembly before uploading the APK.

## 10. Install on Android

1. Copy the APK to the phone or download it directly on the phone.
2. Open the APK.
3. If Android asks, allow that browser or file manager to install unknown apps.
4. Select **Install**.
5. If Android refuses to update the existing installation because its signature differs, preserve any needed local-only data, uninstall the old APK, and install the new APK.
6. The project folder is not needed on the phone; the release APK contains its JavaScript bundle and assets.

## 11. Required testing checklist

- Sign in, sign out, and restore a session.
- Change themes and verify Home, Train, exercise cards, and supplement calendar colors change while target muscles remain red.
- Set push, pull, legs, cardio, full-body, core, and rest split days; confirm today's Home artwork changes.
- Start a workout from Home.
- Add exercises, preview the workout, reorder it, and start immediately.
- Leave an active workout, navigate elsewhere, use the floating workout bar, and recover it.
- Use Android Back on a modal, deeper screen, non-Home main tab, and Home.
- Switch a profile between male and female visual settings and verify both Train paths.
- Search and filter exercises and confirm equipment labels and imagery.
- Review `reports/exercise-visual-audit.json` before treating any family-mapped exercise as a uniquely audited illustration.
- Create multiple supplements with different colors.
- Navigate supplement months, select dates, mark taken, and inspect Taken/Missed/Scheduled states.
- Test Taken, reschedule one hour, and reschedule two hours from a real notification.
- Open Breakfast/Lunch/Dinner/Snacks food search, add and remove food, log water, scan a barcode, and test provider results.
- Test friend feed, post deletion, comments, notification preferences, challenges, Clubs, and shared workout consent.
- Test Bluetooth FTMS with supported gym equipment and manual fallback.

## 12. If the build fails

1. Open the failed Action.
2. Expand the first red step, not only the final `exit code 1` line.
3. Search upward for `Error:`, `Unable to resolve`, `AAPT2`, or `What went wrong`.
4. Confirm all assets are inside `assets`, not loose in the repository root.
5. Confirm `package.json` and `package-lock.json` both report version 1.6.11.
6. Do not run `npm audit fix --force`; it can introduce breaking dependency changes.

