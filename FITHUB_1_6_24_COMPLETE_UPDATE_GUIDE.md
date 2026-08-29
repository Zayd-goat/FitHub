# FitHub 1.6.24 Complete Step-by-Step Update Guide

Follow these steps in order.

## 1. Keep a backup

Keep your current FitHub source and working APK until the 1.6.24 APK passes testing on the Android phone.

## 2. Extract and verify the package

1. Extract `FitHub_1.6.24_COMPLETE_UPDATE.zip` or the smaller patch ZIP.
2. Open `app.json` and confirm:

```text
Version: 1.6.24
Android versionCode: 34
iOS buildNumber: 34
Expo project ID: 3d3a3683-79bb-4711-ae01-1dab82cc21e7
Android package: com.fithub.app
```

## 3. Choose how much to upload

### Option A — Small patch from complete FitHub 1.6.23

Use `FitHub_1.6.24_PATCH_FROM_1.6.23.zip` only if your GitHub repository already contains the complete 1.6.23 release.

Extract the patch and upload or replace every included file, keeping the same folder paths. The app/build files are:

```text
.github/workflows/build-apk.yml
app.json
package.json
package-lock.json
assets/home/todays_plan_equipment_v2.png
scripts/audit-home-food-ui.mjs
src/components/FitHubReferenceIcons.tsx
src/screens/MainApp.tsx
src/screens/tabs/DashboardTabV2.tsx
```

The patch also contains this release’s guide, changelog, validation report and source manifest.

### Option B — Complete source replacement

Use the complete package if your repository is older than 1.6.23, incomplete, or you are unsure.

1. Open the FitHub GitHub repository.
2. Replace the repository project files with the contents of the extracted `FitHub_1.6.24_COMPLETE_UPDATE` folder.
3. Include the hidden `.github` folder.
4. Do not upload `.expo` or `node_modules`; GitHub Actions creates what it needs.

For either option, do not upload `.env`, `google-services.json`, access tokens, API keys, passwords or private service-account files.

## 4. Leave Supabase unchanged

FitHub 1.6.24 is a mobile Home/UI release.

- Do not run `schema.sql`.
- Do not rerun an additive migration.
- Do not redeploy `nutrition-proxy` or `friend-notifications`.
- Do not change cron jobs, FatSecret settings, SMTP settings or Supabase secrets.

## 5. Keep the existing GitHub configuration

Open **GitHub repository → Settings → Secrets and variables → Actions**.

Under **Secrets**, keep:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
GOOGLE_SERVICES_JSON_BASE64
```

Under **Variables**, keep:

```text
EXPO_PUBLIC_EXPO_PROJECT_ID = 3d3a3683-79bb-4711-ae01-1dab82cc21e7
```

Never use the Supabase service-role key as the mobile publishable key.

## 6. Build the APK

1. Commit the uploaded files to `main`.
2. Open **Actions** in the GitHub repository.
3. Select **Build FitHub APK**.
4. Click **Run workflow**.
5. Select `main`, then click **Run workflow** again.
6. Wait for every stage to become green:

```text
Install dependencies
Type-check application
Audit local source references
Audit every exercise visual
Audit Home and Food UI safeguards
Audit PNG asset integrity
Generate Android project
Build standalone release APK
Upload FitHub APK
```

7. Open the successful run.
8. Download `FitHub-1.6.24-APK` under **Artifacts**.
9. Extract it to obtain `FitHub.apk`.

## 7. Test the locked Home design

1. Install the APK and open Home.
2. Confirm the screen starts with profile/greeting, notification bell and settings—not a large `HOME` title.
3. Confirm Today’s Plan has the live workout name, muscle-group subtitle, cyan Start Workout control, View Plan link and equipment image.
4. On a Push/chest day, confirm the equipment includes a black bench, rack, loaded barbell, shaker and folded towel.
5. Confirm Start Workout and View Plan still work.
6. Confirm `YOUR WEEK` is inside its card and all seven days fit.
7. Confirm completed days, today and uncompleted days remain distinct.
8. Confirm workouts and active minutes appear in one compact row.
9. Confirm Quick Access is Journey/Nutrition, Supplements/Community Challenges and full-width Run Metrics.
10. Open all five Quick Access destinations.
11. Confirm only one compact recent Friend Feed item appears on Home.
12. Pull to refresh and verify the live workout, week totals and feed update.

## 8. Test the locked bottom navigation

1. Confirm the dock is slim, white/fit-to-theme and rounded.
2. Confirm Home, Friends, Food and You use the refreshed icon set.
3. Confirm Train is a raised cyan circle with a white horizontal dumbbell.
4. Open all five destinations.
5. Confirm the Friends request badge still works.
6. Confirm the dock does not cover the last reachable Home or Food content.

## 9. Test themes and phone layouts

1. Test the Ice Performance light theme first.
2. Test dark and custom themes.
3. Test a narrow Android phone width and increased Android text size.
4. Confirm labels do not overlap or clip.
5. Confirm Android Back works from every destination opened from Home.

## 10. Finish only after device verification

Keep the previous APK until the GitHub workflow is fully green and the Home design, actions, navigation, themes, text-size and Back tests pass on the physical Android phone.
