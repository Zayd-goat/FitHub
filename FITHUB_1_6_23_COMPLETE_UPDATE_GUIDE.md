# FitHub 1.6.23 Complete Step-by-Step Update Guide

Follow these steps in order.

## 1. Keep a backup

Keep your current working FitHub source and APK until the 1.6.23 APK passes testing on the Android phone.

## 2. Extract and verify the package

1. Extract `FitHub_1.6.23_COMPLETE_UPDATE.zip`.
2. Open the extracted `FitHub_1.6.23_COMPLETE_UPDATE` folder.
3. Open `app.json` and confirm:

```text
Version: 1.6.23
Android versionCode: 33
iOS buildNumber: 33
Expo project ID: 3d3a3683-79bb-4711-ae01-1dab82cc21e7
Android package: com.fithub.app
```

## 3. Choose how much to upload

### Option A — Patch-only update from FitHub 1.6.22

You do **not** need to replace everything if your GitHub repository is already on the complete FitHub 1.6.22 release.

Upload or replace these exact files, keeping the same folder paths:

```text
.github/workflows/build-apk.yml
app.json
package.json
package-lock.json
assets/home/todays_plan_equipment_v1.png
scripts/audit-home-food-ui.mjs
scripts/generate-source-manifest.mjs
src/components/FitHubReferenceIcons.tsx
src/screens/MainApp.tsx
src/screens/tabs/DashboardTabV2.tsx
src/screens/tabs/FoodTab.tsx
```

The new documentation files are optional for the app build, but keeping them in GitHub is recommended.

### Option B — Complete source replacement

Use the complete replacement if your repository is older than 1.6.22, files are missing, or you are unsure what is currently uploaded.

1. Open the FitHub GitHub repository.
2. Replace the repository project files with every file and folder from the extracted 1.6.23 package.
3. Include the hidden `.github` folder.
4. Do not upload `node_modules` if you are uploading files manually; GitHub Actions installs dependencies itself.

For either option, do not upload `google-services.json`, `.env`, access tokens, API keys, passwords or private service-account files.

## 4. Leave Supabase unchanged

FitHub 1.6.23 changes the mobile UI and local build checks only.

- Do not run `schema.sql`.
- Do not rerun an older additive migration.
- Do not redeploy `nutrition-proxy` or `friend-notifications` for this release.
- Do not create or change a cron job.
- Do not change FatSecret, SMTP or notification secrets for this release.

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

Never use a Supabase service-role key as the mobile publishable key.

## 6. Build the APK

1. Commit the uploaded files to the `main` branch.
2. Open **Actions** in the GitHub repository.
3. Select **Build FitHub APK**.
4. Click **Run workflow**.
5. Choose `main` and click **Run workflow** again.
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
8. Download `FitHub-1.6.23-APK` from **Artifacts**.
9. Extract the artifact to obtain `FitHub.apk`.

## 7. Test the exact Home implementation

1. Install the new APK and open Home.
2. Confirm there is no large `HOME` heading.
3. Confirm the top row has the profile image, greeting, notification bell and settings gear.
4. On a Push/chest day, confirm Today’s Plan shows the bench, rack, loaded barbell and teal shaker artwork.
5. Confirm **START WORKOUT** starts a workout and **View plan** opens the split/plan.
6. Confirm all seven days fit inside Your Week and completed/today states are clear.
7. Confirm the workout and active-minute summaries remain on one line.
8. Confirm Quick Access appears as Journey/Nutrition, Supplements/Community Challenges and full-width Run Metrics.
9. Open every Quick Access destination and Friend Feed.

## 8. Test the exact Food implementation

1. Open Food and confirm the order is: header, seven-day strip, Today’s Diary, four shortcuts, meal timeline, Water.
2. Confirm the diary subtitle reads exactly:

```text
Keep your meals organised in one place
```

3. Confirm the shortcut labels are **Search**, **Scan**, **Recent** and **Saved Meals** on an adult test profile.
4. Confirm Breakfast, Lunch, Dinner and Snacks use the supplied illustrated style and cyan side timeline.
5. Confirm all four meal rows begin collapsed.
6. Expand each meal, add an item, remove an item, copy yesterday and save a meal.
7. Test verified food search, barcode scan, Recent and Saved Meals.
8. Add 250 ml of Water and confirm the bottle/glass display updates; then test Undo last entry.
9. Test Android Back from Food Search, the scanner, Recent, Saved Meals and food details.

## 9. Test the shared navigation and themes

1. Confirm the bottom dock has Home, Friends, Train, Food and You.
2. Confirm Train is a raised teal circle with a clean white horizontal dumbbell.
3. Open all five destinations.
4. Confirm the Friends request badge still appears when needed.
5. Test the Ice Performance light theme first, then dark and custom themes.
6. Increase Android text size and check the narrow-screen layout.
7. Confirm the navigation dock never covers the final reachable content.

## 10. Finish only after device verification

Keep the previous APK until the GitHub workflow is green and Home, Food, navigation, theme, text-size and Back tests pass on the physical Android phone. Local source validation cannot replace the connected APK build and device inspection.
