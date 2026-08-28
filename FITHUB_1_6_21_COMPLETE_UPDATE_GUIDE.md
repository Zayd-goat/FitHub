# FitHub 1.6.21 Complete Step-by-Step Update Guide

Follow these steps in order.

## 1. Keep a backup

Keep your current working source and APK until the 1.6.21 APK passes testing on your Android phone.

## 2. Extract the update

1. Extract `FitHub_1.6.21_COMPLETE_UPDATE.zip`.
2. Open the extracted `FitHub_1.6.21_COMPLETE_UPDATE` folder.
3. Confirm these release values:

```text
App version: 1.6.21
Android versionCode: 31
iOS buildNumber: 31
```

## 3. Replace the GitHub source

1. Open your FitHub GitHub repository.
2. Replace its project files with all files from the extracted folder.
3. Include the hidden `.github` folder and its workflow.
4. Do not upload `google-services.json`, `.env`, private keys, tokens, or passwords.
5. Commit the source to `main`.

## 4. Do not rerun Supabase for this UI release

FitHub 1.6.21 adds no SQL migration and changes no Edge Function.

If 1.6.20 is already deployed successfully:

- Do not rerun `schema.sql`.
- Do not rerun `UPDATE_2026_08_28_FITHUB_1_6_20_ADDITIVE.sql`.
- Do not redeploy `friend-notifications` only because of 1.6.21.
- Keep the one correct notification cron job active.

If you skipped 1.6.20 entirely, complete the 1.6.20 migration and notification deployment from its guide before testing the features introduced there.

## 5. Build the APK

1. Open GitHub → **Actions**.
2. Select **Build FitHub APK**.
3. Click **Run workflow**.
4. Choose `main` and run it.
5. Confirm every stage is green, especially:

```text
Install dependencies
Type-check application
Audit local source references
Audit every exercise visual
Generate Android project
Build standalone release APK
Upload FitHub APK
```

6. Download the artifact named:

```text
FitHub-1.6.21-APK
```

7. Extract it to obtain `FitHub.apk`.

## 6. Install and test the approved Home design

1. Install `FitHub.apk` on the Android phone.
2. Open Home in the Ice Performance light theme and compare it with the approved design.
3. Confirm the Your Week card shows the correct dates, completed days, workout count, and active minutes.
4. Open **Journey**, **Nutrition**, **Supplements**, **Community Challenges**, and **Run Metrics** from their exact cards.
5. Confirm every icon, card, arrow, progress ring, spacing block, and rounded corner remains clear in light and dark themes.

## 7. Test the approved Food design

1. Open Food and check the header, date strip, diary illustration, progress line, four action cards, meal timeline, Water card, and bottom navigation.
2. Open **Search**, **Scan**, **Recent**, and **Saved Meals**.
3. Add one item to each meal and expand/collapse each meal card.
4. Add water and undo the latest water entry.
5. Confirm younger accounts still use the meal journal without numerical calorie/macro targets.

## 8. Test My Fitness Journey

1. Open Home → **Journey**.
2. Switch between Weekly report and Monthly report.
3. Tap Workouts, Training time, Recorded sets, and Cardio distance; confirm the trend changes.
4. Compare the current period with the previous period.
5. Confirm the dates and all values come only from that signed-in user's completed workouts.
6. Confirm adult accounts can see their private lift/PR highlights.
7. Confirm younger accounts see exercise and consistency highlights without load-based records.

## 9. Final checks

Test the raised Train button, every bottom navigation tab, Android Back, pull-to-refresh, text scaling, and the supported Android screen sizes in portrait mode. Keep the previous APK until the GitHub workflow and physical-device checks pass.
