# FitHub 1.6.15 Complete Step-by-Step Update Guide

This guide assumes the GitHub repository already contains FitHub and the APK is built with GitHub Actions.

## 1. Download and extract the update

1. Download FitHub_1.6.15_COMPLETE_UPDATE.zip.
2. Right-click the ZIP and choose **Extract All**.
3. Open the extracted FitHub_1.6.15_COMPLETE_UPDATE folder.
4. Confirm it contains assets, src, scripts, supabase, .github, App.tsx, app.json, package.json, and package-lock.json.

Copy the **contents** of that folder into the repository. Do not upload the enclosing folder as a new folder inside the repository.

## 2. Make a backup first

1. Open the existing repository in GitHub.
2. Click **Code → Download ZIP**.
3. Keep that ZIP until the new APK has been installed and tested.

If using GitHub Desktop, wait until it says the current branch is up to date before replacing files.

## 3. What may be replaced

It is safe to replace these repository folders with the matching 1.6.15 folders:

    assets
    src
    scripts
    supabase
    reports

Also replace the supplied root files and .github workflow.

Important:

- Replacing the repository's supabase folder only replaces source files stored in GitHub. It does **not** delete the live Supabase project, tables, users, or data.
- Do not delete .git.
- Do not delete GitHub repository secrets.
- Do not delete or recreate live Supabase tables.
- Do not upload a private .env.
- Do not upload node_modules, android, dist-release-1.6.15, APK files, or AAB files.

## 4. Recommended method: GitHub Desktop

This is the safest method for a full folder replacement.

1. Install and open GitHub Desktop.
2. Choose **File → Clone repository** if the FitHub repository is not already on the computer.
3. Select the FitHub repository and clone it.
4. In GitHub Desktop, choose **Repository → Show in Explorer**.
5. Close any app currently editing the same files.
6. In the local repository, delete only the old assets, src, scripts, supabase, and reports folders.
7. Copy the matching new folders from FitHub_1.6.15_COMPLETE_UPDATE into the local repository.
8. Copy all supplied root files into the repository and allow Windows to replace files with the same names.
9. Copy the supplied .github folder too.
10. Return to GitHub Desktop.
11. Review the changed-file list. Do not commit unrelated personal files.
12. Enter this summary:

       FitHub 1.6.15 complete update

13. Click **Commit to main**.
14. Click **Push origin**.
15. Open GitHub in the browser and confirm the latest commit appears on main.

No Command Prompt command is required when using this method.

## 5. Browser-only method

GitHub's normal upload page cannot conveniently bulk-delete folders, so use the browser editor carefully.

### Delete and replace with the dot editor

1. Open the repository's main page.
2. Confirm the branch selector says main.
3. Press the period key. GitHub opens a VS Code-style browser editor.
4. In the left Explorer, select only the project folders being replaced.
5. Right-click and choose **Delete**.
6. Drag the matching replacement folders from the extracted update into the Explorer, if your browser allows folder drag-and-drop.
7. Open **Source Control** using the branch-shaped icon on the left or press Ctrl+Shift+G.
8. Enter:

       FitHub 1.6.15 complete update

9. Click the check mark or **Commit & Push**.
10. If GitHub asks to stage all changes, choose **Yes**.
11. If it shows **Sync Changes**, click it so the commit reaches GitHub.

If the browser will not upload folders, commit the deletion and immediately use **Add file → Upload files** on GitHub to upload the replacements. Do not run the APK workflow while the assets are temporarily missing.

## 6. Check the exercise folder structure

The final paths must be:

    assets/train_v3/male/
    assets/train_v3/female/
    assets/train_v4/groups/male/
    assets/train_v4/groups/female/

Avoid these incorrect paths:

    assets/train_v3/train_v3/
    assets/train_v3/male/male/
    assets/train_v3/female/female/

There must be no loose exercise PNGs beside app.json on the repository's main page.

### If male or female must be recreated manually

1. Open assets/train_v3 in GitHub.
2. Choose **Add file → Create new file**.
3. Enter male/.placeholder and commit it.
4. Repeat with female/.placeholder.
5. Open male, choose **Add file → Upload files**, and upload the contents of the update's assets/train_v3/male folder.
6. Repeat for female.
7. Delete both .placeholder files after the PNG uploads succeed.

