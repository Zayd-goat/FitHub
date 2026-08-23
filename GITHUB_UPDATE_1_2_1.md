# FitHub 1.2.1 — GitHub APK Update Guide

This package contains the full current `src` and `assets` folders, plus the current `App.tsx` and `app.json`.

## Important
- Do **not** delete your existing `src` or `assets` folders first.
- Upload the new folders over the existing ones so matching files are replaced and new files are added.
- Do **not** create an extra `FitHub_Final_Update_1.2.1/` folder inside the repo.
- Do **not** change `.github/workflows/build-apk.yml` for this update.
- If you already successfully ran `supabase/UPDATE_2026_08_09.sql`, you do not need to run it again.

## 1. Download and extract
1. Download `FitHub_Final_Update_1.2.1.zip`.
2. Extract it on your computer.
3. Open the extracted `FitHub_Final_Update_1.2.1` folder.

## 2. Supabase check
The latest visual refinements do not need a new database migration.

If you have **not** yet run the earlier FitHub 1.2 migration:
1. Open `supabase/UPDATE_2026_08_09.sql` from this package.
2. Copy all of it.
3. Open Supabase > your FitHub project > SQL Editor > New query.
4. Paste it and click Run.
5. Continue only after it succeeds.

If you already ran that migration successfully, skip this section.

## 3. Open the GitHub repo
1. Open your existing FitHub repository on GitHub.
2. Click `Code`.
3. Make sure the selected branch is `main`.

## 4. Upload the final files
1. Click `Add file` > `Upload files`.
2. Open the extracted update folder on your computer.
3. Upload these items from **inside** the update folder:
   - `App.tsx`
   - `app.json`
   - the entire `src` folder
   - the entire `assets` folder
4. Do not delete the old folders first. Let the upload replace matching files and add new files.
5. Make sure GitHub is showing paths such as `src/screens/tabs/FoodTab.tsx`, not `FitHub_Final_Update_1.2.1/src/...`.

## 5. Commit
1. Scroll to the bottom of the upload page.
2. Commit message: `Apply FitHub 1.2.1 final UI update`
3. Choose `Commit directly to the main branch` if shown.
4. Click `Commit changes`.

## 6. Open the APK builder
1. Click the `Actions` tab.
2. In the left column, click `Build FitHub APK`.
3. Open the newest workflow run created by your commit.

If no run starts automatically:
1. Click `Run workflow`.
2. Select `main`.
3. Click the green `Run workflow` button.

## 7. Wait for the build
The workflow should run steps similar to:
- Checkout
- Node setup
- Java/Android setup
- Install dependencies
- Expo prebuild
- Gradle APK build
- Upload artifact

Wait for a green checkmark.

If it turns red:
1. Open the failed run.
2. Open the first step with a red X.
3. Send a screenshot of the first real error message.
4. Do not redo the whole upload unless the error specifically requires it.

## 8. Download the APK
After the run succeeds:
1. Open the successful run.
2. Scroll to `Artifacts`.
3. Click `FitHub-APK`.
4. Extract the downloaded ZIP.
5. Inside, open/use `FitHub.apk`.

## 9. Install on Android
1. Transfer `FitHub.apk` to the phone.
2. Tap it in the phone's Files app.
3. Allow installation from that source if Android asks.
4. Tap `Install` or `Update`.

FitHub is now version `1.2.1` with Android `versionCode 4`.

## 10. Final checks
Test:
- the new Bold Strength app icon (red F + white dumbbell)
- Food tab in Light mode and Dark mode
- Food blue-outline buttons changing background with the selected theme
- Food daily calorie/protein/carb/fat progress rings
- Food macronutrient donut breakdown
- Food History
- Friends > Feed / Following / Challenges tabs
- social workout post layout and comments
- blue-outline Join buttons
- the previous onboarding, workout, progress, PR and history updates
