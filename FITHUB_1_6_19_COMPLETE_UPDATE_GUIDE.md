# FitHub 1.6.19 Complete Step-by-Step Update Guide

Follow the sections in order. This is a complete source snapshot.

## 1. Back up the existing project

1. Download a ZIP backup from the current GitHub repository.
2. Keep the repository itself; do not delete `.git`, branches, Actions history, repository settings, secrets, or variables.
3. Keep a copy of the working 1.6.18 project until 1.6.19 passes testing.

## 2. Extract and replace the source

1. Extract `FitHub_1.6.19_COMPLETE_UPDATE.zip`.
2. Confirm `.github`, `assets`, `reports`, `scripts`, `src`, `supabase`, `App.tsx`, `app.json`, `index.js`, `package.json`, and `package-lock.json` are directly inside the extracted folder.
3. In the existing repository, replace the matching source folders and root source/configuration files.
4. Keep the repository's hidden `.git` folder.
5. Do not create a doubled path such as `FitHub/FitHub/src`.
6. Do not upload `.env`, `node_modules`, `.expo`, generated native folders, APK/AAB files, a keystore, private Firebase JSON, or `google-services.json`.

## 3. Commit and push

Use GitHub Desktop for the large exercise-asset set. Use this commit message:

```text
FitHub 1.6.19 complete update
```

Push to `main`, then confirm `package.json` and `app.json` show `1.6.19`, Android `versionCode` is `29`, and `.github/workflows/build-apk.yml` uploads `FitHub-1.6.19-APK`.

## 4. Run the new Clubs migration once

1. Open **Supabase Dashboard → SQL Editor → New query**.
2. Open `supabase/UPDATE_2026_08_26_FITHUB_1_6_19_ADDITIVE.sql` on the computer.
3. Copy every SQL line, paste it into the editor, and click **Run** once.
4. Confirm there is no red error.

Run this after `UPDATE_2026_08_25_FITHUB_1_6_18_ADDITIVE.sql`. Do not rerun `schema.sql`.

This migration scans completed workout history, backfills reached milestones, and creates the highest current Club membership for each supported lift. A completed Bench Press at 100 kg should show the 100 kg Barbell Bench Press Club after the Community → Clubs page refreshes.

## 5. Deploy the immediate gym-invite worker

Open Command Prompt in the extracted project folder. Sign in if necessary:

```text
npx supabase login
```

Set one long private cron secret:

```text
npx supabase secrets set FRIEND_NOTIFICATION_CRON_SECRET=YOUR_LONG_RANDOM_VALUE --project-ref qduquvyrmaywssbzbist
```

Deploy the supplied unified worker:

```text
npx supabase functions deploy friend-notifications --project-ref qduquvyrmaywssbzbist --no-verify-jwt
```

`--no-verify-jwt` is required for the cron request. The function still validates either the private cron header or the signed-in sender itself. Never place the cron secret or service-role key in the app.

## 6. Fix the Cron 401 and duplicate-job setup

1. Open **Supabase Dashboard → Integrations → Cron → Jobs**.
2. Keep or create one active job that runs every minute: `* * * * *`.
3. Its POST URL must end with `/functions/v1/friend-notifications`.
4. Send these headers:

```text
Content-Type: application/json
x-cron-secret: THE_SAME_VALUE_SET_IN_SECTION_5
```

5. Use `{}` as the request body.
6. Run/test the job and confirm HTTP `200`, not `401`.
7. Only after the new unified job returns `200`, disable the older duplicate FitHub notification job so both jobs cannot send the same event.

The worker handles both friend-post/PR notifications and gym invites. It runs every minute only as retry protection; sending a gym invite also calls it immediately with the signed-in sender token.

## 7. Deploy the FatSecret update

Set the server-only client credentials. Keep the scope at `basic` unless FatSecret has enabled additional scopes for the application:

```text
npx supabase secrets set FATSECRET_CLIENT_ID=YOUR_CLIENT_ID FATSECRET_CLIENT_SECRET=YOUR_CLIENT_SECRET FATSECRET_SCOPES="basic" --project-ref qduquvyrmaywssbzbist
npx supabase functions deploy nutrition-proxy --project-ref qduquvyrmaywssbzbist
```