Replacing the complete assets folder from the ZIP is preferred because it avoids manual path mistakes.

## 7. Confirm versions and workflow

On GitHub, check:

- package.json contains version 1.6.15.
- app.json contains version 1.6.15.
- app.json contains versionCode 25.
- .github/workflows/build-apk.yml exists.
- scripts/audit-exercise-visuals.mjs exists.
- assets/home/rest_day_male_v2.png exists.
- assets/home/rest_day_female_v2.png exists.

## 8. GitHub secrets

Open **Settings → Secrets and variables → Actions** and confirm these repository secrets still exist:

- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Use the Supabase publishable/anon key. Never place a service-role key in the app or repository.

Existing FatSecret or USDA server credentials remain in Supabase Edge Function secrets, not in the Android app.

## 9. Supabase and Command Prompt

For FitHub 1.6.15:

- do not run new SQL;
- do not rerun old migrations;
- do not recreate tables;
- do not run npm install, npm ci, Expo prebuild, or Gradle from Command Prompt unless you personally want an optional local developer check.

The required checks run automatically in GitHub Actions.

## 10. Build the APK

1. Open the GitHub repository.
2. Click **Actions**.
3. Select **Build FitHub APK**.
4. Click **Run workflow**.
5. Select main.
6. Click the green **Run workflow** button.
7. Open the new run.
8. Wait for all steps to become green, especially:
   - Install dependencies
   - Type-check application
   - Audit exercise visuals
   - Generate Android project
   - Build standalone release APK
9. On the run's Summary page, scroll to **Artifacts**.
10. Download FitHub-1.6.15-APK.
11. Extract the downloaded artifact to find the APK.

## 11. Install the APK

1. Transfer the APK to the Android phone.
2. Open the APK on the phone.
3. Allow installation from that file source if Android asks.
4. Install the app.

If Android reports that the package conflicts with the installed version:

1. Back up any device-only information first.
2. Uninstall the older FitHub APK.
3. Install the new APK.
4. Sign in again.

## 12. Device test checklist

### Home

- Change between at least one light and one dark theme.
- Confirm the page background, cards, text, and accent controls follow the selected theme.
- Confirm Today's Plan artwork follows the scheduled split.
- Set or view a Rest Day and confirm the athlete, bottle, mat, and roller have no rectangular background.
- Confirm Journey, Nutrition, Supplements, Community Challenges, and Run Metrics appear in Quick Access.

### Train muscle groups

- Confirm Chest, Back, Shoulders, Arms, Legs, Core, Full Body, and Cardio are visible.
- Confirm figures have transparent backgrounds in both light and dark themes.
- Confirm red target muscles remain red when the theme changes.
- Confirm labels and exercise counts are centered beneath the figures.
- Check both male and female profile paths.

### Exercise browser

- Open every muscle group at least once.
- Confirm no exercise row is blank.
- Confirm the figure and equipment have no grey/off-white inner rectangle.
- Confirm dark mode keeps the readable outer card.
- Test search and all equipment filters.
- Add multiple exercises and test **Preview Workout** and **Start Now**.

### Active workout

- Confirm the large exercise art is transparent.
- Open the exercise guide.
- Change set values and complete a set.
- Add and remove an exercise.
- Test the rest timer and Skip Rest.
- Test Next Unfinished Exercise.
- Minimize the workout and resume it from the active-workout card.
- End and save a completed test workout.

### Existing features

- Open the supplement calendar and select a date.
- Confirm nutrition, friends, challenges, notifications, settings, and saved workouts still open.

## 13. If GitHub says No changes

That means the uploaded file is byte-for-byte identical to the repository version, or the wrong extracted folder was selected.

Check:

- the extracted ZIP name is FitHub_1.6.15_COMPLETE_UPDATE.zip;
- the repository path is correct;
- the upload did not create an extra enclosing folder;
- GitHub finished processing every file;
- the version values in Step 7 show 1.6.15 and 25.

## 14. If the workflow fails

1. Open the failed workflow run.
2. Open the first red step.
3. Use the step's menu to copy or download the complete log.
4. Keep the failed run and commit available for diagnosis.
5. Do not delete assets or rerun Supabase migrations as a general troubleshooting step.
