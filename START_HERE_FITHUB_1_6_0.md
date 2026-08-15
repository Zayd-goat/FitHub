# FitHub 1.6.0 — one-go update

This package upgrades the current FitHub 1.5.0 project to 1.6.0. The previously run
UPDATE_2026_08_14_FITHUB_1_5_0.sql is the database baseline. Do not run schema.sql and do not
run the 1.5.0 migration again.

## A. Supabase database
1. Open Supabase Dashboard and select FitHub.
2. Open SQL Editor, then New query.
3. Open FitHub/supabase/UPDATE_2026_08_14_FITHUB_1_6_0_ADDITIVE.sql from this package.
4. Copy the entire file into SQL Editor and press Run once.
5. Confirm the result says Success. Stop if it reports an error and keep the complete error text.

## B. FatSecret nutrition proxy
1. Create a FatSecret Platform developer application and obtain its Client ID and Client Secret.
2. Install the Supabase CLI on the computer.
3. Open a terminal inside the FitHub project and run:

       supabase login
       supabase link --project-ref YOUR_SUPABASE_PROJECT_REFERENCE
       supabase secrets set FATSECRET_CLIENT_ID=YOUR_ID FATSECRET_CLIENT_SECRET=YOUR_SECRET
       supabase functions deploy nutrition-proxy

4. Never add those two credentials to GitHub, app.json, .env or any EXPO_PUBLIC variable.
5. If the FatSecret account does not include localization, remove region/language in
   src/lib/nutritionApi.ts until the account has localization access.

## C. Replace the GitHub source
1. Extract this ZIP on the computer.
2. Open the FitHub folder inside it.
3. Open the existing FitHub GitHub repository and select the main branch.
4. Choose Add file, Upload files.
5. Drag everything inside the extracted FitHub folder onto GitHub. Include .github, src, assets,
   supabase, package.json, package-lock.json, app.json and tsconfig.json.
6. Commit directly to main with: Update FitHub to 1.6.0.
7. Confirm .github/workflows/build-apk.yml and package-lock.json are visible in GitHub.

## D. GitHub secrets
1. Open repository Settings, Secrets and variables, Actions.
2. Confirm EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY exist.
3. Obtain both public values from Supabase Project Settings, API if they are missing.
4. Never use the service-role key and never put FatSecret credentials here.

## E. Build one APK
1. Open GitHub Actions, then Build FitHub APK.
2. Open the run triggered by the main-branch upload. If none started, choose Run workflow on main.
3. Wait for the green check.
4. Open the completed run, scroll to Artifacts, download FitHub-APK and extract FitHub.apk.
5. If the workflow fails, open the first red step and copy its complete log before changing files.

## F. Install
1. Keep FitHub 1.5.0 installed.
2. Transfer FitHub.apk to the Android phone and open it.
3. Allow installation from the Files/browser app when Android asks.
4. Install over the existing app. The package remains com.fithub.app and versionCode is now 9.
5. Do not uninstall first unless Android refuses the upgrade; uninstalling clears local-only cache.

## G. Test in order
1. Existing sign-in, profile, onboarding, saved workouts, editing, history and Friends feed.
2. Active workout persistence and notification recovery.
3. PR improvement wording, confetti, internal post and Android share sheet.
4. Supplements, split planner/daily prompt, Journey, Clubs, challenges, themes, accents and hiding.
5. Adult nutrition diary meal categories, verified search, barcode/manual fallback, fibre, favourites,
   saved meals, recipes, copying, water, history and reports.
6. Under-18 account: neutral meal journal only; no calorie/macro targets or restrictive achievements.
7. Steps permission, today total, reopen, history and sensor-unavailable message.
8. Private step-group invitation and leaderboard.
9. Shared gym invitation, each participant's workout and publication blocked until everyone consents.
10. FTMS machine search/connect/disconnect and manual fallback. Confirm machine calories are labelled
    separately from FitHub estimates.
11. Android Back: deeper page to previous/main, non-Home tab to Home, Home Back exits.

Pedometer, camera and FTMS behavior must be tested on a real Android device. An emulator cannot
validate the physical sensors or a particular gym machine's exposed FTMS characteristics.