If the FatSecret account has approved extra access, set only the scopes it actually has, for example:

```text
FATSECRET_SCOPES="basic premier barcode localization"
```

The app requests 50 verified results at a time and offers **Load More** so the user can continue through provider result pages. Selecting a result loads its verified servings. Barcode lookup requires the provider's `barcode` scope. Localization parameters are sent only when the `localization` scope is enabled.

## 8. Keep confirmation/reset email setup

The existing 1.6.18 authentication setup is still required:

```text
fithub://auth-confirmed
fithub://reset-password
```

Keep Confirm Email enabled, the supplied confirmation/recovery templates installed, and a working Custom SMTP provider configured. You can test without owning a custom domain if the chosen SMTP provider gives you an approved sender address, but production sending rules depend on that provider. Do not put an SMTP password in GitHub or the APK.

See `FITHUB_1_6_18_EMAIL_AND_NOTIFICATION_SETUP.md` for the full existing setup.

## 9. Build the Android APK

1. Open the GitHub repository.
2. Select **Actions → Build FitHub APK → Run workflow** on `main`.
3. Wait for every step to be green, including dependency install, TypeScript, reference audit, exercise visual audit, Expo prebuild, and Gradle build.
4. Download the `FitHub-1.6.19-APK` artifact.
5. Extract it to obtain `FitHub.apk`.

Do not install an APK from a failed workflow.

## 10. Test Home, Community, Clubs, and Run Metrics

1. Open Home in light and dark themes.
2. Confirm the weekly card, quick-access icons, and friend activity render correctly.
3. Tap **Community Challenges** and confirm the Community page opens on **Challenges**.
4. Confirm **Challenges** and **Clubs** tabs appear at the top.
5. Confirm Friends has only Feed, Following, and Invites—no Challenges tab.
6. Open Clubs with an adult test account that has a completed 100 kg Bench Press record; pull to refresh and confirm the current 100 kg Club appears.
7. Tap **Run Metrics** and confirm all completed running workouts with distance and duration appear.
8. Confirm a 5 km/10 km/etc. best card appears only when that distance has actually been recorded.
9. Tap a best card and then its recorded workout.

## 11. Test exercise fixes

1. Select the male exercise artwork setting.
2. Open Core and confirm Bicycle Crunch appears once.
3. Confirm Bicycle Crunch, Bird Dog, and Crunch do not ask for load/weight.
4. Confirm Cable Crunch still supports sets, reps, and weight.
5. Confirm Cable Crunch shows the new adult male kneeling cable visual in the male section.

## 12. Test FatSecret with an adult test account

1. Open Food → Search.
2. Search a broad food or brand name.
3. Confirm up to 50 verified results appear.
4. Tap **Load More Results** and confirm new results append without duplicates.
5. Open a result, choose a serving, change the serving count, and add it.
6. If the FatSecret application has barcode scope, scan an EAN/UPC food barcode and confirm details open.
7. Confirm an under-18 test account retains its meal journal without numerical calorie/macro tools or online provider search.

## 13. Test immediate gym-invite delivery with two accounts

1. Install 1.6.19 on two devices and allow notifications on both.
2. Sign in as Account A and Account B; add them as friends.
3. Put Account B in the background.
4. From Account A, send a gym invite for more than 30 minutes in the future.
5. Confirm Account B receives the new invite notification within seconds and can see it immediately in FitHub's notification center.
6. Accept from the push action or in-app notification center.
7. Confirm the session appears as accepted for both accounts.
8. Confirm the separate local reminder is scheduled for 30 minutes before the accepted session.
9. Check Supabase Logs: the immediate function request and the cron retry job should return HTTP 200.

If immediate push is absent but the in-app invite appears, confirm Account B granted notification permission, has a current row in `push_tokens`, the Expo/Firebase FCM V1 credentials match `com.fithub.app`, and the deployed worker is the 1.6.19 file.

## 14. Optional local checks

With dependencies installed:

```text
npm ci
npm run typecheck
npm run audit:references
npm run audit:exercise-visuals
```

Do not upload `node_modules` after testing.
