# FitHub 1.6.10 — one-go update guide

Follow these steps in order. The files inside the update ZIP are the complete app source, not only a backup.

## 1. Keep a safe copy

1. Download both ZIP files supplied with this release.
2. Keep the full-source backup ZIP unchanged.
3. Extract `FitHub_1.6.10_COMPLETE_UPDATE.zip` to a new folder.
4. Open the extracted folder. You should see `App.tsx`, `package.json`, `src`, `assets`, `scripts`, and `supabase` directly. There is no extra `FitHub` folder to enter.

## 2. Upload the complete update to GitHub manually

Open your FitHub repository on GitHub and switch to the `main` branch.

### Normal files and folders

1. Click **Add file → Upload files**.
2. Drag the contents of the extracted update folder into the upload area. Upload the contents, not the enclosing update folder.
3. Include `assets`, `src`, `scripts`, `supabase`, `reports`, `App.tsx`, `app.json`, `package.json`, `package-lock.json`, `tsconfig.json`, and the Markdown guides.
4. Let GitHub replace files with the same names.
5. Commit with the message `FitHub 1.6.10 complete update`.

GitHub's browser uploader can ignore folders whose names start with a dot. Create these separately:

### Create `.github/workflows/build-apk.yml`

1. In the repository, click **Add file → Create new file**.
2. Enter `.github/workflows/build-apk.yml` as the filename. GitHub creates both hidden folders automatically.
3. Copy the entire contents of `.github/workflows/build-apk.yml` from the extracted update.
4. Commit the file.

### Create `.gitignore`

1. Click **Add file → Create new file**.
2. Enter `.gitignore`.
3. Copy the extracted `.gitignore` contents and commit.

### About `.env.example`

`.env.example` is optional documentation and may be created the same way. Never upload your real `.env` file. Never place FatSecret client secrets, USDA keys, Supabase service-role keys, or notification secrets in the Android source.

## 3. Confirm the important GitHub paths

The repository root must contain:

```text
.github/workflows/build-apk.yml
assets/train_v3/
reports/
scripts/audit-exercise-visuals.mjs
src/
supabase/
App.tsx
app.json
package.json
package-lock.json
```

Open `assets/train_v3` on GitHub and confirm that the male and female folders/files are present. Open `package.json` and confirm version `1.6.10`. Open `app.json` and confirm `versionCode` is `20`.

## 4. Add the two Android build secrets

In GitHub:

1. Open the repository.
2. Go to **Settings → Secrets and variables → Actions**.
3. Under **Repository secrets**, create:
   - `EXPO_PUBLIC_SUPABASE_URL` — your Supabase Project URL.
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the publishable/anon client key shown in Supabase API settings.
4. Do not use the service-role key.

FatSecret, USDA, and other provider secrets remain in **Supabase Edge Function secrets**, not GitHub and not the APK.

## 5. Supabase/database step

No new SQL is required for FitHub 1.6.10. Do not rerun older migrations and do not create duplicate tables. Keep your current database and already deployed nutrition/FatSecret functions unchanged.

If you previously configured the nutrition proxy, confirm its Edge Function secrets are still present in **Supabase Dashboard → Edge Functions → Secrets**. Do not paste them into app code.

## 6. Run the APK build

1. Open the repository's **Actions** tab.
2. Select **Build FitHub APK** on the left.
3. Click **Run workflow**.
4. Choose branch `main` and click the green **Run workflow** button.
5. Open the new run and wait for `android-apk` to turn green.

The workflow automatically installs dependencies, type-checks the app, audits every exercise visual mapping, creates the Android project, builds the release APK, and uploads it as an artifact.

If the exercise audit fails, open that step and fix the exact filename it reports. Do not remove the audit.

## 7. Download and install the APK

1. Open the successful workflow run.
2. Scroll to **Artifacts**.
3. Click **FitHub-APK**.
4. Extract the downloaded ZIP.
5. Transfer `FitHub.apk` to the Android phone.
6. Open it on the phone and allow installation from that source if Android asks.

If Android says the app cannot be updated because the signing certificate differs, the old APK and new APK were signed with different keys. Back up any device-only data, uninstall the old build, and install the new one. Supabase-synced account data remains on the server; device-only queued data can be removed by uninstalling.

## 8. Required testing checklist

### Account and existing functionality

- Sign in, sign out, reopen the app, and confirm the profile loads.
- Open saved workouts, edit one, complete one, and view its workout history.
- Confirm Friends, challenges, Clubs, themes, feature hiding, notifications, cardio, PR graphs, Food history, and fullscreen behavior still open.

### Home

- Confirm the workout hero, weekly card, three compact metrics, quick access, and friend avatars render correctly.
- Confirm minor accounts do not receive calorie/energy-goal behavior.

### Train and exercise audit

- Test male and female profile selections.
- Confirm the muscle-group grid changes to the selected presentation.
- Open Chest, Back, Shoulders, Arms, Legs, Core, Full Body, and Cardio.
- Confirm every image fits inside its card without UI cropping.
- Spot-check incline/flat/decline presses, dumbbell/barbell/EZ-bar exercises, assisted pull-ups, shrugs, rows, cable directions, machines, swimming, and cardio equipment.
- Change themes and confirm cards/backgrounds change while muscle targets remain red.

### Workout creation

- Select exercises and tap **Preview workout**.
- Reorder exercises and return to editing.
- Start once from the preview and once with **Start now**.
- Leave the workout screen and confirm the floating active-workout bar remains available.
- Press Android Back and confirm it returns to the previous page without losing the active workout.

### Food and supplements

- Open Breakfast/Lunch/Dinner/Snacks, search through the existing server-side food proxy, add and remove an entry, and confirm totals update.
- Verify water tracking.
- Verify FatSecret/USDA secrets are never visible in the APK or GitHub.
- Test supplement Taken, reschedule +1 hour, reschedule +2 hours, and next-day normal reminder time.

## 9. Version result

- App version: `1.6.10`
- Android version code: `20`
- Required new SQL: none
- Required new Edge Function: none
