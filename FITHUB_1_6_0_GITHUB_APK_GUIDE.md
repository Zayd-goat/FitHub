# GitHub upload, APK build and installation

## Upload
1. Extract the full-source ZIP and open the FitHub folder.
2. In the existing GitHub repository use Add file, Upload files.
3. Upload all project folders/files, including .github, src, assets, supabase, package.json,
   package-lock.json, app.json and tsconfig.json. Keep existing repository history.
4. Commit directly to main with message: FitHub 1.6.0.
5. In Settings, Secrets and variables, Actions, confirm repository secrets
   EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
6. Never add FatSecret secrets here; those belong only in Supabase Edge Function secrets.

## Build APK
1. Open Actions, Build FitHub APK, Run workflow, main, Run workflow.
2. The workflow installs from package-lock, type-checks, generates Android and builds a debug APK.
3. Open the successful run, scroll to Artifacts and download FitHub-APK.
4. Extract FitHub.apk. If no artifact appears, open the failed step before changing files.

## Install
1. Back up any local-only test data, then download the APK to the Android phone.
2. Allow installation from the browser/files app when Android asks.
3. Install over 1.5.0 when the package is com.fithub.app. Android versionCode 9 is newer than 1.5.0.
4. Sign in. Do not uninstall first unless the upgrade install fails, because uninstalling clears local cache.

## Test checklist
- Auth, onboarding/profile, saved and active workouts, editing, notification recovery and fullscreen.
- Android Back: detail to previous, non-Home tab to Home, Home Back exits.
- PR detection text, confetti, FitHub post and Android external share.
- Supplement custom reminder/time/toggle; split daily prompt; Journey; Clubs; six themes/accent/units/hiding.
- Adult nutrition diary meals, fibre, search, serving choice, favourites, copy, recipes, saved meals, water,
  history/reports and offline retry. Confirm under-18 accounts show neutral meal logging without targets.
- Camera permission and a real EAN/UPC barcode; manual fallback when no match.
- Activity permission, today steps, reopen/new-day behavior and sensor-unavailable message.
- Private group invite/accept and daily/weekly/monthly/custom leaderboard calculations.
- Multi-person gym invite, individual logs and publication blocked until every included person consents.
- A real FTMS machine: search, connect, exposed metrics, disconnect/reconnect and manual fallback.
- Confirm machine-reported calories never display as a FitHub estimate.

Physical sensor/Bluetooth behavior cannot be proven in an emulator; use at least one real Android device.
