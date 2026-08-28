# FitHub 1.6.22 Complete Step-by-Step Update Guide

Follow these steps in order.

## 1. Keep a backup

Keep the currently working FitHub source and APK until the 1.6.22 APK has passed testing on the Android phone.

## 2. Extract and verify the update

1. Extract `FitHub_1.6.22_COMPLETE_UPDATE.zip`.
2. Open the extracted `FitHub_1.6.22_COMPLETE_UPDATE` folder.
3. Open `app.json` and confirm:

```text
Version: 1.6.22
Android versionCode: 32
iOS buildNumber: 32
Expo project ID: 3d3a3683-79bb-4711-ae01-1dab82cc21e7
Android package: com.fithub.app
```

## 3. Replace the GitHub source

1. Open the FitHub GitHub repository.
2. Replace the repository project files with every file and folder from the extracted update.
3. Include the hidden `.github` folder and `.github/workflows/build-apk.yml`.
4. Confirm these new files are present:

```text
src/components/FitHubFreshIcons.tsx
src/screens/tabs/DashboardTabV2.tsx
scripts/audit-home-food-ui.mjs
FITHUB_1_6_22_COMPLETE_UPDATE_GUIDE.md
```

5. Do not upload `google-services.json`, `.env`, tokens, keys, passwords, or private service-account files.
6. Commit the replacement source to `main`.

## 4. Leave Supabase unchanged for this release

FitHub 1.6.22 changes only the mobile UI and local build checks.

- Do not rerun `schema.sql`.
- Do not rerun an older additive migration.
- Do not redeploy `nutrition-proxy` or `friend-notifications` only for 1.6.22.
- Do not create another cron job.
- Do not change FatSecret or notification secrets for this UI release.

If an older required migration or function was never deployed, complete that older release’s instructions separately before testing its features.

## 5. Confirm existing GitHub configuration

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

Do not use a Supabase service-role key as the mobile publishable key.

## 6. Build the APK

1. Open the GitHub repository.
2. Select **Actions**.
3. Select **Build FitHub APK**.
4. Click **Run workflow**.
5. Choose `main`.
6. Click **Run workflow** again.
7. Wait for every stage to become green, especially:

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

8. Open the successful run.
9. Download the artifact:

```text
FitHub-1.6.22-APK
```

10. Extract it to obtain `FitHub.apk`.

## 7. Test Home on the phone

1. Install `FitHub.apk`.
2. Open Home on a narrow Android phone first.
3. Confirm Today’s Plan shows the correct scheduled workout or Rest Day and the correct artwork.
4. Confirm Start Workout and View or change plan open the correct screens.
5. Confirm all seven days fit inside Your Week.
6. Confirm workout count and active minutes each stay inside their own metric tile without broken lines.
7. Confirm Community Challenges uses no more than two lines.
8. Open Journey, Nutrition, Supplements, Community Challenges, Run Metrics, and Friend Feed.
9. Scroll to the final Friend Feed item and confirm the navigation dock does not cover it.

## 8. Test Food on the phone

1. Open Food and confirm the diary summary, primary add/search action, shortcuts, meal cards, Water, and Nutrition appear in that order.
2. Open Search and add a food to each meal.
3. Test Scan, Recent, Saved Meals, and Custom Food with an adult test account.
4. Expand and collapse Breakfast, Lunch, Dinner, and Snacks.
5. Test Copy yesterday, Save meal, and remove a logged food.
6. Add 250 ml of Water and use Undo last entry.
7. Scroll below Water and confirm the bottom navigation does not hide any content.
8. Test a younger account and confirm it can keep a neutral meal journal but does not see online nutrition search, barcode scanning, or numeric calorie/macro targets.

## 9. Test themes, accessibility, and navigation

1. Check every Home, Food, and bottom-navigation icon in light, dark, and custom themes.
2. Confirm each icon remains clear without relying on colour alone.
3. Increase Android text size and confirm labels remain readable.
4. Test Android Back from Food Search, Saved Meals, Recent, and food detail screens.
5. Test Home, Friends, Train, Food, and You from the bottom navigation.
6. Confirm the raised Train button and active-tab pill do not cover page content.
7. Test pull-to-refresh and an offline/error state.

## 10. Finish only after verification

Keep the previous APK until the GitHub workflow is fully green and the narrow-screen, theme, text-size, Back, and physical-device checks pass. A successful local source audit does not replace the GitHub TypeScript build or phone testing.
