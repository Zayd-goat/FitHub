# FitHub 1.6.25 Complete Step-by-Step Update Guide

Follow these steps in order.

## 1. Keep a backup

Keep the current FitHub source and working APK until the 1.6.25 APK passes testing on the Android phone.

## 2. Extract and confirm the release

Extract either the complete package or the small patch. Open `app.json` and confirm:

```text
Version: 1.6.25
Android versionCode: 35
iOS buildNumber: 35
Expo project ID: 3d3a3683-79bb-4711-ae01-1dab82cc21e7
Android package: com.fithub.app
```

## 3. Choose the correct upload

### Small patch

Use `FitHub_1.6.25_PATCH_FROM_1.6.24.zip` only when GitHub already contains the complete 1.6.24 source.

1. Extract the patch.
2. Open your FitHub GitHub repository.
3. Upload or replace every file from the patch, keeping each folder path exactly the same.
4. Include the hidden `.github` folder.

The patch contains the changed source, the new Home equipment assets, audits and release documents. You do not need to replace unrelated 1.6.24 files.

### Complete package

Use `FitHub_1.6.25_COMPLETE_UPDATE.zip` when the repository is older, incomplete or uncertain.

1. Extract the ZIP.
2. Replace the repository project files with the contents of `FitHub_1.6.25_COMPLETE_UPDATE`.
3. Include the hidden `.github` folder.
4. Do not upload `.expo` or `node_modules`.

For either method, never upload `.env`, `google-services.json`, access tokens, API keys, passwords, Android signing keys or private service-account files.

## 4. Leave Supabase unchanged

FitHub 1.6.25 is a mobile UI and asset release.

- Do not run `schema.sql`.
- Do not rerun an additive migration.
- Do not redeploy `nutrition-proxy` or `friend-notifications`.
- Do not change cron jobs, SMTP settings, FatSecret settings or Supabase secrets.

The existing Challenges and Clubs tables and functions are reused unchanged.

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
2. Open **Actions**.
3. Select **Build FitHub APK**.
4. Click **Run workflow**.
5. Select `main`.
6. Click **Run workflow** again.
7. Wait until every stage is green:

```text
Install dependencies
Type-check application
Audit local source references
Audit every exercise visual
Audit Home, Food and Community UI safeguards
Audit PNG asset integrity
Generate Android project
Build standalone release APK
Upload FitHub APK
```

8. Open the successful run.
9. Download `FitHub-1.6.25-APK` from **Artifacts**.
10. Extract it to obtain `FitHub.apk`.

## 7. Test every Home workout image

The Home layout itself should still match 1.6.24.

1. Confirm profile/greeting, bell, settings, Today’s Plan, Your Week, Quick Access, Friend Feed and the bottom navigation have not moved.
2. Confirm Push Day still uses the approved bench, rack, loaded barbell, shaker and towel scene.
3. Change or inspect the scheduled split and confirm each type has its own realistic equipment scene:

```text
Pull / Back
Legs / Lower Body
Upper Body
Full Body
Cardio
Shoulders
Arms
Core
Rest / Recovery
```

4. Confirm no anatomy figure appears in these Home plan cards.
5. Confirm every asset has a clean transparent background in light, dark and custom themes.
6. Confirm Start Workout, View Plan and Recovery Details still open the correct destination.

## 8. Test Challenges

1. From Home, select **Community Challenges**.
2. Confirm the page opens on **Challenges** and Back returns to Home.
3. Confirm the top summary shows Active, Invites and Completed.
4. Test the Explore, Active, Invites and Completed filters.
5. Create a challenge through all three steps: Details, Goal and Invite.
6. Confirm the title, optional description, target, duration, difficulty, visibility and invited friends are saved.
7. Confirm adult accounts can use all existing target types.
8. Confirm under-18 accounts remain limited to safe consistency targets and private/friends visibility.
9. Accept and decline an invitation.
10. Join an open challenge.
11. Complete a qualifying workout and pull to refresh.
12. Confirm the progress value, percentage, status and completion state update from workout history.

## 9. Test Clubs

1. Select the **Clubs** tab at the top of Community.
2. Confirm the page shows the user’s highest active milestone for each supported lift.
3. Confirm each card compares **Your Best** with the **Club Mark**.
4. Confirm active-member count and earned date appear.
5. Record or use an existing qualifying Bench Press, Back Squat, Conventional Deadlift or Overhead Press result.
6. Pull to refresh and confirm historical workout backfill still awards the correct highest club.
7. Confirm naming normalization and kg/lb display remain correct.
8. Confirm load-based Clubs are hidden for under-18 accounts.

## 10. Finish only after device verification

Keep the previous APK until:

- every GitHub Actions stage is green;
- all Home workout scenes render correctly;
- challenge creation, filters, invitations and progress pass;
- Club history, unit display and member counts pass;
- Back navigation, pull-to-refresh, narrow screens, larger text and all themes pass on the physical Android phone.
